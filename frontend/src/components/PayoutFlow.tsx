"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type Credential, type Payout } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getHolderSecret, labelSignals, provePayment, short, type ProofBundle } from "@/lib/zk";
import { PassportDoc } from "./PassportDoc";
import { Badge, ErrorNote, Spinner, Stamp } from "./ui";

function tone(status: Payout["status"]) {
  return status === "sent" ? "ok" : status === "failed" || status === "expired" ? "bad" : "neutral";
}

export function PayoutFlow({ payoutId }: { payoutId: string }) {
  const { user } = useAuth();
  const [payout, setPayout] = useState<Payout | null>(null);
  const [cred, setCred] = useState<Credential | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [rejection, setRejection] = useState<{ code: string; reason: string } | null>(null);
  const [proof, setProof] = useState<ProofBundle | null>(null);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    try {
      setPayout(await api<Payout>(`/api/payouts/${payoutId}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [payoutId]);

  useEffect(() => {
    api<Payout>(`/api/payouts/${payoutId}`).then(setPayout).catch((e) => setError(e.message));
    api<Credential[]>("/api/credentials/me").then((cs) => setCred(cs.find((c) => c.status === "active") ?? null)).catch(() => {});
  }, [payoutId]);

  if (error && !payout) return <ErrorNote>{error}</ErrorNote>;
  if (!payout || !user) {
    return (
      <div className="flex items-center gap-2 p-6 font-sans text-sm text-neutral-500">
        <Spinner label="Loading payout" />
      </div>
    );
  }

  const isSender = payout.sender.id === user.id;
  const secret = getHolderSecret(user.id);
  const canProve = !!cred?.proof_material && !!secret;

  async function claimPayout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!payout || !cred?.proof_material || !secret) return;
    const email = String(new FormData(e.currentTarget).get("email"));
    setError("");
    setRejection(null);
    setAttempt((n) => n + 1);
    setBusy("Generating proof in your browser (~2s)");
    try {
      const bundle = await provePayment({ secret, material: cred.proof_material, request: payout });
      setProof(bundle);
      setBusy("Verifying ZK proof & submitting PayPal Payout");
      const r = await api<{ released: boolean; code?: string; reason?: string; payout?: Payout }>(
        `/api/payouts/${payout.id}/claim`,
        { method: "POST", json: { proof: bundle.proof, public_signals: bundle.public_signals, paypal_email: email } }
      );
      if (r.released && r.payout) setPayout(r.payout);
      else setRejection({ code: r.code ?? "", reason: r.reason ?? "" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function refresh() {
    setBusy("Checking PayPal status");
    setError("");
    try {
      setPayout(await api<Payout>(`/api/payouts/${payoutId}/refresh`, { method: "POST" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  const signals = proof ? Object.fromEntries(labelSignals(proof.public_signals).map((s) => [s.name, s.value])) : undefined;
  const sent = payout.status === "sent";

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200/80 pb-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">
            {isSender ? "You're paying out" : `${payout.sender.display_name} is paying you`}
          </span>
          <h1 className="mt-1 font-serif text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            {payout.currency} {payout.amount}
          </h1>
          {payout.note && <p className="mt-1 font-sans text-sm text-neutral-600 sm:text-base">{payout.note}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone(payout.status)}>{payout.status.replace("_", " ")}</Badge>
          {payout.min_age > 0 && <Badge tone="neutral">{payout.min_age}+ only</Badge>}
          <Badge tone="sandbox">PayPal Sandbox Payouts</Badge>
        </div>
      </header>

      <ErrorNote>{error}</ErrorNote>

      {sent ? (
        <section className="rounded-2xl border border-neutral-200/80 bg-white shadow-xs max-w-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 bg-[#e6f4ec]/50 border-b border-[#a3e0be] px-6 py-4">
            <h2 className="font-serif text-2xl font-bold text-[#1a7f4b]">Payout Released</h2>
            <Badge tone="sandbox">PayPal Payouts API</Badge>
          </div>
          <dl className="grid gap-3 p-6 sm:grid-cols-2 text-xs font-sans">
            {[
              ["Amount", `${payout.currency} ${payout.amount}`],
              ["PayPal Payout Batch ID", payout.provider_batch_id ?? "—"],
              ["Item Processing Status", payout.provider_item_status ?? "—"],
              ["Receiver PayPal Email", payout.receiver_email ?? "—"],
              ["Timestamp", payout.sent_at ? new Date(payout.sent_at).toLocaleString() : "—"],
              ["Environment", payout.environment],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-[#FAFAFA] p-3 border border-neutral-200/60">
                <dt className="text-[11px] text-neutral-500 font-medium">{k}</dt>
                <dd className="break-all font-mono font-semibold text-neutral-900 mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 bg-[#FAFAFA] px-6 py-3.5 text-xs text-neutral-500 font-sans">
            <span>PayPal processes payouts asynchronously. Sandbox test transaction.</span>
            <button className="btn btn-quiet py-1 px-3 text-xs" onClick={refresh} disabled={!!busy}>
              {busy ? <Spinner label={busy} /> : "Refresh PayPal status"}
            </button>
          </div>
        </section>
      ) : isSender ? (
        <SenderView payout={payout} onRefresh={load} />
      ) : (
        <div className="grid items-start gap-8 xl:grid-cols-[1.1fr_1fr]">
          <PassportDoc
            holderName={user.display_name}
            credential={cred}
            signals={signals}
            stamp={rejection ? <Stamp key={attempt} kind="rejected">Rejected</Stamp> : null}
          />

          <section className="space-y-6">
            {payout.status === "expired" ? (
              <ErrorNote>This payout link has expired. Request a new link from the sender.</ErrorNote>
            ) : !canProve ? (
              <ErrorNote>
                {cred
                  ? "This browser does not hold your Passport's private secret. Reissue it on the Passport page."
                  : "You need an active Passport before you can claim this payout."}
              </ErrorNote>
            ) : (
              <form onSubmit={claimPayout} className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#0018f2] font-semibold">
                    Claim Payout
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0018f2]" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-neutral-900">Prove eligibility & claim</h2>
                <p className="font-sans text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  {payout.min_age > 0 && <>The sender also requires proof that you are {payout.min_age} or older. </>}
                  Your browser compiles a Groth16 zero-knowledge proof certifying you hold an unrevoked KYC Passport. The sender never views your personal identity documents.
                </p>

                <label className="block">
                  <span className="mb-1 block font-sans text-xs font-semibold text-neutral-700">
                    PayPal account email to receive funds
                  </span>
                  <input
                    name="email"
                    type="email"
                    required
                    className="field"
                    placeholder="sb-…@personal.example.com"
                    autoComplete="email"
                  />
                  <span className="mt-1 block font-sans text-[11px] text-neutral-500">
                    Enter your PayPal Sandbox personal account email.
                  </span>
                </label>

                <button
                  type="submit"
                  className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
                  disabled={!!busy}
                >
                  {busy ? <Spinner label={busy} /> : "Prove & receive payout"}
                </button>
              </form>
            )}

            {rejection && (
              <div className="rounded-xl border border-red-200 bg-[#fdecea] p-4 text-xs font-sans text-[#cf3a31] space-y-1" role="alert">
                <div className="font-bold uppercase font-mono">{rejection.code.replace("_", " ")}</div>
                <p>{rejection.reason}. Payout disbursement was blocked.</p>
              </div>
            )}

            {proof && (
              <details className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs" open>
                <summary className="cursor-pointer font-sans text-xs sm:text-sm font-semibold text-neutral-900">
                  What the sender&apos;s verifier received
                </summary>
                <dl className="mt-3 grid gap-1.5 font-mono text-[11px] sm:text-xs">
                  {labelSignals(proof.public_signals).map((s) => (
                    <div key={s.name} className="flex items-center justify-between gap-4 rounded bg-[#FAFAFA] px-2.5 py-1.5">
                      <dt className="text-neutral-500">{s.name}</dt>
                      <dd className="font-semibold text-neutral-800 truncate">{short(s.value, 12)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function SenderView({ payout, onRefresh }: { payout: Payout; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/payouts/${payout.id}` : "";
  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs max-w-2xl space-y-4">
      <h2 className="font-serif text-2xl font-bold text-neutral-900">Share this payout claim link</h2>
      <p className="font-sans text-xs sm:text-sm text-neutral-600">
        Send this link to the recipient. PayPal will only dispatch the funds after their ZK Passport cryptographic proof verifies.
      </p>
      <div className="flex flex-wrap gap-2">
        <input readOnly value={link} className="field font-mono text-xs flex-1" aria-label="Payout link" />
        <button
          className="btn btn-quiet"
          onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true))}
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>
      <div className="flex items-center gap-3 pt-2 text-xs font-sans text-neutral-600">
        <span>Status:</span>
        <Badge tone={tone(payout.status)}>{payout.status.replace("_", " ")}</Badge>
        <button className="text-[#0018f2] underline font-medium" onClick={onRefresh}>
          Refresh status
        </button>
      </div>
      <p className="font-sans text-[11px] text-neutral-400">
        Link valid until {new Date(payout.expires_at).toLocaleDateString()}.
      </p>
    </section>
  );
}
