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
      ? { href: "/verify", label: "Continue verification", text: "Your verification session is still open." }
      : kyc.status === "needs_review"
        ? { href: "/verify", label: "View submission", text: "A reviewer is checking your session. You can issue your Passport once it's approved." }
        : kyc.status === "rejected"
          ? { href: "/verify", label: "Start a new session", text: "Your last session was rejected. Review the failed checks and try again." }
          : !active
            ? { href: "/passport", label: "Issue your Passport", text: "You're approved. Issue a credential bound to this browser." }
            : { href: "/pay", label: "Make or request a payment", text: "Your Passport is active. Prove eligibility to unlock checkout." };

  const kycTone = kyc?.status === "approved" ? "ok" : kyc?.status === "rejected" ? "bad" : "neutral";

  return (
    <>
      <PageTitle title={`Hello, ${user?.display_name}`} lead={next.text} />
      <Link href={next.href} className="btn btn-accent">{next.label}</Link>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Verification</h2>
          <p className="mt-2">
            {kyc === undefined ? "…" : <Badge tone={kycTone}>{kyc ? kyc.status.replace("_", " ") : "not started"}</Badge>}
          </p>
        </section>
        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Passport</h2>
          <p className="mt-2">
            <Badge tone={active ? "ok" : "neutral"}>{active ? "active" : "not issued"}</Badge>
          </p>
          {active && <p className="mt-2 text-sm text-ink-soft">Expires {new Date(active.expires_at).toLocaleDateString()}</p>}
        </section>
        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Recent payments</h2>
          {history.length === 0 ? (
            <p className="mt-2 text-ink-soft">No payments yet.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {history.slice(0, 3).map((h) => (
                <li key={h.id} className="flex justify-between gap-2">
                  <Link href={`/pay/${h.id}`} className="underline">{h.currency} {h.amount}</Link>
                  <span className="text-ink-soft">{h.status}</span>
                </li>
              ))}
            </ul>
          )}
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
