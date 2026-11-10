"use client";
import type { Credential } from "@/lib/api";
import { short } from "@/lib/zk";
import { Logo } from "./Logo";

/**
 * The ZK Passport as a navy security card. The upper part is what stays with the holder;
 * the machine-readable strip at the bottom is all a verifier receives.
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
  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");
  const status = credential?.status ?? "not issued";

  return (
    <figure className="passport-card relative mx-auto w-full max-w-xl overflow-hidden rounded-[20px] shadow-[0_30px_60px_-35px_rgba(0,28,100,0.8)]">
      <div className="guilloche pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative px-6 pb-6 pt-5 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 font-serif text-[22px]">
            <Logo dark={false} className="h-4.5 w-4.5" />
            ZK Passport
          </span>
          <span className="font-mono text-[11px] text-white/60">{credential?.credential_type ?? "KycApprovedCredential"}</span>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Holder" value={holderName} private />
          <Field label="Issuer" value={credential?.issuer_id ?? "—"} />
          <Field label="Claims" value={credential ? (credential.claims.can_prove_age ? "KYC approved, age" : "KYC approved") : "—"} />
          <Field label="Status" value={status} tone={status === "active" ? "ok" : status === "not issued" ? undefined : "bad"} />
          <Field label="Issued" value={fmt(credential?.issued_at)} />
          <Field label="Expires" value={fmt(credential?.expires_at)} />
        </dl>
        <p className="mt-5 text-[13px] text-white/65">
          Your name, documents and credential ID stay in this browser. A verifier only ever sees the line below.
        </p>
      </div>

      <div className="relative bg-white/95 px-6 py-4 font-mono text-[13px] leading-6 text-navy-deep sm:px-8">
        <span className="sr-only">What the verifier sees: </span>
        <div className="truncate">P&lt;ZKPASS&lt;&lt;KYC&lt;APPROVED&lt;&lt;{credential ? "VALID" : "NONE"}&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
        <div className="truncate">
          NUL {signals?.nullifier ? short(signals.nullifier, 8) : "········"} &lt; REV{" "}
          {signals?.revocation_tag ? short(signals.revocation_tag, 6) : "······"} &lt; PAY{" "}
          {signals?.payment_challenge ? short(signals.payment_challenge, 5) : "·····"}
        </div>
      </div>

      {/* Stamped across the page break, like an entry stamp, so it never hides a field */}
      {stamp && <div className="pointer-events-none absolute bottom-10 right-4 sm:right-8">{stamp}</div>}
    </figure>
  );
}

function Field({ label, value, private: isPrivate, tone }: { label: string; value: string; private?: boolean; tone?: "ok" | "bad" }) {
  const color = tone === "ok" ? "text-[#7ee2a8]" : tone === "bad" ? "text-[#ff9b94]" : "text-white";
  return (
    <div>
      <dt className="font-mono text-[11px] text-white/55">
        {label}
        {isPrivate && <span className="ml-1.5 text-[#a9d5f5]">(stays in your browser)</span>}
      </dt>
      <dd className={`font-semibold ${tone ? "capitalize" : ""} ${color}`}>{value}</dd>
    </div>
  );
}
