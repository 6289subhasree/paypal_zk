"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Badge, PageTitle } from "@/components/ui";
import { api, type PaymentRequest } from "@/lib/api";

type Item = PaymentRequest & {
  role: "payer" | "recipient";
  transaction: { provider_order_id: string; provider_capture_id: string | null; status: string; environment: string; captured_at: string | null } | null;
};

function History() {
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    api<Item[]>("/api/payments/history").then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <>
      <PageTitle title="Payment history" lead="Every transaction here is a PayPal Sandbox test transaction." />
      {items === null ? (
        <p className="text-ink-soft">Loading…</p>
      ) : items.length === 0 ? (
        <div className="panel p-6">
          <p className="font-semibold">No payments yet.</p>
          <Link href="/pay" className="btn mt-3">Create a payment request</Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left">
            <thead className="border-b border-line text-sm text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">PayPal capture</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/pay/${i.id}`} className="underline">{i.currency} {i.amount}</Link>
                  </td>
                  <td className="px-4 py-3">{i.role === "payer" ? "Paid" : "Requested"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={i.status === "paid" ? "ok" : i.status === "expired" ? "bad" : "neutral"}>{i.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {i.transaction?.provider_capture_id ?? "—"}
                    {i.transaction && <span className="ml-2"><Badge tone="sandbox">{i.transaction.environment}</Badge></span>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{new Date(i.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Shell>
      <History />
    </Shell>
  );
}
