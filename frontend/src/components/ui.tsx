"use client";
import Link from "next/link";

export function Badge({ tone, children }: { tone: "sim" | "sandbox" | "ok" | "bad" | "neutral"; children: React.ReactNode }) {
  const styles = {
    sim: "bg-sim-soft text-sim",
    sandbox: "bg-brand-soft text-brand",
    ok: "bg-approve-soft text-approve",
    bad: "bg-reject-soft text-reject",
    neutral: "bg-paper-deep text-ink-soft",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-medium ${styles}`}>{children}</span>;
}

export function Stamp({ kind, children }: { kind: "accepted" | "rejected"; children: React.ReactNode }) {
  const color = kind === "accepted" ? "text-approve border-approve" : "text-reject border-reject";
  return (
    <div
      role="status"
      className={`stamp inline-block rounded-lg border-[3px] bg-white/90 px-4 py-2 font-display text-2xl font-bold tracking-tight ${color}`}
      style={{ boxShadow: "inset 0 0 0 2px currentColor" }}
    >
      {children}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-reject-soft px-4 py-3 text-reject">
      {children}
    </p>
  );
}

export function PageTitle({ title, lead }: { title: string; lead?: React.ReactNode }) {
  return (
    <header className="mb-10 max-w-2xl">
      <h1 className="text-4xl font-semibold sm:text-[3.4rem]">{title}</h1>
      {lead && <p className="mt-4 text-lg leading-relaxed text-ink-soft">{lead}</p>}
    </header>
  );
}

export function NextStep({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn">
      {children}
    </Link>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
      {label}
    </span>
  );
}
