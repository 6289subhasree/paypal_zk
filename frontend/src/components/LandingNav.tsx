"use client";
import Link from "next/link";
import { Logo } from "./Logo";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand identity */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-neutral-900">
            <Logo dark className="h-5 w-5" />
            <span>ZK Pass</span>
          </Link>

          {/* Minimal navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-neutral-600">
            <a href="#overview" className="transition hover:text-neutral-950">
              Product
            </a>
            <a href="#verify" className="transition hover:text-neutral-950">
              Verify
            </a>
            <a href="#passport" className="transition hover:text-neutral-950">
              Passport
            </a>
            <a href="#pay" className="transition hover:text-neutral-950">
              Pay
            </a>
            <a
              href="https://github.com/6289subhasree/paypal_zk#readme"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-neutral-950"
            >
              Docs
            </a>
          </nav>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-[13px] font-medium text-neutral-600 hover:text-neutral-950 transition"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0808E8] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0000CC]"
          >
            <span>Explore demo</span>
            <span aria-hidden className="text-[11px]">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
