"use client";
import Link from "next/link";

export function Badge({
  tone,
  children,
}: {
  tone: "sim" | "sandbox" | "ok" | "bad" | "neutral";
  children: React.ReactNode;
}) {
  const styles = {
    sim: {
      wrapper: "bg-[#fff5d6] text-[#8a5a00] border-[#f1de9a]",
      dot: "bg-[#8a5a00]",
    },
    sandbox: {
      wrapper: "bg-[#a9d5f5]/40 text-[#0018f2] border-[#a9d5f5]",
      dot: "bg-[#0018f2]",
    },
    ok: {
      wrapper: "bg-[#e6f4ec] text-[#1a7f4b] border-[#a3e0be]",
      dot: "bg-[#1a7f4b]",
    },
    bad: {
      wrapper: "bg-[#fdecea] text-[#cf3a31] border-[#f8b4af]",
      dot: "bg-[#ff0402]",
    },
    neutral: {
      wrapper: "bg-neutral-100 text-neutral-700 border-neutral-200",
      dot: "bg-neutral-400",
    },
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide uppercase ${styles.wrapper}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} aria-hidden />
      {children}
    </span>
  );
}

export function Stamp({ kind, children }: { kind: "accepted" | "rejected"; children: React.ReactNode }) {
  const isOk = kind === "accepted";
  const border = isOk ? "border-[#1a7f4b] text-[#1a7f4b]" : "border-[#cf3a31] text-[#cf3a31]";
  const bg = isOk ? "bg-white/95" : "bg-white/95";

  return (
    <div
      role="status"
      className={`stamp inline-block rounded-md border-2 ${border} ${bg} px-3.5 py-1.5 font-mono text-sm font-bold tracking-widest uppercase shadow-md sm:text-base`}
      style={{ boxShadow: "inset 0 0 0 1px currentColor, 0 8px 24px -8px rgba(0,0,0,0.25)" }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs">●</span>
        <span>{children}</span>
        <span className="text-xs">●</span>
      </div>
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-[#fdecea] px-4 py-3 font-sans text-sm text-[#cf3a31]"
    >
      <span className="mt-0.5 font-mono text-xs font-bold leading-none">✕</span>
      <div className="flex-1 leading-snug">{children}</div>
    </div>
  );
}

export function PageTitle({
  title,
  lead,
  highlight,
  badge,
}: {
  title: string;
  lead?: React.ReactNode;
  highlight?: string;
  badge?: React.ReactNode;
}) {
  return (
    <header className="mb-8 max-w-3xl">
      {badge && <div className="mb-3">{badge}</div>}
      <h1 className="font-serif text-3xl font-bold tracking-tight text-[#111111] sm:text-4xl md:text-[44px] md:leading-[1.1]">
        {title}{" "}
        {highlight && (
          <span className="box-decoration-clone bg-[#a9d5f5] px-2 pb-0.5 text-[#0018f2]">
            {highlight}
          </span>
        )}
      </h1>
      {lead && (
        <div className="mt-3 font-sans text-[15px] leading-relaxed text-[#555555] sm:text-base">
          {lead}
        </div>
      )}
    </header>
  );
}

export function NextStep({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="btn inline-flex items-center gap-2 bg-[#0018f2] text-white hover:bg-[#0014cc]"
    >
      <span>{children}</span>
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
        <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-sans text-sm text-neutral-600" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0018f2] border-t-transparent motion-reduce:animate-none" />
      <span>{label}…</span>
    </span>
  );
}
