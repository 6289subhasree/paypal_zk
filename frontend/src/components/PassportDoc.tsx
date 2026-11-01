"use client";
import type { Credential } from "@/lib/api";
import { short } from "@/lib/zk";

/**
 * The ZK Passport drawn as a security-printed document page. The upper half is what
 * stays with the holder. The machine-readable strip is what a verifier receives.
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
    <figure className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_18px_50px_-30px_rgba(22,50,79,0.55)]">
      <div className="guilloche px-6 pb-6 pt-5 sm:px-8">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-display text-lg font-bold">ZK Passport</span>
          <span className="text-sm text-ink-soft">{credential?.credential_type ?? "KycApprovedCredential"}</span>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Holder" value={holderName} private />
          <Field label="Issuer" value={credential?.issuer_id ?? "—"} />
          <Field label="Claim" value={credential ? "KYC approved" : "—"} />
          <Field label="Status" value={status} tone={status === "active" ? "ok" : status === "not issued" ? undefined : "bad"} />
          <Field label="Issued" value={fmt(credential?.issued_at)} />
          <Field label="Expires" value={fmt(credential?.expires_at)} />
        </dl>
        <p className="mt-5 text-sm text-ink-soft">
          Your name, documents and credential ID stay in this browser. A verifier only ever sees the line below.
        </p>
      </div>

      <div className="border-t border-dashed border-line bg-paper-deep px-6 py-4 font-mono text-[13px] leading-6 sm:px-8">
        <span className="sr-only">What the verifier sees: </span>
        <div className="truncate">P&lt;ZKPASS&lt;&lt;KYC&lt;APPROVED&lt;&lt;{credential ? "VALID" : "NONE"}&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
        <div className="truncate">
          NUL {signals?.nullifier ? short(signals.nullifier, 8) : "········"} &lt; REV{" "}
          {signals?.revocation_tag ? short(signals.revocation_tag, 6) : "······"} &lt; PAY{" "}
          {signals?.payment_challenge ? short(signals.payment_challenge, 5) : "·····"}
        </div>
      </div>

      {stamp && <div className="pointer-events-none absolute right-6 top-20 sm:right-10">{stamp}</div>}
    </figure>
  );
}

function Field({ label, value, private: isPrivate, tone }: { label: string; value: string; private?: boolean; tone?: "ok" | "bad" }) {
  const color = tone === "ok" ? "text-approve" : tone === "bad" ? "text-reject" : "";
  return (
    <div>
      <dt className="text-sm text-ink-soft">
        {label}
        {isPrivate && <span className="ml-1.5 text-teal">(stays with you)</span>}
      </dt>
      <dd className={`font-semibold capitalize ${color}`}>{value}</dd>
    </div>
  );
}
