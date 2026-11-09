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
  { id: "other_payment", label: "Use a proof for another payment", hint: "A real proof, bound to a different payment challenge." },
  { id: "stale", label: "Send an old proof", hint: "A real proof stamped with a time from an hour ago." },
  { id: "replay", label: "Replay the accepted proof", hint: "Send the exact proof that already unlocked this payment." },
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

  useEffect(() => {
    if (!req || !user) return;
    api<(PaymentRequest & { transaction: Transaction | null })[]>("/api/payments/history")
      .then((h) => {
        const t = h.find((x) => x.id === req.id)?.transaction;
        if (t?.status === "COMPLETED") setTx(t as Transaction);
      })
      .catch(() => {});
  }, [req, user]);

  if (error && !req) return <ErrorNote>{error}</ErrorNote>;
  if (!req || !user) return <Spinner label="Loading payment request" />;

  const isRecipient = req.recipient.id === user.id;
  const secret = getHolderSecret(user.id);
  const canProve = !!cred?.proof_material && !!secret;
  const unlocked = req.status === "authorized" && req.payer_user_id === user.id;

  async function attempt(kind: Attempt) {
    if (!cred?.proof_material || !secret || !req) return;
    setBusy(kind === "valid" ? "Generating proof in your browser" : "Preparing the bad proof");
    setError("");
    setOutcome(null);
    setAttemptNo((n) => n + 1);
    try {
      let bundle: ProofBundle;
      if (kind === "replay") {
        if (!acceptedProof) throw new Error("Unlock the payment with a valid proof first, then try replaying it.");
        bundle = acceptedProof;
      } else if (kind === "other_payment") {
        const otherChallenge = BigInt("0x" + Array.from(crypto.getRandomValues(new Uint8Array(31)), (b) => b.toString(16).padStart(2, "0")).join("")).toString();
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
      setBusy("Verifying");
      const res = await api<{ authorized: boolean; code?: string; reason?: string; request?: PaymentRequest }>(
        `/api/payments/requests/${req.id}/authorize`,
        { method: "POST", json: { proof: bundle.proof, public_signals: bundle.public_signals } },
      );
      if (res.authorized) {
        setOutcome({ kind: "accepted", label: "Proof accepted" });
        setAcceptedProof(bundle);
        if (res.request) setReq(res.request);
      } else {
        setOutcome({ kind: "rejected", label: "Rejected", code: res.code ?? "", reason: res.reason ?? "" });
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-ink-soft">{isRecipient ? "You requested" : `${req.recipient.display_name} requests`}</p>
          <h1 className="font-display text-5xl font-extrabold">
            {req.currency} {req.amount}
          </h1>
          {req.description && <p className="mt-1 text-lg">{req.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={req.status === "paid" ? "ok" : req.status === "expired" ? "bad" : "neutral"}>{req.status}</Badge>
          {req.min_age > 0 && <Badge tone="neutral">{req.min_age}+ only</Badge>}
          <Badge tone="sandbox">PayPal Sandbox</Badge>
        </div>
      </header>

      {isRecipient ? (
        <RecipientView req={req} onRefresh={load} />
      ) : tx ? (
        <Receipt tx={tx} />
      ) : (
        <div className="grid items-start gap-10 xl:grid-cols-[1.1fr_1fr]">
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
                {cred ? "This browser doesn't hold your Passport's secret. Reissue it on the Passport page." : "You need an active Passport before you can pay."}
              </ErrorNote>
            ) : !unlocked ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold">Checkout is locked</h2>
                  <p className="mt-1 text-ink-soft">
                    {req.min_age > 0 && <>This merchant also needs proof that you&apos;re {req.min_age} or older. </>}
                    Prove you hold a valid, approved credential for this payment. The proof is generated here and
                    never includes your name, documents or credential ID.
                  </p>
                </div>
                <button className="btn" disabled={!!busy || req.status !== "open"} onClick={() => attempt("valid")}>
                  {busy ? <Spinner label={busy} /> : "Generate proof and unlock"}
                </button>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-bold">Checkout unlocked</h2>
                  <p className="mt-1 text-ink-soft">Your proof was verified for this payment. Pay with a PayPal Sandbox buyer account.</p>
                </div>
                <Checkout
                  req={req}
                  onCaptured={(t) => {
                    setTx(t);
                    setReq((r) => (r ? { ...r, status: "paid" } : r));
                  }}
                  onError={setError}
                />
              </>
            )}

            {outcome?.kind === "rejected" && (
              <p className="rounded-xl bg-reject-soft px-4 py-3 text-reject" role="alert">
                <strong>{outcome.code.replace("_", " ")}:</strong> {outcome.reason}{" "}
                {unlocked ? "Only the original proof authorized this payment." : "Checkout stays locked."}
              </p>
            )}

            {lastProof && (
              <details className="rounded-2xl bg-paper-deep p-4" open>
                <summary className="cursor-pointer font-semibold">
                  What the verifier received{lastProof.provingMs ? ` (proved in ${(lastProof.provingMs / 1000).toFixed(1)} s)` : ""}
                </summary>
                <dl className="mt-3 grid gap-1 font-mono text-[13px]">
                  {labelSignals(lastProof.public_signals).map((s) => (
                    <div key={s.name} className="flex justify-between gap-4">
                      <dt className="text-ink-soft">{s.name}</dt>
                      <dd className="truncate">{short(s.value, 10)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}

            {canProve && (
              <section className="rounded-2xl border border-dashed border-line p-4">
                <h3 className="font-display text-lg font-bold">Try to break it</h3>
                <p className="mb-3 text-sm text-ink-soft">Each of these sends a bad proof to the same verifier.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ATTEMPTS.map((a) => (
                    <button
                      key={a.id}
                      className="rounded-xl border border-line bg-surface px-3 py-2 text-left hover:bg-paper-deep disabled:opacity-45"
                      disabled={!!busy || (a.id === "replay" && !acceptedProof)}
                      onClick={() => attempt(a.id)}
                    >
                      <span className="block font-semibold">{a.label}</span>
                      <span className="block text-sm text-ink-soft">{a.hint}</span>
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

function RecipientView({ req, onRefresh }: { req: PaymentRequest; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/pay/${req.id}` : "";
  return (
    <section className="panel max-w-2xl space-y-4 p-6">
      <h2 className="text-2xl font-bold">Share this request</h2>
      <p className="text-ink-soft">Send the link to the payer. You&apos;ll receive the payment after their proof unlocks checkout.</p>
      <div className="flex flex-wrap gap-2">
        <input readOnly value={link} className="field font-mono text-sm" aria-label="Payment link" />
        <button className="btn" onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true))}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p>
        Status: <Badge tone={req.status === "paid" ? "ok" : "neutral"}>{req.status}</Badge>{" "}
        <button className="ml-2 underline" onClick={onRefresh}>Refresh</button>
      </p>
      <p className="text-sm text-ink-soft">Expires {new Date(req.expires_at).toLocaleTimeString()}.</p>
    </section>
  );
}

function Checkout({ req, onCaptured, onError }: { req: PaymentRequest; onCaptured: (t: Transaction) => void; onError: (m: string) => void }) {
  const [clientId, setClientId] = useState<string | null>(null);
  useEffect(() => {
    api<{ client_id: string }>("/api/paypal/config").then((c) => setClientId(c.client_id)).catch(() => setClientId(""));
  }, []);
  if (clientId === null) return <Spinner label="Loading PayPal" />;
  if (!clientId)
    return <ErrorNote>PayPal Sandbox isn&apos;t configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to backend/.env.</ErrorNote>;

  return (
    <PayPalScriptProvider options={{ clientId, currency: req.currency, intent: "capture" }}>
      <PayPalButtons
        style={{ layout: "vertical", shape: "pill", label: "pay" }}
        createOrder={async () => {
          const r = await api<{ order_id: string }>("/api/paypal/orders", { method: "POST", json: { payment_request_id: req.id } });
          return r.order_id;
        }}
        onCancel={() => onError("You closed the PayPal window before approving. Select the PayPal button to try again.")}
        onApprove={async (data) => {
          onError("");
          try {
            // The backend captures and validates; the browser callback alone proves nothing.
            const r = await api<{ transaction: Transaction }>(`/api/paypal/orders/${data.orderID}/capture`, { method: "POST" });
            onCaptured(r.transaction);
          } catch (e) {
            onError((e as Error).message);
          }
        }}
        onError={(err) => {
          console.error("PayPal checkout error:", err);
          onError(
            `PayPal checkout failed: ${String((err as { message?: string })?.message ?? err).slice(0, 200)}. ` +
              "Log in with a Sandbox personal (buyer) account. If that account is in India, create a United States one in the PayPal Developer dashboard.",
          );
        }}
      />
    </PayPalScriptProvider>
  );
}

function Receipt({ tx }: { tx: Transaction }) {
  return (
    <section className="panel max-w-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 bg-approve-soft px-6 py-4">
        <h2 className="text-2xl font-bold text-approve">Payment captured</h2>
        <Badge tone="sandbox">Sandbox test transaction</Badge>
      </div>
      <dl className="grid gap-3 px-6 py-5 sm:grid-cols-2">
        {[
          ["Amount", `${tx.currency} ${tx.amount}`],
          ["Status", tx.status],
          ["PayPal order ID", tx.provider_order_id],
          ["PayPal capture ID", tx.provider_capture_id ?? "—"],
          ["Captured", tx.captured_at ? new Date(tx.captured_at).toLocaleString() : "—"],
          ["Environment", tx.environment],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm text-ink-soft">{k}</dt>
            <dd className="break-all font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-line px-6 py-3 text-sm text-ink-soft">
        No real money moved. This is a PayPal Sandbox capture confirmed server-side by the ZK Pass backend.
      </p>
    </section>
  );
}
