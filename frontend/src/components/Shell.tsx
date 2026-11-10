"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

const STEPS = [
  { href: "/verify", step: "01", label: "Verify", hint: "AI-guided KYC verification" },
  { href: "/passport", step: "02", label: "Passport", hint: "Cryptographic credential" },
  { href: "/pay", step: "03", label: "Pay", hint: "Prove per payment & checkout" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [loading, user, router, path]);

  if (loading || !user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#EDEDF0] font-sans text-sm text-neutral-500">
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-3 shadow-xs">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0018f2] border-t-transparent" />
          <span>Loading session…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#EDEDF0] text-[#111111]">
      {/* 56px Top Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
              <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-[#0018f2] text-white shadow-xs">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                  <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2.5a1 1 0 0 1-.3.7L7.4 12.5a1 1 0 0 1-1.4 0L2.3 8.8A1 1 0 0 1 2 8.1V3z" />
                </svg>
              </div>
              <span className="font-sans text-[15px] font-bold tracking-tight text-[#111111]">ZK Pass</span>
            </Link>
            <span className="hidden items-center gap-1.5 rounded-full border border-[#a9d5f5] bg-[#a9d5f5]/30 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#0018f2] sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0018f2]" />
              Sandbox Live
            </span>
          </div>

          <nav className="flex items-center gap-1 text-sm font-medium" aria-label="Account navigation">
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/payouts", label: "Payouts" },
              { href: "/history", label: "History" },
              ...(user.role === "reviewer" ? [{ href: "/review", label: "Review" }] : []),
            ].map((item) => {
              const active = item.href === "/dashboard" ? path === "/dashboard" : path.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[7.13px] px-2.5 py-1.5 text-[13px] transition-colors sm:px-3 ${
                    active
                      ? "bg-neutral-100 font-semibold text-[#111111]"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="mx-2 hidden h-4 w-px bg-neutral-200 md:block" />

            <div className="hidden items-center gap-2 md:flex">
              <span className="font-sans text-xs text-neutral-500">{user.email}</span>
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-neutral-600">
                {user.role}
              </span>
            </div>

            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="ml-2 rounded-[7.13px] border border-neutral-200/90 bg-white px-2.5 py-1 font-sans text-xs font-semibold text-neutral-700 shadow-xs transition hover:bg-neutral-50 sm:px-3 sm:py-1.5"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      {/* Monospace Sub-strip */}
      <div className="border-b border-neutral-200/80 bg-[#FAFAFA] px-4 py-1.5 text-center font-mono text-[11px] text-neutral-500">
        <span>Test identity data only. Payments run in PayPal Sandbox. Independent prototype, not a PayPal product.</span>
      </div>

      {/* App Workspace Grid */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[230px_1fr] lg:gap-10 lg:py-10">
        <aside aria-label="Protocol steps" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-xs">
            <div className="mb-2 px-3 pt-2 font-mono text-[10.5px] uppercase tracking-wider text-neutral-400">
              Protocol Flow
            </div>
            <ol className="flex gap-1.5 overflow-x-auto lg:flex-col">
              {STEPS.map((s) => {
                const active = path === s.href || path.startsWith(`${s.href}/`);
                return (
                  <li key={s.href} className="shrink-0">
                    <Link
                      href={s.href}
                      aria-current={active ? "step" : undefined}
                      className={`group flex items-start gap-3 rounded-xl p-2.5 transition ${
                        active
                          ? "bg-[#0018f2] text-white shadow-xs"
                          : "text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[11px] font-bold ${
                          active
                            ? "bg-white text-[#0018f2]"
                            : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"
                        }`}
                      >
                        {s.step}
                      </span>
                      <div className="min-w-0">
                        <span className="block font-sans text-[13.5px] font-semibold leading-tight">
                          {s.label}
                        </span>
                        <span
                          className={`hidden truncate text-[11px] leading-tight lg:block ${
                            active ? "text-white/80" : "text-neutral-400"
                          }`}
                        >
                          {s.hint}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>

            {/* Quick Demo Role Switcher info */}
            <div className="mt-4 border-t border-neutral-100 pt-3">
              <div className="px-3 pb-1 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                Active Session
              </div>
              <div className="rounded-lg bg-[#FAFAFA] p-2.5 font-sans text-xs">
                <div className="font-semibold text-neutral-900 truncate">{user.display_name}</div>
                <div className="text-[11px] text-neutral-500 truncate">{user.email}</div>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-[#0018f2]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0018f2]" />
                  <span>Role: {user.role}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
