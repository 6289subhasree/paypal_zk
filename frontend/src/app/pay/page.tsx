"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Badge, ErrorNote, PageTitle, Spinner } from "@/components/ui";
import { api, type PaymentRequest } from "@/lib/api";

type HistoryItem = PaymentRequest & { role: "payer" | "recipient" };

function Pay() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<HistoryItem[]>([]);

  useEffect(() => {
    api<HistoryItem[]>("/api/payments/history").then(setMine).catch(() => {});
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const pr = await api<PaymentRequest>("/api/payments/requests", {
        method: "POST",
        json: {
          amount: String(f.get("amount")),
          currency: "USD",
          description: String(f.get("description") ?? ""),
          min_age: f.get("adults_only") ? 18 : 0,
        },
      });
      router.push(`/pay/${pr.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  function open(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = String(new FormData(e.currentTarget).get("ref") ?? "").trim();
    const id = raw.split("/").filter(Boolean).pop();
    if (id) router.push(`/pay/${id}`);
  }

  return (
    <>
      <PageTitle
        title="Pay with proof"
        lead="A recipient creates a payment request. The payer proves they hold a valid Passport for that exact request, and only then does PayPal Sandbox checkout open."
      />
      <ErrorNote>{error}</ErrorNote>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <form onSubmit={create} className="panel space-y-4 p-6">
          <h2 className="text-[28px]">Request a payment</h2>
          <p className="text-[15px] text-ink-soft">Use the merchant account, then share the link with the payer.</p>
          <label className="block">
            <span className="label">Amount (USD)</span>
            <input name="amount" type="number" min="0.01" max="10000" step="0.01" defaultValue="10.00" required className="field" />
          </label>
          <label className="block">
            <span className="label">What it&apos;s for</span>
            <input name="description" maxLength={200} defaultValue="Design work, invoice #42" className="field" />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-paper-deep px-4 py-3">
            <input type="checkbox" name="adults_only" className="switch mt-0.5" />
            <span>
              <span className="block font-medium">Buyer must be 18 or older</span>
              <span className="block text-sm text-ink-soft">The payer&apos;s proof also shows they&apos;re 18+, checked inside the circuit. Their date of birth is never revealed.</span>
            </span>
          </label>
          <button className="btn btn-accent" disabled={busy}>{busy ? <Spinner label="Creating" /> : "Create payment request"}</button>
        </form>

        <form onSubmit={open} className="panel space-y-4 p-6">
          <h2 className="text-[28px]">Pay a request</h2>
          <p className="text-[15px] text-ink-soft">Paste the link or request ID you received.</p>
          <label className="block">
            <span className="label">Payment link or ID</span>
            <input name="ref" required className="field" placeholder="http://localhost:3000/pay/…" />
          </label>
          <button className="btn btn-quiet">Open request</button>
        </form>
      </div>

      {mine.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-[28px]">Your requests and payments</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {mine.map((r) => (
              <li key={r.id}>
                <Link href={`/pay/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-paper-deep">
                  <span>
                    <span className="font-medium">{r.currency} {r.amount}</span>
                    <span className="ml-2 text-ink-soft">{r.description || "No description"}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-ink-soft">{r.role === "recipient" ? "You requested" : "You paid"}</span>
                    <Badge tone={r.status === "paid" ? "ok" : r.status === "expired" || r.status === "refunded" ? "bad" : r.status === "authorized" ? "sandbox" : "neutral"}>{r.status.toUpperCase()}</Badge>
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
      <Pay />
    </Shell>
  );
}
