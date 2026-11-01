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
        json: { amount: String(f.get("amount")), currency: "USD", description: String(f.get("description") ?? "") },
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
          <h2 className="text-2xl font-bold">Request a payment</h2>
          <p className="text-ink-soft">Use the merchant account, then share the link with the payer.</p>
          <label className="block">
            <span className="mb-1 block font-medium">Amount (USD)</span>
            <input name="amount" type="number" min="0.01" max="10000" step="0.01" defaultValue="10.00" required className="field" />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">What it&apos;s for</span>
            <input name="description" maxLength={200} defaultValue="Design work, invoice #42" className="field" />
          </label>
          <button className="btn" disabled={busy}>{busy ? <Spinner label="Creating" /> : "Create payment request"}</button>
        </form>

        <form onSubmit={open} className="panel space-y-4 p-6">
          <h2 className="text-2xl font-bold">Pay a request</h2>
          <p className="text-ink-soft">Paste the link or request ID you received.</p>
          <label className="block">
            <span className="mb-1 block font-medium">Payment link or ID</span>
            <input name="ref" required className="field" placeholder="http://localhost:3000/pay/…" />
          </label>
          <button className="btn">Open request</button>
        </form>
      </div>

      {mine.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-2xl font-bold">Your requests and payments</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {mine.map((r) => (
              <li key={r.id}>
                <Link href={`/pay/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-paper-deep">
                  <span>
                    <span className="font-semibold">{r.currency} {r.amount}</span>
                    <span className="ml-2 text-ink-soft">{r.description || "No description"}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-ink-soft">{r.role === "recipient" ? "You requested" : "You paid"}</span>
                    <Badge tone={r.status === "paid" ? "ok" : r.status === "expired" ? "bad" : "neutral"}>{r.status}</Badge>
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
