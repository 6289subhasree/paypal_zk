"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Badge, PageTitle } from "@/components/ui";
import { api, type Credential, type KycSession, type PaymentRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type HistoryItem = PaymentRequest & { role: "payer" | "recipient"; transaction: { status: string } | null };

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
    ? { href: "/verify", label: "Start verification", text: "Complete a one-time identity check with a test document." }
    : kyc.status === "started"
      ? { href: "/verify", label: "Continue verification", text: "Your verification session is currently open." }
      : kyc.status === "needs_review"
        ? { href: "/verify", label: "View submission", text: "A reviewer is checking your evidence summary. You can issue your Passport once approved." }
        : kyc.status === "rejected"
          ? { href: "/verify", label: "Start a new session", text: "Your last session was rejected. Review the failed checks and try again." }
          : !active
            ? { href: "/passport", label: "Issue your Passport", text: "You're approved. Issue a cryptographic credential bound to this browser." }
            : { href: "/pay", label: "Make or request a payment", text: "Your Passport is active and ready to generate zero-knowledge proofs." };

  const kycTone = kyc?.status === "approved" ? "ok" : kyc?.status === "rejected" ? "bad" : "neutral";

  return (
    <div className="space-y-8">
      {/* Editorial Title */}
      <PageTitle
        title={`Hello, ${user?.display_name ?? "there"}`}
        highlight="overview"
        lead="Manage your privacy-preserving credential, prove identity claims without revealing PII, and authorize PayPal Sandbox payments."
      />

      {/* Next Step Recommended Action Card */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-xs sm:p-7">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0018f2]">
                Recommended Next Step
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#0018f2]" />
            </div>
            <p className="font-sans text-sm text-neutral-600 sm:text-base">{next.text}</p>
          </div>
          <Link
            href={next.href}
            className="btn shrink-0 bg-[#0018f2] text-white shadow-xs hover:bg-[#0014cc]"
          >
            <span>{next.label}</span>
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {/* 3 Status Cards Grid */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Verification Card */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              01 · Identity Check
            </span>
            <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#0018f2]/10 text-[#0018f2]">
              ✓
            </div>
          </div>
          <h2 className="mt-3 font-serif text-xl font-bold text-[#111111]">ZK Verify AI</h2>
          <div className="mt-3">
            {kyc === undefined ? (
              <span className="font-sans text-xs text-neutral-400">Checking status…</span>
            ) : (
              <Badge tone={kycTone}>{kyc ? kyc.status.replace("_", " ") : "not started"}</Badge>
            )}
          </div>
          <p className="mt-3 font-sans text-xs text-neutral-500">
            Tesseract OCR on test cards, MediaPipe on-device liveness, and human reviewer approval.
          </p>
          <div className="mt-4 pt-3 border-t border-neutral-100">
            <Link href="/verify" className="font-sans text-xs font-semibold text-[#0018f2] hover:underline">
              {kyc?.status === "approved" ? "View KYC results →" : "Continue to verify →"}
            </Link>
          </div>
        </section>

        {/* Passport Card */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              02 · Cryptographic Card
            </span>
            <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#0018f2]/10 text-[#0018f2]">
              ⚿
            </div>
          </div>
          <h2 className="mt-3 font-serif text-xl font-bold text-[#111111]">ZK Passport</h2>
          <div className="mt-3">
            <Badge tone={active ? "ok" : "neutral"}>{active ? "active credential" : "not issued"}</Badge>
          </div>
          <p className="mt-3 font-sans text-xs text-neutral-500">
            {active
              ? `Expires ${new Date(active.expires_at).toLocaleDateString()}. Bound to local browser secret.`
              : "Issuer-signed credential bound to your browser-only Poseidon commitment."}
          </p>
          <div className="mt-4 pt-3 border-t border-neutral-100">
            <Link href="/passport" className="font-sans text-xs font-semibold text-[#0018f2] hover:underline">
              {active ? "Manage Passport & MRZ →" : "Issue Passport →"}
            </Link>
          </div>
        </section>

        {/* Recent Payments Card */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              03 · Proof Gate
            </span>
            <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#0018f2]/10 text-[#0018f2]">
              $
            </div>
          </div>
          <h2 className="mt-3 font-serif text-xl font-bold text-[#111111]">Recent Activity</h2>
          <div className="mt-3">
            {history.length === 0 ? (
              <p className="font-sans text-xs text-neutral-400">No transactions recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.slice(0, 3).map((h) => (
                  <li key={h.id} className="flex items-center justify-between text-xs">
                    <Link href={`/pay/${h.id}`} className="font-mono font-semibold text-[#0018f2] hover:underline">
                      {h.currency} {h.amount}
                    </Link>
                    <Badge tone={h.status === "paid" ? "ok" : "neutral"}>{h.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100">
            <Link href="/pay" className="font-sans text-xs font-semibold text-[#0018f2] hover:underline">
              Make or request payment →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Dashboard />
    </Shell>
  );
}
