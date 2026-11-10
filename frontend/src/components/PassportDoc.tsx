"use client";
import type { Credential } from "@/lib/api";
import { short } from "@/lib/zk";

/**
 * The ZK Passport as an authentic cryptographic security credential.
 * The upper section represents the private holder credential;
 * the machine-readable monospace strip at the bottom is all a verifier receives.
 */
export function PassportDoc({
  holderName,
  credential,
  signals,
  stamp,
}: {
  holderName: string;
  credential: Credential | null;
  signals?: { nullifier?: string; revocation_tag?: string; payment_challenge?: string };
  stamp?: React.ReactNode;
}) {
  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const status = credential?.status ?? "not issued";

  return (
    <figure className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[22px] border border-neutral-700/60 bg-gradient-to-br from-[#001c64] via-[#00144d] to-[#0a0f24] shadow-[0_24px_50px_-20px_rgba(0,24,242,0.45)] text-white">
      {/* Guilloche SVG Pattern Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: "radial-gradient(circle at 50% 50%, rgba(169, 213, 245, 0.25) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
        aria-hidden
      />

      {/* Subtle iridescent glow on top right */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-[#a9d5f5]/30 to-[#0018f2]/20 blur-3xl" />

      <div className="relative p-6 sm:p-7">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#a9d5f5] text-[#0018f2] shadow-xs">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2.5a1 1 0 0 1-.3.7L7.4 12.5a1 1 0 0 1-1.4 0L2.3 8.8A1 1 0 0 1 2 8.1V3z" />
              </svg>
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-white sm:text-xl">
                ZK Passport
              </span>
              <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-[#a9d5f5]">
                BabyJubJub EdDSA
              </span>
            </div>
          </div>
          <span className="font-mono text-xs text-white/50">{credential?.credential_type ?? "KycCredential"}</span>
        </div>

        {/* Credentials Grid */}
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-xs sm:text-sm">
          <Field label="Holder" value={holderName} isPrivate />
          <Field label="Issuer" value={credential?.issuer_id ?? "ZKPass-Issuer-Sandbox"} />
          <Field
            label="Claims"
            value={credential ? (credential.claims.can_prove_age ? "KYC approved, age 18+" : "KYC approved") : "—"}
          />
          <Field
            label="Status"
            value={status}
            tone={status === "active" ? "ok" : status === "not issued" ? undefined : "bad"}
          />
          <Field label="Issued" value={fmt(credential?.issued_at)} />
          <Field label="Expires" value={fmt(credential?.expires_at)} />
        </dl>

        <p className="mt-5 font-sans text-xs leading-relaxed text-white/60">
          Your identity details, photos, and secrets remain securely in this browser. The verifier only inspects the
          single-use zero-knowledge signals below.
        </p>
      </div>

      {/* Monospace Machine Readable Zone (MRZ) Strip */}
      <div className="relative border-t border-neutral-200/20 bg-white/95 px-6 py-3.5 font-mono text-[11px] leading-5 text-[#001c64] sm:text-[12.5px] sm:px-7">
        <span className="sr-only">Machine readable verification zone:</span>
        <div className="truncate tracking-wider font-semibold">
          P&lt;ZKPASS&lt;&lt;KYC&lt;APPROVED&lt;&lt;{credential ? "VALID" : "NONE"}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
        </div>
        <div className="truncate tracking-wider text-neutral-600">
          NUL {signals?.nullifier ? short(signals.nullifier, 8) : "········"} &lt; REV{" "}
          {signals?.revocation_tag ? short(signals.revocation_tag, 6) : "······"} &lt; PAY{" "}
          {signals?.payment_challenge ? short(signals.payment_challenge, 5) : "·····"}
        </div>
      </div>

      {/* Verification Stamp */}
      {stamp && <div className="pointer-events-none absolute bottom-9 right-4 sm:right-7">{stamp}</div>}
    </figure>
  );
}

function Field({
  label,
  value,
  isPrivate,
  tone,
}: {
  label: string;
  value: string;
  isPrivate?: boolean;
  tone?: "ok" | "bad";
}) {
  const color = tone === "ok" ? "text-[#7ee2a8]" : tone === "bad" ? "text-[#ff9b94]" : "text-white";
  return (
    <div>
      <dt className="flex items-center gap-1.5 font-sans text-xs text-white/50">
        <span>{label}</span>
        {isPrivate && (
          <span className="rounded bg-[#a9d5f5]/20 px-1 py-0.2 font-mono text-[9px] uppercase tracking-wider text-[#a9d5f5]">
            browser secret
          </span>
        )}
      </dt>
      <dd className={`mt-0.5 font-sans font-semibold truncate ${tone ? "capitalize" : ""} ${color}`}>
        {value}
      </dd>
    </div>
  );
}
