"use client";
import type { Check } from "@/lib/api";
import { Badge } from "./ui";

export function ChecksList({ checks }: { checks: Check[] }) {
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line">
      {checks.map((c) => (
        <li key={c.name} className="flex items-start gap-3 px-4 py-3">
          <span aria-hidden className={`mt-0.5 font-bold ${c.passed ? "text-approve" : "text-reject"}`}>{c.passed ? "✓" : "✕"}</span>
          <span className="flex-1">
            <span className="font-semibold">{c.label}</span>
            {c.simulated && <span className="ml-2"><Badge tone="sim">Simulated</Badge></span>}
            <span className="block text-sm text-ink-soft">{c.detail}</span>
          </span>
          <span className="sr-only">{c.passed ? "passed" : "failed"}</span>
        </li>
      ))}
    </ul>
  );
}
