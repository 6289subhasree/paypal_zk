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
                <h2 className="text-2xl font-bold">Issue your Passport</h2>
                <p className="text-ink-soft">
                  Your browser creates a random holder secret and sends only its Poseidon hash. The issuer signs that
                  hash together with your KYC claim and an expiry date.
                </p>
                <button className="btn" onClick={issue} disabled={busy}>
                  {busy ? <Spinner label="Issuing" /> : "Issue Passport"}
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold">Not issued yet</h2>
                <p className="text-ink-soft">A Passport can only be issued after a reviewer approves your verification.</p>
                <Link href="/verify" className="btn">Go to verification</Link>
              </>
            )
          ) : (
            <>
              <h2 className="text-2xl font-bold">Ready to prove</h2>
              <p className="text-ink-soft">
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
                <Link href="/pay" className="btn">Use it for a payment</Link>
                {!hasSecret && approved && (
                  <button className="btn btn-quiet" onClick={issue} disabled={busy}>Reissue for this browser</button>
                )}
              </div>
              <details className="rounded-2xl bg-paper-deep p-4">
                <summary className="cursor-pointer font-semibold">What the circuit checks</summary>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-ink-soft">
                  <li>The issuer&apos;s EdDSA signature over the credential (Poseidon hash).</li>
                  <li>You know the secret behind the credential&apos;s holder commitment.</li>
                  <li>The credential says <code>kyc_approved = 1</code>.</li>
                  <li>The expiry date is later than the verifier&apos;s current time.</li>
                  <li>It outputs a one-time nullifier for this payment and a revocation tag scoped to this verifier.</li>
                </ul>
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
