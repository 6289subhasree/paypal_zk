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
    <div className="space-y-8">
      <PageTitle
        title="Pay with proof"
        highlight="Groth16"
        lead="A recipient creates a payment request. The buyer proves valid KYC and credentials for that exact payment challenge before PayPal Sandbox checkout unlocks."
      />

      <ErrorNote>{error}</ErrorNote>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Request Payment Card */}
        <form onSubmit={create} className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-7 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-[#0018f2] font-semibold">Merchant Action</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#0018f2]" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-neutral-900">Request a payment</h2>
          <p className="font-sans text-xs sm:text-sm text-neutral-500">
            Generate a payment challenge and share the link with the buyer.
          </p>

          <label className="block">
            <span className="mb-1 block font-sans text-xs font-semibold text-neutral-700">Amount (USD)</span>
            <input
              name="amount"
              type="number"
              min="0.01"
              max="10000"
              step="0.01"
              defaultValue="10.00"
              required
              className="field"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-sans text-xs font-semibold text-neutral-700">Description / Invoice</span>
            <input
              name="description"
              maxLength={200}
              defaultValue="Design work, invoice #42"
              className="field"
            />
          </label>

          <div className="rounded-xl border border-neutral-200 bg-[#FAFAFA] p-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="adults_only"
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#0018f2] focus:ring-[#0018f2]"
              />
              <div>
                <span className="block font-sans text-xs sm:text-sm font-semibold text-neutral-800">
                  Buyer must be 18 or older
                </span>
                <span className="block font-sans text-xs text-neutral-500 mt-0.5">
                  The buyer&apos;s ZK proof verifies age &ge; 18 without disclosing date of birth.
                </span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
            disabled={busy}
          >
            {busy ? <Spinner label="Generating request" /> : "Create payment request"}
          </button>
        </form>

        {/* Pay a Request Card */}
        <form onSubmit={open} className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-7 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-neutral-500 font-semibold">Payer Action</span>
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-neutral-900">Pay a request</h2>
          <p className="font-sans text-xs sm:text-sm text-neutral-500">
            Paste the payment link or challenge ID you received from the merchant.
          </p>

          <label className="block">
            <span className="mb-1 block font-sans text-xs font-semibold text-neutral-700">Payment link or ID</span>
            <input
              name="ref"
              required
              className="field font-mono text-xs"
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            />
          </label>

          <button type="submit" className="btn btn-quiet">
            Open payment request →
          </button>
        </form>
      </div>

      {mine.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-neutral-900 sm:text-2xl">Your Requests & Payments</h2>
            <span className="font-mono text-xs text-neutral-400">{mine.length} recorded</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xs">
            <ul className="divide-y divide-neutral-200/80">
              {mine.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/pay/${r.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-neutral-50"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#0018f2] text-sm sm:text-base">
                        {r.currency} {r.amount}
                      </span>
                      <span className="ml-3 font-sans text-xs sm:text-sm text-neutral-600">
                        {r.description || "No description"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-sans text-xs text-neutral-500">
                        {r.role === "recipient" ? "Requested" : "Paid"}
                      </span>
                      <Badge tone={r.status === "paid" ? "ok" : r.status === "expired" ? "bad" : "neutral"}>
                        {r.status}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Pay />
    </Shell>
  );
}
