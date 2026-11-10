"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PassportDoc } from "@/components/PassportDoc";
import { Shell } from "@/components/Shell";
import { ErrorNote, PageTitle, Spinner } from "@/components/ui";
import { api, type Credential, type KycSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ensureHolderSecret, getHolderSecret, holderCommitment } from "@/lib/zk";

function Passport() {
  const { user } = useAuth();
  const [creds, setCreds] = useState<Credential[] | null>(null);
  const [kyc, setKyc] = useState<KycSession | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Credential[]>("/api/credentials/me").then(setCreds).catch((e) => setError(e.message));
    api<{ kyc: KycSession | null }>("/api/verification/status").then((r) => setKyc(r.kyc)).catch(() => {});
  }, []);

  const active = creds?.find((c) => c.status === "active") ?? null;

  const hasSecret = useMemo(() => {
    if (!user || !active?.proof_material) return false;
    const secret = getHolderSecret(user.id);
    return !!secret && holderCommitment(secret) === active.proof_material.holderCommitment;
  }, [user, active]);

  async function issue() {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const secret = ensureHolderSecret(user.id);
      const cred = await api<Credential>("/api/credentials/issue", {
        method: "POST",
        json: { holder_commitment: holderCommitment(secret) },
      });
      setCreds((cs) => [cred, ...(cs ?? []).map((c) => (c.status === "active" ? { ...c, status: "revoked" as const } : c))]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const approved = kyc?.status === "approved";

  return (
    <>
      <PageTitle
        title="Your ZK Passport"
        lead="A credential signed by the issuer and bound to a secret that only this browser holds. You use it to prove you passed KYC without sharing who you are."
      />
      <ErrorNote>{error}</ErrorNote>
      <div className="mt-4 grid items-start gap-10 xl:grid-cols-[1.1fr_1fr]">
        <PassportDoc holderName={user?.display_name ?? ""} credential={active} />

        <section className="space-y-5">
          {creds === null ? (
            <Spinner label="Loading credential" />
          ) : !active ? (
            approved ? (
              <>
                <h2 className="text-[30px]">Issue your Passport</h2>
                <p className="text-[15px] text-ink-soft">
                  Your browser creates a random holder secret and sends only its Poseidon hash. The issuer signs that
                  hash together with your KYC claim and an expiry date.
                </p>
                <button className="btn btn-accent" onClick={issue} disabled={busy}>
                  {busy ? <Spinner label="Issuing" /> : "Issue ZK Passport"}
                </button>
              </>
            ) : (
              <>
                <h2 className="text-[30px]">Not issued yet</h2>
                <p className="text-[15px] text-ink-soft">A Passport can only be issued after a reviewer approves your verification.</p>
                <Link href="/verify" className="btn">Go to verification</Link>
              </>
            )
          ) : (
            <>
              <h2 className="text-[30px]">Ready to prove</h2>
              <p className="text-[15px] text-ink-soft">
                For each payment, your browser generates a Groth16 proof that this credential is signed, approved,
                unexpired and yours, tied to that one payment request. The verifier receives the proof and the
                strip at the bottom of the passport, nothing else.
              </p>
              {!hasSecret && (
                <ErrorNote>
                  This browser doesn&apos;t hold the secret for your active Passport, so it can&apos;t make proofs here.
                  Issue a new Passport to use this browser; the old one will be revoked.
                </ErrorNote>
              )}
              <div className="flex flex-wrap gap-3">
                <Link href="/pay" className="btn btn-accent">Use it for a payment</Link>
                {!hasSecret && approved && (
                  <button className="btn btn-quiet" onClick={issue} disabled={busy}>Reissue for this browser</button>
                )}
              </div>
              <details className="group rounded-xl border border-line bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium">
                  What the circuit checks
                  <span className="text-ink-soft transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <div className="border-t border-line px-4 py-4 text-[14px]">
                  <ul className="list-disc space-y-1 pl-5 text-ink-soft marker:text-primary">
                    <li>The issuer&apos;s EdDSA signature (BabyJubJub) over the credential&apos;s Poseidon hash.</li>
                    <li>You know the secret behind the credential&apos;s holder commitment.</li>
                    <li>The credential says <code className="font-mono text-[12px]">kyc_approved = 1</code>.</li>
                    <li>The expiry date is later than the verifier&apos;s current time.</li>
                    <li>When the payment asks for it, the birth date is at least the minimum age before today.</li>
                  </ul>
                  <p className="mt-4 font-mono text-[11px] text-ink-soft">The 9 public signals a verifier receives</p>
                  <dl className="mt-2 grid gap-1.5 font-mono text-[12px]">
                    {[
                      ["nullifier", "one-time, per payment"],
                      ["revocation_tag", "scoped to this verifier"],
                      ["issuer_ax, issuer_ay", "issuer public key"],
                      ["now", "proof timestamp"],
                      ["payment_challenge", "binds the proof to one payment"],
                      ["verifier_id", "who may check it"],
                      ["today", "date for the age check"],
                      ["min_age", "0 or 18"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3 rounded-md bg-paper-deep px-2.5 py-1.5">
                        <dt>{k}</dt>
                        <dd className="text-right text-ink-soft">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </details>
            </>
          )}
        </section>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Shell>
      <Passport />
    </Shell>
  );
}
