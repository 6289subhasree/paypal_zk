"use client";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useCallback, useEffect, useState } from "react";
import { api, type Credential, type PaymentRequest, type Transaction } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getHolderSecret, labelSignals, provePayment, short, type ProofBundle } from "@/lib/zk";
import { PassportDoc } from "./PassportDoc";
import { Badge, ErrorNote, Spinner, Stamp } from "./ui";

type Outcome =
  | { kind: "accepted"; label: string }
  | { kind: "rejected"; label: string; code: string; reason: string };

type Attempt = "valid" | "tampered" | "other_payment" | "stale" | "replay";

const ATTEMPTS: { id: Exclude<Attempt, "valid">; label: string; hint: string }[] = [
  { id: "tampered", label: "Alter the proof", hint: "Flip one value in a valid proof before sending it." },
  { id: "other_payment", label: "Proof for other payment", hint: "A real proof bound to a different payment challenge." },
  { id: "stale", label: "Send an old proof", hint: "A real proof stamped with an expired timestamp." },
  { id: "replay", label: "Replay accepted proof", hint: "Replay the exact proof that already unlocked this order." },
];

export function PaymentFlow({ requestId }: { requestId: string }) {
  const { user } = useAuth();
  const [req, setReq] = useState<PaymentRequest | null>(null);
  const [cred, setCred] = useState<Credential | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [lastProof, setLastProof] = useState<ProofBundle | null>(null);
  const [acceptedProof, setAcceptedProof] = useState<ProofBundle | null>(null);
  const [tx, setTx] = useState<Transaction | null>(null);
  const [attemptNo, setAttemptNo] = useState(0);

  const load = useCallback(async () => {
    try {
      setReq(await api<PaymentRequest>(`/api/payments/requests/${requestId}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [requestId]);

  useEffect(() => {
    api<PaymentRequest>(`/api/payments/requests/${requestId}`).then(setReq).catch((e) => setError(e.message));
    api<Credential[]>("/api/credentials/me").then((cs) => setCred(cs.find((c) => c.status === "active") ?? null)).catch(() => {});
  }, [requestId]);

  const savedTx = req?.transaction?.status === "COMPLETED" ? req.transaction : null;
  const shownTx = tx ?? savedTx;

  if (error && !req) return <ErrorNote>{error}</ErrorNote>;
  if (!req || !user) {
    return (
      <div className="flex items-center gap-2 p-6 font-sans text-sm text-neutral-500">
        <Spinner label="Loading payment request" />
      </div>
    );
  }

  const isRecipient = req.recipient.id === user.id;
  const secret = getHolderSecret(user.id);
  const canProve = !!cred?.proof_material && !!secret;
  const unlocked = req.status === "authorized" && req.payer_user_id === user.id;

  async function attempt(kind: Attempt) {
    if (!cred?.proof_material || !secret || !req) return;
    setBusy(kind === "valid" ? "Generating proof in your browser (~2s)" : "Preparing simulated bad proof");
    setError("");
    setOutcome(null);
    setAttemptNo((n) => n + 1);
    try {
      let bundle: ProofBundle;
      if (kind === "replay") {
        if (!acceptedProof) throw new Error("Unlock the payment with a valid proof first, then test replaying it.");
        bundle = acceptedProof;
      } else if (kind === "other_payment") {
        const otherChallenge = BigInt(
          "0x" + Array.from(crypto.getRandomValues(new Uint8Array(31)), (b) => b.toString(16).padStart(2, "0")).join("")
        ).toString();
        bundle = await provePayment({ secret, material: cred.proof_material, request: { ...req, challenge: otherChallenge } });
      } else if (kind === "stale") {
        bundle = await provePayment({ secret, material: cred.proof_material, request: req, now: Math.floor(Date.now() / 1000) - 3600 });
      } else {
        bundle = await provePayment({ secret, material: cred.proof_material, request: req });
        if (kind === "tampered") {
          const pi_a = [...(bundle.proof.pi_a as string[])];
          pi_a[0] = (BigInt(pi_a[0]) + BigInt(1)).toString();
          bundle = { ...bundle, proof: { ...bundle.proof, pi_a } };
        }
      }
      setLastProof(bundle);
      setBusy("Verifying Groth16 cryptographic proof");
      const res = await api<{ authorized: boolean; code?: string; reason?: string; request?: PaymentRequest }>(
        `/api/payments/requests/${req.id}/authorize`,
        { method: "POST", json: { proof: bundle.proof, public_signals: bundle.public_signals } }
      );
      if (res.authorized) {
        setOutcome({ kind: "accepted", label: "Proof Accepted" });
        setAcceptedProof(bundle);
        if (res.request) setReq(res.request);
      } else {
        setOutcome({ kind: "rejected", label: "Proof Rejected", code: res.code ?? "", reason: res.reason ?? "" });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  const signals = lastProof ? Object.fromEntries(labelSignals(lastProof.public_signals).map((s) => [s.name, s.value])) : undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200/80 pb-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">
            {isRecipient ? "You requested" : `${req.recipient.display_name} requests`}
          </span>
          <h1 className="mt-1 font-serif text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            {req.currency} {req.amount}
          </h1>
          {req.description && <p className="mt-1 font-sans text-sm text-neutral-600 sm:text-base">{req.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={req.status === "paid" ? "ok" : req.status === "expired" ? "bad" : "neutral"}>
            {req.status}
          </Badge>
          {req.min_age > 0 && <Badge tone="neutral">{req.min_age}+ only</Badge>}
          <Badge tone="sandbox">PayPal Sandbox</Badge>
        </div>
      </header>

      {isRecipient ? (
        <RecipientView req={req} onRefresh={load} onRefunded={(t) => setReq({ ...req, status: "refunded", transaction: t })} />
      ) : shownTx ? (
        <Receipt tx={shownTx} />
      ) : (
        <div className="grid items-start gap-8 xl:grid-cols-[1.1fr_1fr]">
          <PassportDoc
            holderName={user.display_name}
            credential={cred}
            signals={signals}
            stamp={outcome ? <Stamp key={attemptNo} kind={outcome.kind}>{outcome.label}</Stamp> : null}
          />

          <section className="space-y-6">
            <ErrorNote>{error}</ErrorNote>

            {!canProve ? (
              <ErrorNote>
                {cred
                  ? "This browser does not hold your Passport's private secret. Reissue it on the Passport page."
                  : "You need an active Passport before you can generate proofs to pay."}
              </ErrorNote>
            ) : !unlocked ? (
              <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#0018f2] font-semibold">
                    Step 1 · ZK Proof Authorization
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0018f2]" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-neutral-900">Checkout is locked</h2>
                <p className="font-sans text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  {req.min_age > 0 && <>This recipient requires cryptographic verification that you are {req.min_age} or older. </>}
                  Generate a client-side Groth16 zero-knowledge proof binding your KYC approval to this exact payment challenge.
                  No personal identity data is shared.
                </p>
                <button
                  className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
                  disabled={!!busy || req.status !== "open"}
                  onClick={() => attempt("valid")}
                >
                  {busy ? <Spinner label={busy} /> : "Generate proof & unlock checkout"}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#1a7f4b] font-semibold">
                    Step 2 · PayPal Sandbox Checkout
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1a7f4b]" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-neutral-900">Checkout unlocked</h2>
                <p className="font-sans text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Your cryptographic proof was verified and recorded for this payment. Complete the transaction using a PayPal Sandbox buyer account.
                </p>
                <Checkout
                  req={req}
                  onCaptured={(t) => {
                    setTx(t);
                    setReq((r) => (r ? { ...r, status: "paid" } : r));
                  }}
                  onError={setError}
                />
              </div>
            )}

            {outcome?.kind === "rejected" && (
              <div className="rounded-xl border border-red-200 bg-[#fdecea] p-4 text-xs font-sans text-[#cf3a31] space-y-1" role="alert">
                <div className="font-bold uppercase font-mono">{outcome.code.replace("_", " ")}</div>
                <p>{outcome.reason}</p>
                <p className="text-[11px] text-neutral-600 pt-1">
                  {unlocked ? "Only the valid original proof authorized this payment." : "Checkout remains strictly locked."}
                </p>
              </div>
            )}

            {lastProof && (
              <details className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs" open>
                <summary className="cursor-pointer font-sans text-xs sm:text-sm font-semibold text-neutral-900">
                  What the verifier received {lastProof.provingMs ? `(proved in ${(lastProof.provingMs / 1000).toFixed(2)}s)` : ""}
                </summary>
                <dl className="mt-3 grid gap-1.5 font-mono text-[11px] sm:text-xs">
                  {labelSignals(lastProof.public_signals).map((s) => (
                    <div key={s.name} className="flex items-center justify-between gap-4 rounded bg-[#FAFAFA] px-2.5 py-1.5">
                      <dt className="text-neutral-500">{s.name}</dt>
                      <dd className="font-semibold text-neutral-800 truncate">{short(s.value, 12)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}

            {canProve && (
              <section className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-neutral-900">Security Test Suite: Try to break it</h3>
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-neutral-400">Tamper & Replay Checks</span>
                </div>
                <p className="font-sans text-xs text-neutral-500">
                  Each test dispatches an intentionally invalid cryptographic proof to demonstrate server-side verification resilience.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ATTEMPTS.map((a) => (
                    <button
                      key={a.id}
                      className="rounded-xl border border-neutral-200 bg-[#FAFAFA] p-3 text-left transition hover:border-[#0018f2] hover:bg-white disabled:opacity-40"
                      disabled={!!busy || (a.id === "replay" && !acceptedProof)}
                      onClick={() => attempt(a.id)}
                    >
                      <span className="block font-sans text-xs font-semibold text-neutral-900">{a.label}</span>
                      <span className="mt-0.5 block font-sans text-[11px] text-neutral-500 leading-tight">{a.hint}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function RecipientView({
  req,
  onRefresh,
  onRefunded,
}: {
  req: PaymentRequest;
  onRefresh: () => void;
  onRefunded: (t: Transaction) => void;
}) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/pay/${req.id}` : "";
  const tx = req.transaction;
  if (tx?.status === "COMPLETED") {
    return (
      <div className="max-w-2xl space-y-5">
        <Receipt tx={tx} />
        {!tx.refund_id && <RefundButton tx={tx} onRefunded={onRefunded} />}
      </div>
    );
  }
  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs max-w-2xl space-y-4">
      <h2 className="font-serif text-2xl font-bold text-neutral-900">Share this payment request</h2>
      <p className="font-sans text-xs sm:text-sm text-neutral-600">
        Send this link to the buyer. You will receive payment after their browser-generated zero-knowledge proof verifies and unlocks PayPal checkout.
      </p>
      <div className="flex flex-wrap gap-2">
        <input readOnly value={link} className="field font-mono text-xs flex-1" aria-label="Payment link" />
        <button
          className="btn btn-quiet"
          onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true))}
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>
      <div className="flex items-center gap-3 pt-2 text-xs font-sans text-neutral-600">
        <span>Status:</span>
        <Badge tone={req.status === "paid" ? "ok" : "neutral"}>{req.status}</Badge>
        <button className="text-[#0018f2] underline font-medium" onClick={onRefresh}>
          Refresh status
        </button>
      </div>
      <p className="font-sans text-[11px] text-neutral-400">Expires {new Date(req.expires_at).toLocaleTimeString()}.</p>
    </section>
  );
}

function Checkout({
  req,
  onCaptured,
  onError,
}: {
  req: PaymentRequest;
  onCaptured: (t: Transaction) => void;
  onError: (m: string) => void;
}) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<{ saved: boolean; payer_email: string | null } | null>(null);
  const [saveWallet, setSaveWallet] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api<{ client_id: string }>("/api/paypal/config").then((c) => setClientId(c.client_id)).catch(() => setClientId(""));
    api<{ saved: boolean; payer_email: string | null }>("/api/paypal/wallet").then(setWallet).catch(() => setWallet(null));
  }, []);

  if (clientId === null) return <Spinner label="Loading PayPal SDK" />;
  if (!clientId) {
    return (
      <ErrorNote>
        PayPal Sandbox is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to backend/.env.
      </ErrorNote>
    );
  }

  async function payWithSaved() {
    setPaying(true);
    onError("");
    try {
      const r = await api<{ transaction: Transaction }>("/api/paypal/orders/vaulted", {
        method: "POST",
        json: { payment_request_id: req.id },
      });
      onCaptured(r.transaction);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setPaying(false);
    }
  }

  async function forget() {
    setWallet(await api<{ saved: boolean; payer_email: string | null }>("/api/paypal/wallet", { method: "DELETE" }));
  }

  return (
    <div className="space-y-4 pt-2">
      {wallet?.saved && (
        <div className="rounded-xl border border-neutral-200 bg-[#FAFAFA] p-4 space-y-2">
          <button
            className="btn w-full justify-center bg-[#0018f2] text-white hover:bg-[#0014cc] py-2.5 font-semibold text-sm shadow-xs"
            onClick={payWithSaved}
            disabled={paying}
          >
            {paying ? <Spinner label="Processing Vault capture" /> : `Pay ${req.currency} ${req.amount} with saved PayPal Vault`}
          </button>
          <div className="flex items-center justify-between text-xs text-neutral-500 font-sans px-1">
            <span>Saved wallet: {wallet.payer_email ?? "Vaulted"}</span>
            <button className="text-[#0018f2] underline" onClick={forget}>
              Forget wallet
            </button>
          </div>
        </div>
      )}

      {!wallet?.saved && (
        <div className="rounded-xl border border-neutral-200 bg-[#FAFAFA] p-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#0018f2] focus:ring-[#0018f2]"
              checked={saveWallet}
              onChange={(e) => setSaveWallet(e.target.checked)}
            />
            <div>
              <span className="block font-sans text-xs font-semibold text-neutral-800">
                Save payment method to PayPal Vault
              </span>
              <span className="block font-sans text-[11px] text-neutral-500">
                Enables 1-click checkout for subsequent verified ZK payments without reopening the modal.
              </span>
            </div>
          </label>
        </div>
      )}

      <PayPalScriptProvider options={{ clientId, currency: req.currency, intent: "capture" }}>
        <PayPalButtons
          style={{ layout: "vertical", shape: "rect", label: "pay" }}
          forceReRender={[saveWallet]}
          createOrder={async () => {
            const r = await api<{ order_id: string }>("/api/paypal/orders", {
              method: "POST",
              json: { payment_request_id: req.id, save_wallet: saveWallet },
            });
            return r.order_id;
          }}
          onCancel={() => onError("Payment cancelled. You can select the PayPal button to try again.")}
          onApprove={async (data) => {
            onError("");
            try {
              const r = await api<{ transaction: Transaction }>(`/api/paypal/orders/${data.orderID}/capture`, { method: "POST" });
              onCaptured(r.transaction);
            } catch (e) {
              onError((e as Error).message);
            }
          }}
          onError={(err) => {
            console.error("PayPal checkout error:", err);
            onError(`PayPal Sandbox error: ${String((err as { message?: string })?.message ?? err).slice(0, 200)}`);
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}

function RefundButton({ tx, onRefunded }: { tx: Transaction; onRefunded: (t: Transaction) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refund() {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ transaction: Transaction }>(`/api/paypal/transactions/${tx.id}/refund`, { method: "POST" });
      onRefunded(r.transaction);
    } catch (e) {
      setError((e as Error).message);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <ErrorNote>{error}</ErrorNote>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
          <span className="font-sans text-xs text-neutral-700">
            Refund full {tx.currency} {tx.amount} to buyer through PayPal Sandbox?
          </span>
          <button className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] text-xs py-1.5" onClick={refund} disabled={busy}>
            {busy ? <Spinner label="Refunding" /> : "Confirm refund"}
          </button>
          <button className="btn btn-quiet text-xs py-1.5" onClick={() => setConfirming(false)} disabled={busy}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="btn btn-quiet text-xs" onClick={() => setConfirming(true)}>
          Issue refund in PayPal Sandbox
        </button>
      )}
    </div>
  );
}

function Receipt({ tx }: { tx: Transaction }) {
  const refunded = !!tx.refund_id;
  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white shadow-xs max-w-2xl overflow-hidden">
      <div className={`flex items-center justify-between gap-3 px-6 py-4 border-b ${refunded ? "bg-neutral-50 border-neutral-200" : "bg-[#e6f4ec]/50 border-[#a3e0be]"}`}>
        <h2 className={`font-serif text-2xl font-bold ${refunded ? "text-neutral-900" : "text-[#1a7f4b]"}`}>
          {refunded ? "Payment Refunded" : "Payment Captured"}
        </h2>
        <Badge tone="sandbox">PayPal Sandbox</Badge>
      </div>
      <dl className="grid gap-3 p-6 sm:grid-cols-2 text-xs font-sans">
        {[
          ["Amount", `${tx.currency} ${tx.amount}`],
          ["Status", tx.status],
          ["PayPal Order ID", tx.provider_order_id],
          ["PayPal Capture ID", tx.provider_capture_id ?? "—"],
          ["Captured Timestamp", tx.captured_at ? new Date(tx.captured_at).toLocaleString() : "—"],
          ["Environment", tx.environment],
          ...(refunded
            ? [
                ["PayPal Refund ID", tx.refund_id ?? "—"],
                ["Refund Status", tx.refund_status ?? "—"],
              ]
            : []),
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-[#FAFAFA] p-3 border border-neutral-200/60">
            <dt className="text-[11px] text-neutral-500 font-medium">{k}</dt>
            <dd className="break-all font-mono font-semibold text-neutral-900 mt-0.5">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-neutral-100 px-6 py-3 font-mono text-[11px] text-neutral-500 bg-[#FAFAFA]">
        Sandbox test transaction confirmed server-side by the ZK Pass verification gateway.
      </p>
    </section>
  );
}
