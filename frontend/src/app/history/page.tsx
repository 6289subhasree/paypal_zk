"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Badge, PageTitle } from "@/components/ui";
import { api, type PaymentRequest } from "@/lib/api";

type Item = PaymentRequest & {
  role: "payer" | "recipient";
  transaction: {
    provider_order_id: string;
    provider_capture_id: string | null;
    status: string;
    environment: string;
    captured_at: string | null;
  } | null;
};

function History() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    api<Item[]>("/api/payments/history").then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <div className="space-y-8">
      <PageTitle
        title="Payment History"
        highlight="Audit Trail"
        lead="Complete log of verified ZK payment authorizations and PayPal Sandbox transactions."
      />

      {items === null ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
          <p className="font-sans text-xs text-neutral-400">Loading audit records…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-8 text-center shadow-xs space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 font-bold">
            $
          </div>
          <h2 className="font-serif text-xl font-bold text-neutral-900">No transactions recorded yet</h2>
          <p className="font-sans text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
            Once you request or authorize a payment with your ZK Passport, it will appear here.
          </p>
          <div className="pt-2">
            <Link
              href="/pay"
              className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
            >
              Create a payment request →
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="border-b border-neutral-200/80 bg-[#FAFAFA] font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">PayPal Capture ID</th>
                  <th className="px-5 py-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80 font-sans text-xs sm:text-[13px]">
                {items.map((i) => (
                  <tr key={i.id} className="transition hover:bg-neutral-50/70">
                    <td className="px-5 py-3.5 font-mono font-bold text-[#0018f2]">
                      <Link href={`/pay/${i.id}`} className="hover:underline">
                        {i.currency} {i.amount}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-neutral-700">
                      {i.role === "payer" ? "Payer (Authorized)" : "Recipient (Merchant)"}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={i.status === "paid" ? "ok" : i.status === "expired" ? "bad" : "neutral"}>
                        {i.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-neutral-600">
                      {i.transaction?.provider_capture_id ?? "—"}
                      {i.transaction && (
                        <span className="ml-2">
                          <Badge tone="sandbox">{i.transaction.environment}</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-sans text-xs text-neutral-500">
                      {new Date(i.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <History />
    </Shell>
  );
}
