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
      setCreds((cs) => [
        cred,
        ...(cs ?? []).map((c) => (c.status === "active" ? { ...c, status: "revoked" as const } : c)),
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const approved = kyc?.status === "approved";

  return (
    <div className="space-y-8">
      <PageTitle
        title="Your ZK Passport"
        highlight="credential"
        lead="An issuer-signed identity credential bound to a cryptographic secret held exclusively by your browser. Prove KYC approval and age without revealing who you are."
      />

      <ErrorNote>{error}</ErrorNote>

      <div className="grid items-start gap-8 xl:grid-cols-[1.1fr_1fr]">
        <PassportDoc holderName={user?.display_name ?? ""} credential={active} />

        <section className="space-y-6">
          {creds === null ? (
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
              <Spinner label="Loading cryptographic credential" />
            </div>
          ) : !active ? (
            approved ? (
              <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#0018f2] font-semibold">
                    Verification Complete
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1a7f4b]" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-[#111111]">Issue your ZK Passport</h2>
                <p className="font-sans text-sm leading-relaxed text-neutral-600">
                  Your browser generates a 248-bit secret, computes its Poseidon hash commitment, and requests an
                  issuer signature over the BabyJubJub curve. The secret never leaves your device.
                </p>
                <button
                  className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
                  onClick={issue}
                  disabled={busy}
                >
                  {busy ? <Spinner label="Generating keys & issuing" /> : "Issue ZK Passport"}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-amber-600 font-semibold">
                    KYC Required
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-[#111111]">Not issued yet</h2>
                <p className="font-sans text-sm leading-relaxed text-neutral-600">
                  A ZK Passport can only be issued after your verification session is confirmed by the AI checks and a reviewer.
                </p>
                <Link
                  href="/verify"
                  className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
                >
                  Go to verification →
                </Link>
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-7 space-y-5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-[#1a7f4b] font-semibold">
                  Credential Ready
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#1a7f4b]" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#111111]">Ready to prove per payment</h2>
              <p className="font-sans text-sm leading-relaxed text-neutral-600">
                For every transaction, your browser generates a Groth16 zero-knowledge proof using <code>snarkjs</code> in
                approx. 2 seconds. The verifier verifies the cryptographic proof without accessing your identity details.
              </p>

              {!hasSecret && (
                <ErrorNote>
                  This browser does not hold the private secret for this active Passport. Issue a new Passport to bind
                  it to this device; the old credential will be automatically revoked.
                </ErrorNote>
              )}

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/pay"
                  className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
                >
                  Authorize a payment →
                </Link>
                {!hasSecret && approved && (
                  <button
                    className="btn btn-quiet"
                    onClick={issue}
                    disabled={busy}
                  >
                    Reissue for this browser
                  </button>
                )}
              </div>

              {/* Monospace Circuit details card */}
              <div className="rounded-xl border border-neutral-200/80 bg-[#FAFAFA] p-4 text-xs font-sans text-neutral-700">
                <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  What the Circom Groth16 circuit verifies
                </div>
                <ul className="space-y-1.5 list-disc pl-4 text-neutral-600">
                  <li>Issuer EdDSA signature validity over BabyJubJub with Poseidon hash</li>
                  <li>Knowledge of holder secret matching public commitment</li>
                  <li>Confirmed KYC claim: <code>kyc_approved = 1</code></li>
                  <li>Expiry timestamp constraint: <code>expires_at &gt; current_time</code></li>
                  <li>Generates single-use payment nullifiers & verifier-scoped revocation tags</li>
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Passport />
    </Shell>
  );
}
