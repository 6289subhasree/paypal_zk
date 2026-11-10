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
    <div className="space-y-8">
      <PageTitle
        title="Verified Payouts"
        highlight="PayPal Payouts"
        lead="Disburse funds to freelancers or partners using PayPal Payouts. Funds are only released after the recipient cryptographically proves KYC eligibility using their ZK Passport."
      />

      <ErrorNote>{error}</ErrorNote>

      <form
        onSubmit={create}
        className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-7 max-w-xl space-y-4"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-[#0018f2] font-semibold">
            Sender Authorization
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#0018f2]" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-neutral-900">Create a payout link</h2>

        <label className="block">
          <span className="mb-1 block font-sans text-xs font-semibold text-neutral-700">Amount (USD)</span>
          <input
            name="amount"
            type="number"
            min="0.01"
            max="5000"
            step="0.01"
            defaultValue="25.00"
            required
            className="field"
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-sans text-xs font-semibold text-neutral-700">Memo / Note</span>
          <input
            name="note"
            maxLength={200}
            defaultValue="Logo design, milestone 1"
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
                Recipient must be 18 or older
              </span>
              <span className="block font-sans text-xs text-neutral-500 mt-0.5">
                The claim proof checks age &ge; 18 without revealing their birthdate.
              </span>
            </div>
          </label>
        </div>

        <button
          type="submit"
          className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
          disabled={busy}
        >
          {busy ? <Spinner label="Creating payout" /> : "Generate payout link"}
        </button>
      </form>

      {mine.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-neutral-900 sm:text-2xl">Your Payout Records</h2>
            <span className="font-mono text-xs text-neutral-400">{mine.length} recorded</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xs">
            <ul className="divide-y divide-neutral-200/80">
              {mine.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/payouts/${p.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-neutral-50"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#0018f2] text-sm sm:text-base">
                        {p.currency} {p.amount}
                      </span>
                      <span className="ml-3 font-sans text-xs sm:text-sm text-neutral-600">
                        {p.note || "No note"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-sans text-xs text-neutral-500">
                        {p.role === "sender" ? "Sent by you" : "Received"}
                      </span>
                      <Badge tone={payoutTone(p.status)}>{p.status.replace("_", " ")}</Badge>
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
      <Payouts />
    </Shell>
  );
}
