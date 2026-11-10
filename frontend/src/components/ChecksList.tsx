"use client";
import type { Check } from "@/lib/api";
import { Badge } from "./ui";

export function ChecksList({ checks }: { checks: Check[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
      {checks.map((c) => (
        <li key={c.name} className="flex items-start gap-3 px-4 py-3">
          <span
            aria-hidden
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${c.passed ? "bg-approve-soft text-approve" : "bg-reject-soft text-reject"}`}
          >
            {c.passed ? "✓" : "✕"}
          </span>
          <span className="flex-1">
            <span className="font-medium">{c.label}</span>
            {c.simulated && <span className="ml-2"><Badge tone="sim">Simulated</Badge></span>}
            {c.on_device && <span className="ml-2"><Badge tone="sandbox">On-device · not certified</Badge></span>}
            <span className="block text-sm text-ink-soft">{c.detail}</span>
          </span>
          <span className="sr-only">{c.passed ? "passed" : "failed"}</span>
        </li>
      ))}
    </ul>
  );
}
