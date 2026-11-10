"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Badge, ErrorNote, PageTitle, Spinner } from "@/components/ui";
import { api, type Payout } from "@/lib/api";

function payoutTone(status: Payout["status"]) {
  return status === "sent" ? "ok" : status === "failed" || status === "expired" ? "bad" : "neutral";
}

function Payouts() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<Payout[]>([]);

  useEffect(() => {
    api<Payout[]>("/api/payouts").then(setMine).catch(() => {});
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const p = await api<Payout>("/api/payouts", {
        method: "POST",
        json: {
          amount: String(f.get("amount")),
          currency: "USD",
          note: String(f.get("note") ?? ""),
          min_age: f.get("adults_only") ? 18 : 0,
        },
      });
      router.push(`/payouts/${p.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle
        title="Payouts"
        lead="Pay a freelancer or seller through PayPal Payouts. The money is only sent after they prove, with their ZK Passport, that they passed KYC."
      />
      <ErrorNote>{error}</ErrorNote>
      <form onSubmit={create} className="panel mt-4 max-w-xl space-y-4 p-6">
        <h2 className="text-[28px]">Send a payout</h2>
        <label className="block">
          <span className="label">Amount (USD)</span>
          <input name="amount" type="number" min="0.01" max="5000" step="0.01" defaultValue="25.00" required className="field" />
        </label>
        <label className="block">
          <span className="label">What it&apos;s for</span>
          <input name="note" maxLength={200} defaultValue="Logo design, milestone 1" className="field" />
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-paper-deep px-4 py-3">
          <input type="checkbox" name="adults_only" className="switch mt-0.5" />
          <span className="font-medium">Recipient must be 18 or older</span>
        </label>
        <button className="btn btn-accent" disabled={busy}>{busy ? <Spinner label="Creating" /> : "Create payout link"}</button>
      </form>

      {mine.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-[28px]">Your payouts</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {mine.map((p) => (
              <li key={p.id}>
                <Link href={`/payouts/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-paper-deep">
                  <span>
                    <span className="font-medium">{p.currency} {p.amount}</span>
                    <span className="ml-2 text-ink-soft">{p.note || "No note"}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-ink-soft">{p.role === "sender" ? "You sent" : "You received"}</span>
                    <Badge tone={payoutTone(p.status)}>{p.status.replace("_", " ")}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Shell>
      <Payouts />
    </Shell>
  );
}
