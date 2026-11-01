"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

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
      <div className="bg-sim-soft px-4 py-1.5 text-center text-sm text-sim">
        Demo environment: test identity data only, payments run in PayPal Sandbox. Independent prototype, not a PayPal product.
      </div>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/dashboard" className="font-display text-2xl font-extrabold tracking-tight">
            ZK Pass
          </Link>
          <nav className="flex items-center gap-1 text-[15px]" aria-label="Account">
            <Link href="/history" className="rounded-full px-3 py-1.5 hover:bg-paper-deep">History</Link>
            {user.role === "reviewer" && (
              <Link href="/review" className="rounded-full px-3 py-1.5 hover:bg-paper-deep">Review queue</Link>
            )}
            <span className="hidden px-3 text-ink-soft sm:inline">{user.display_name}</span>
            <button onClick={() => { logout(); router.push("/"); }} className="btn btn-quiet py-1.5">
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Steps" className="lg:sticky lg:top-6 lg:self-start">
          <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {STEPS.map((s, i) => {
              const active = path.startsWith(s.href);
              return (
                <li key={s.href} className="shrink-0">
                  <Link
                    href={s.href}
                    aria-current={active ? "step" : undefined}
                    className={`flex items-start gap-3 rounded-2xl px-3 py-2.5 ${active ? "bg-ink text-paper" : "hover:bg-paper-deep"}`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-display font-bold ${active ? "bg-paper text-ink" : "bg-paper-deep"}`}>
                      {i + 1}
                    </span>
                    <span>
                      <span className="block font-semibold">{s.label}</span>
                      <span className={`hidden text-sm lg:block ${active ? "text-paper/75" : "text-ink-soft"}`}>{s.hint}</span>
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
