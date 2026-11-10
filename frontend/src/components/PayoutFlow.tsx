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
  if (!payout || !user) return <Spinner label="Loading payout" />;

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
    setBusy("Compiling Groth16 witness and proof…");
    try {
      const bundle = await provePayment({ secret, material: cred.proof_material, request: payout });
      setProof(bundle);
      setBusy("Verifying and sending through PayPal");
      const r = await api<{ released: boolean; code?: string; reason?: string; payout?: Payout }>(
        `/api/payouts/${payout.id}/claim`,
        { method: "POST", json: { proof: bundle.proof, public_signals: bundle.public_signals, paypal_email: email } },
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
    setBusy("Checking PayPal");
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[12px] text-ink-soft">{isSender ? "You're paying out" : `${payout.sender.display_name} is paying you`}</p>
          <h1 className="font-sans text-[48px] font-semibold tracking-[-0.04em]">
            {payout.currency} {payout.amount}
          </h1>
          {payout.note && <p className="mt-1 text-lg">{payout.note}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={tone(payout.status)}>{payout.status.replace("_", " ")}</Badge>
          {payout.min_age > 0 && <Badge tone="neutral">{payout.min_age}+ only</Badge>}
          <Badge tone="sandbox">PayPal Sandbox Payouts</Badge>
        </div>
      </header>

      <ErrorNote>{error}</ErrorNote>

      {sent ? (
        <section className="panel max-w-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 bg-approve-soft px-6 py-4">
            <h2 className="text-2xl font-semibold text-approve">Payout sent</h2>
            <Badge tone="sandbox">Sandbox test payout</Badge>
          </div>
          <dl className="grid gap-3 px-6 py-5 sm:grid-cols-2">
            {[
              ["Amount", `${payout.currency} ${payout.amount}`],
              ["PayPal payout batch", payout.provider_batch_id ?? "—"],
              ["PayPal status", payout.provider_item_status ?? "—"],
              ["Sent to", payout.receiver_email ?? "—"],
              ["Sent", payout.sent_at ? new Date(payout.sent_at).toLocaleString() : "—"],
              ["Environment", payout.environment],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-[11px] text-ink-soft">{k}</dt>
                <dd className="break-all font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3 text-sm text-ink-soft">
            <span>PayPal processes payouts in the background. No real money moved.</span>
            <button className="btn btn-quiet py-1.5" onClick={refresh} disabled={!!busy}>
              {busy ? <Spinner label={busy} /> : "Check PayPal status"}
            </button>
          </div>
        </section>
      ) : isSender ? (
        <SenderView payout={payout} onRefresh={load} />
      ) : (
        <div className="grid items-start gap-10 xl:grid-cols-[1.1fr_1fr]">
          <PassportDoc
            holderName={user.display_name}
            credential={cred}
            signals={signals}
            stamp={rejection ? <Stamp key={attempt} kind="rejected">Rejected</Stamp> : null}
          />
          <section className="space-y-5">
            {payout.status === "expired" ? (
              <ErrorNote>This payout link has expired. Ask the sender for a new one.</ErrorNote>
            ) : !canProve ? (
              <ErrorNote>
                {cred
                  ? "This browser doesn't hold your Passport's secret. Reissue it on the Passport page."
                  : "You need an active Passport before you can receive this payout."}
              </ErrorNote>
            ) : (
              <form onSubmit={claimPayout} className="space-y-4">
                <div>
                  <h2 className="text-[28px]">Prove it&apos;s you, then get paid</h2>
                  <p className="mt-1 text-[15px] text-ink-soft">
                    {payout.min_age > 0 && <>The sender also needs proof that you&apos;re {payout.min_age} or older. </>}
                    Your browser proves you hold a valid, approved Passport for this payout. The sender never sees
                    your documents.
                  </p>
                </div>
                <label className="block">
                  <span className="label">PayPal email to receive the money</span>
                  <input
                    name="email"
                    type="email"
                    required
                    className="field"
                    placeholder="sb-…@personal.example.com"
                    autoComplete="email"
                  />
                  <span className="mt-1 block text-sm text-ink-soft">Use a PayPal Sandbox personal account&apos;s email.</span>
                </label>
                <button className="btn btn-accent" disabled={!!busy}>
                  {busy ? <Spinner label={busy} /> : "Prove and receive payout"}
                </button>
              </form>
            )}
            {rejection && (
              <p role="alert" className="rounded-lg border border-[#f3c9c5] bg-reject-soft px-4 py-3 text-[15px] text-reject">
                <strong className="font-mono text-[13px]">{rejection.code.replaceAll("_", " ")}:</strong> {rejection.reason} The payout wasn&apos;t sent.
              </p>
            )}
            {proof && (
              <details className="rounded-xl bg-charcoal p-4 text-white">
                <summary className="cursor-pointer text-[14px] font-medium">What the sender&apos;s verifier received</summary>
                <dl className="mt-3 grid gap-1 font-mono text-[12.5px]">
                  {labelSignals(proof.public_signals).map((s) => (
                    <div key={s.name} className="flex justify-between gap-4">
                      <dt className="text-white/50">{s.name}</dt>
                      <dd className="truncate">{short(s.value, 10)}</dd>
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
    <section className="panel max-w-2xl space-y-4 p-6">
      <h2 className="text-[28px]">Share this payout</h2>
      <p className="text-ink-soft">
        Send the link to the person you&apos;re paying. PayPal only sends the money after their Passport proof checks out.
      </p>
      <div className="flex flex-wrap gap-2">
        <input readOnly value={link} className="field font-mono text-sm" aria-label="Payout link" />
        <button className="btn" onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true))}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p>
        Status: <Badge tone={tone(payout.status)}>{payout.status.replace("_", " ")}</Badge>{" "}
        <button className="ml-2 underline" onClick={onRefresh}>Refresh</button>
      </p>
      <p className="text-sm text-ink-soft">Link expires {new Date(payout.expires_at).toLocaleDateString()}.</p>
    </section>
  );
}
