"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Shell } from "@/components/Shell";
import { Badge } from "@/components/ui";
import { api, type Credential, type KycSession, type PaymentRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type HistoryItem = PaymentRequest & { role: "payer" | "recipient"; transaction: { status: string } | null };

function Arrow() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
      <path d="M2 6h7.5M6.5 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function statusTone(s: string) {
  return s === "paid" ? "ok" : s === "expired" || s === "refunded" ? "bad" : s === "authorized" ? "sandbox" : "neutral";
}

function Dashboard() {
  const { user } = useAuth();
  const [kyc, setKyc] = useState<KycSession | null | undefined>(undefined);
  const [creds, setCreds] = useState<Credential[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    api<{ kyc: KycSession | null }>("/api/verification/status").then((r) => setKyc(r.kyc)).catch(() => setKyc(null));
    api<Credential[]>("/api/credentials/me").then(setCreds).catch(() => {});
    api<HistoryItem[]>("/api/payments/history").then(setHistory).catch(() => {});
  }, []);

  const active = creds.find((c) => c.status === "active");
  const next = !kyc
    ? { href: "/verify", label: "Verify your identity with AI-guided KYC", text: "A one-time check with a SPECIMEN test document." }
    : kyc.status === "started"
      ? { href: "/verify", label: "Continue your verification", text: "Your verification session is still open." }
      : kyc.status === "needs_review"
        ? { href: "/verify", label: "View your submission", text: "A reviewer is checking your session. You can issue your Passport once it's approved." }
        : kyc.status === "rejected"
          ? { href: "/verify", label: "Start a new verification", text: "Your last session was rejected. Review the failed checks and try again." }
          : !active
            ? { href: "/passport", label: "Issue your browser-bound Passport", text: "You're approved. Issue a credential that only this browser can use." }
            : { href: "/pay", label: "Pay with a zero-knowledge proof", text: "Your Passport is active. Prove eligibility to unlock checkout." };

  const kycTone = kyc?.status === "approved" ? "ok" : kyc?.status === "rejected" ? "bad" : "neutral";
  const liveness = kyc?.checks?.find((c) => c.name === "liveness");
  const method = !liveness ? null : liveness.on_device ? "On-device liveness" : liveness.simulated ? "Simulated liveness" : null;

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[40px] sm:text-[52px]">Welcome back, {user?.display_name}.</h1>
        <Link
          href={next.href}
          className="group mt-6 flex flex-col gap-3 rounded-xl bg-primary px-5 py-4 text-white transition-colors hover:bg-primary-deep sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            <span className="block font-mono text-[11px] text-white/70">Next step</span>
            <span className="mt-0.5 block font-serif text-[22px] leading-tight">{next.label}</span>
            <span className="mt-1 block text-[14px] text-white/80">{next.text}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-md bg-white px-3 py-1.5 text-[13px] font-semibold text-primary sm:self-auto">
            Continue <span className="transition-transform group-hover:translate-x-0.5"><Arrow /></span>
          </span>
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="panel flex flex-col p-5">
          <h2 className="font-mono text-[11px] tracking-normal text-ink-soft">KYC verification</h2>
          <p className="mt-3">
            {kyc === undefined ? "…" : <Badge tone={kycTone}>{kyc ? kyc.status.replace("_", " ") : "not started"}</Badge>}
          </p>
          <p className="mt-3 text-[14px] text-ink-soft">
            {kyc?.status === "approved"
              ? `Approved by a reviewer${method ? ` · ${method}` : ""}.`
              : kyc
                ? `${kyc.checks.filter((c) => c.passed).length} of ${kyc.checks.length} automated checks passed${method ? ` · ${method}` : ""}.`
                : "OCR, document checks, liveness and a human reviewer."}
          </p>
          <Link href="/verify" className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-medium text-primary hover:underline">
            Open verification <Arrow />
          </Link>
        </section>

        <section className="panel flex flex-col p-5">
          <h2 className="font-mono text-[11px] tracking-normal text-ink-soft">ZK Passport</h2>
          <div className="passport-card relative mt-3 overflow-hidden rounded-lg px-4 py-3">
            <div className="guilloche pointer-events-none absolute inset-0" aria-hidden />
            <div className="relative flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold"><Logo dark={false} className="h-3.5 w-3.5" /> ZK Passport</span>
              <span className={`text-[12px] font-medium ${active ? "text-[#7ee2a8]" : "text-white/60"}`}>{active ? "Active" : "Not issued"}</span>
            </div>
            <p className="relative mt-3 font-mono text-[10.5px] text-white/70">
              {active ? `Expires ${new Date(active.expires_at).toLocaleDateString()}` : "P<ZKPASS<<KYC<NONE<<<<<"}
            </p>
          </div>
          <Link href="/passport" className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-medium text-primary hover:underline">
            {active ? "View Passport" : "Issue Passport"} <Arrow />
          </Link>
        </section>

        <section className="panel flex flex-col p-5">
          <h2 className="font-mono text-[11px] tracking-normal text-ink-soft">Recent payments</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-[14px] text-ink-soft">No payments yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {history.slice(0, 3).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/pay/${h.id}`} className="font-medium hover:text-primary">{h.currency} {h.amount}</Link>
                  <Badge tone={statusTone(h.status)}>{h.status.toUpperCase()}</Badge>
                </li>
              ))}
            </ul>
          )}
          <Link href="/history" className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-medium text-primary hover:underline">
            All payments <Arrow />
          </Link>
        </section>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Shell>
      <Dashboard />
    </Shell>
  );
}
