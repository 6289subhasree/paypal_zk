"use client";
import type { Check } from "@/lib/api";
import { Badge } from "./ui";

export function ChecksList({ checks }: { checks: Check[] }) {
  return (
    <ul className="divide-y divide-neutral-200/80 overflow-hidden rounded-xl border border-neutral-200/80 bg-white">
      {checks.map((c) => (
        <li key={c.name} className="flex items-start gap-3 p-3.5 transition-colors hover:bg-neutral-50/70 sm:p-4">
          <div
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              c.passed ? "bg-[#e6f4ec] text-[#1a7f4b]" : "bg-[#fdecea] text-[#cf3a31]"
            }`}
            aria-hidden
          >
            {c.passed ? "✓" : "✕"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-sans text-sm font-semibold text-neutral-900">{c.label}</span>
              {c.simulated && <Badge tone="sim">Simulated</Badge>}
              {c.on_device && <Badge tone="neutral">On-device</Badge>}
            </div>
            <p className="mt-0.5 font-sans text-xs text-neutral-500 leading-relaxed">{c.detail}</p>
          </div>
          <span className="sr-only">{c.passed ? "passed" : "failed"}</span>
        </li>
      ))}
    </ul>
  );
}
