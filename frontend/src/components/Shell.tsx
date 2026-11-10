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
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 bg-navy-deep text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Logo />
            ZK Pass
            <span className="ml-1 hidden rounded-full bg-yellow px-2 py-0.5 text-[11px] font-semibold text-navy-deep sm:inline">
              Sandbox
            </span>
          </Link>
          <nav className="flex items-center gap-0.5 text-sm font-medium" aria-label="Account">
            {[
              { href: "/payouts", label: "Payouts" },
              { href: "/history", label: "History" },
              ...(user.role === "reviewer" ? [{ href: "/review", label: "Review" }] : []),
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-2.5 py-1.5 sm:px-3 ${path.startsWith(l.href) ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
              >
                {l.label}
              </Link>
            ))}
            <span className="hidden px-3 text-white/60 md:inline">{user.display_name}</span>
            <button onClick={() => { logout(); router.push("/"); }} className="btn btn-glass ml-1 px-3 py-1.5 text-sm">
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <p className="border-b border-line bg-paper-deep px-4 py-1.5 text-center text-[13px] text-ink-soft">
        Test identity data only. Payments run in PayPal Sandbox. Independent prototype, not a PayPal product.
      </p>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[210px_1fr]">
        <nav aria-label="Steps" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {STEPS.map((s, i) => {
              const active = path === s.href || path.startsWith(`${s.href}/`);
              return (
                <li key={s.href} className="shrink-0">
                  <Link
                    href={s.href}
                    aria-current={active ? "step" : undefined}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${active ? "bg-navy text-white" : "hover:bg-paper-deep"}`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${active ? "bg-yellow text-navy-deep" : "bg-paper-deep text-ink-soft ring-1 ring-line"}`}>
                      {i + 1}
                    </span>
                    <span>
                      <span className="block font-semibold">{s.label}</span>
                      <span className={`hidden text-sm lg:block ${active ? "text-white/70" : "text-ink-soft"}`}>{s.hint}</span>
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
