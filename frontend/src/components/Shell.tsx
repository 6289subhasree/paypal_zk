"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Logo } from "./Logo";

const STEPS = [
  { href: "/verify", label: "Verify", hint: "AI-guided identity check" },
  { href: "/passport", label: "Passport", hint: "Your reusable credential" },
  { href: "/pay", label: "Pay", hint: "Prove, then check out" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [loading, user, router, path]);

  if (loading || !user) {
    return <div className="grid min-h-dvh place-items-center text-ink-soft">Loading your session…</div>;
  }

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <Logo />
            ZK Pass
            <span className="ml-1 hidden items-center gap-1.5 rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[11px] font-normal text-primary sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              Sandbox
            </span>
          </Link>
          <nav className="flex items-center gap-0.5 text-[13px]" aria-label="Account">
            {[
              { href: "/payouts", label: "Payouts" },
              { href: "/history", label: "History" },
              ...(user.role === "reviewer" ? [{ href: "/review", label: "Review" }] : []),
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={path.startsWith(l.href) ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 sm:px-3 ${path.startsWith(l.href) ? "bg-brand-soft text-primary" : "text-[#3a3a3a] hover:text-primary"}`}
              >
                {l.label}
              </Link>
            ))}
            <span className="ml-1 hidden border-l border-line pl-3 text-ink-soft md:inline">{user.display_name}</span>
            <button
              onClick={() => { logout(); router.push("/"); }}
              className="ml-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-paper-deep"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <p className="border-b border-line bg-white/60 px-4 py-1.5 text-center font-mono text-[11px] text-ink-soft">
        <span className="mr-1.5 text-approve" aria-hidden>●</span>
        PayPal Sandbox active · Test identity documents only · Independent prototype, not a PayPal product
      </p>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[200px_1fr] lg:gap-12 lg:py-12">
        <nav aria-label="Steps" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="flex gap-1 overflow-x-auto lg:flex-col">
            {STEPS.map((s, i) => {
              const active = path === s.href || path.startsWith(`${s.href}/`);
              return (
                <li key={s.href} className="shrink-0">
                  <Link
                    href={s.href}
                    aria-current={active ? "step" : undefined}
                    className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${active ? "bg-white shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-line" : "hover:bg-white/60"}`}
                  >
                    <span
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] ${active ? "bg-primary text-white" : "bg-white text-ink-soft ring-1 ring-line"}`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className={`block font-serif text-[19px] leading-tight ${active ? "text-primary" : "text-ink"}`}>{s.label}</span>
                      <span className="hidden text-[13px] text-ink-soft lg:block">{s.hint}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
