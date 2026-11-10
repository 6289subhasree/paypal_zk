"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { HeroWave } from "@/components/HeroWave";
import { LandingNav } from "@/components/LandingNav";
import { LandingPassport } from "@/components/LandingPassport";
import { Logo } from "@/components/Logo";
import { PixelBadge } from "@/components/PixelBadge";
import { PixelRosette } from "@/components/PixelRosette";
import { PixelText } from "@/components/PixelText";
import { PixelWave } from "@/components/PixelWave";

export default function LandingPage() {
  const [activeVerifyTab, setActiveVerifyTab] = useState<"verify" | "review">("verify");
  const [activePayTab, setActivePayTab] = useState<"receipt" | "rejected">("receipt");

  return (
    <div className="min-h-screen bg-white text-neutral-900 selection:bg-[#0018f2] selection:text-white font-sans">
      {/* 1. Thin Navigation Bar */}
      <LandingNav />

      {/* 2. Hero Section - Electric Blue with exact Cotool animated wave flowing left-to-right */}
      <section className="relative overflow-hidden bg-[#0018f2] pt-24 md:pt-32 pb-72 md:pb-80 text-white">
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center sm:px-6 z-10">
          {/* Eyebrow tag matching Cotool */}
          <span className="font-mono text-[11px] sm:text-[13px] uppercase tracking-[0.14em] text-[#a9d5f5]">
            The Zero Knowledge Privacy Lab
          </span>

          {/* Main Editorial Headline with Cotool sky-blue contrasting highlight */}
          <h1 className="font-sans text-[36px] sm:text-[54px] md:text-[66px] font-bold tracking-[-0.02em] text-white leading-[1.12]">
            Verify once.<br className="sm:hidden" />{" "}
            <span className="font-serif text-[#0018f2] bg-[#a9d5f5] leading-[86%] inline-block px-2.5 pb-1.5 mt-1 sm:mt-0 md:mx-3 box-decoration-clone md:whitespace-nowrap font-bold">
              Prove anywhere.
            </span>
          </h1>

          {/* Supporting line */}
          <p className="max-w-xl text-base sm:text-lg font-normal leading-[135%] text-white/90">
            Your identity stays yours. Prove what matters, authorize payments, and keep sensitive
            information private.
          </p>

          {/* Compact CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/register"
              className="inline-flex h-9.5 items-center gap-2.5 rounded-[7.13px] bg-white px-4 text-sm font-semibold text-[#0018f2] shadow-sm transition hover:bg-[#a9d5f5]"
            >
              <span>Explore the demo</span>
              <svg width="11" height="10" viewBox="0 0 11 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.40909 9.64524L4.38494 8.63104L7.45242 5.56357H0V4.08203H7.45242L4.38494 1.01953L5.40909 0.000354886L10.2315 4.8228L5.40909 9.64524Z" fill="currentColor" />
              </svg>
            </Link>
            <a
              href="#overview"
              className="inline-flex h-9.5 items-center gap-2 rounded-[7.13px] border border-white/30 bg-white/10 px-4 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              How it works
            </a>
          </div>
        </div>

        {/* Exact Cotool Japanese woodblock pixel wave flowing left-to-right at authentic scale */}
        <HeroWave />
      </section>

      {/* 3. Technology / Protocol Bar */}
      <section className="border-b border-neutral-200 bg-neutral-50/70 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 gap-x-6 px-4 text-xs font-mono text-neutral-500 sm:px-6">
          <span>Circom 2.1 & Groth16</span>
          <span className="hidden sm:inline text-neutral-300">/</span>
          <span>BabyJubJub EdDSA</span>
          <span className="hidden sm:inline text-neutral-300">/</span>
          <span>Poseidon Commitment</span>
          <span className="hidden sm:inline text-neutral-300">/</span>
          <span>MediaPipe On-Device</span>
          <span className="hidden sm:inline text-neutral-300">/</span>
          <span>PayPal Sandbox Orders v2</span>
          <span className="hidden sm:inline text-neutral-300">/</span>
          <span>Tesseract OCR</span>
        </div>
      </section>

      {/* 4. Trust / Introduction Section */}
      <section id="overview" className="relative bg-[#FAFAFA] py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          {/* Centered pixel badge */}
          <div className="flex justify-center mb-6">
            <PixelBadge />
          </div>

          {/* Elegant serif headline */}
          <h2 className="font-serif text-[clamp(2.2rem,4.5vw,3.75rem)] font-normal tracking-tight text-neutral-900 leading-[1.14]">
            Your identity shouldn&apos;t be the price of making a payment.
          </h2>

          {/* Editorial Problem & Solution Copy */}
          <div className="mt-8 space-y-4 text-base sm:text-lg leading-relaxed text-neutral-600">
            <p>
              Traditional verification forces users to repeatedly upload photos of passports, tax IDs, and
              personal details to every merchant. Every transaction duplicates identity risk across databases
              you cannot inspect or control.
            </p>
            <p className="font-medium text-neutral-800">
              ZK Pass changes the model: verify once with AI assistance, hold an issuer-signed cryptographic
              credential in your browser, and prove only what&apos;s strictly necessary.
            </p>
          </div>

          {/* Action links */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/6289subhasree/paypal_zk"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-xs transition hover:border-neutral-400 hover:text-neutral-950"
            >
              Explore GitHub
            </a>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0808E8] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0000CC]"
            >
              <span>Launch Demo</span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Product Showcase Sections — Light Grey Canvas (#EDEDF0) */}
      <div className="bg-[#EDEDF0] py-24 sm:py-32 space-y-28 sm:space-y-36">
        {/* Showcase 01 — VERIFY */}
        <section id="verify" className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
            {/* Left Column / Editorial Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-500">
                01 / VERIFY
              </span>
              <h3 className="font-serif text-3xl sm:text-4xl font-normal text-neutral-900 leading-[1.15]">
                Verify your identity. Keep control of your data.
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-neutral-600">
                An AI assistant guides you through the KYC session. Tesseract OCR parses test documents,
                rule-based checks compare identity fields, and MediaPipe runs on-device blink and head-turn
                liveness tests directly in your browser. A human reviewer approves the final evidence summary.
              </p>

              {/* Sidebar quote card */}
              <div className="rounded-xl border border-neutral-300/80 bg-white/90 p-5 shadow-xs">
                <p className="text-xs italic text-neutral-700 leading-relaxed">
                  &ldquo;Raw document images are processed in memory and immediately discarded. Masked
                  outcomes and cryptographic commitments are all that survive.&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-2 border-t border-neutral-200 pt-3 text-[11px] font-mono text-neutral-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>zkpass/engine · OCR &amp; Liveness</span>
                </div>
              </div>

              <div>
                <Link
                  href="/verify"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0808E8] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0000CC]"
                >
                  <span>Try verification</span>
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>

            {/* Right Column / Large Screenshot Canvas */}
            <div className="lg:col-span-8">
              <div className="relative overflow-hidden rounded-2xl border border-neutral-300/90 bg-white shadow-md">
                {/* Screenshot Header Bar */}
                <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100/90 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                    <span className="ml-2 font-mono text-[11px] text-neutral-500">
                      localhost:3000/{activeVerifyTab}
                    </span>
                  </div>
                  <div className="flex gap-1 rounded-md bg-neutral-200/80 p-0.5 text-xs font-medium">
                    <button
                      onClick={() => setActiveVerifyTab("verify")}
                      className={`rounded px-2.5 py-1 transition ${
                        activeVerifyTab === "verify" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      Payer Wizard
                    </button>
                    <button
                      onClick={() => setActiveVerifyTab("review")}
                      className={`rounded px-2.5 py-1 transition ${
                        activeVerifyTab === "review" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      Reviewer Queue
                    </button>
                  </div>
                </div>

                {/* Actual Real Screenshot */}
                <div className="relative aspect-[16/10] bg-neutral-50">
                  <Image
                    src={activeVerifyTab === "verify" ? "/verify.png" : "/review.png"}
                    alt={activeVerifyTab === "verify" ? "ZK Pass Verification Wizard UI" : "Reviewer Queue UI"}
                    fill
                    className="object-cover object-top"
                    priority
                  />
                  {/* Floating blue feature badge */}
                  <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-[#0808E8] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    <span>01 AI Guidance + On-Device Liveness</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Showcase 02 — PASSPORT (Alternating layout) */}
        <section id="passport" className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Interactive Passport Credential */}
            <div className="order-2 lg:order-1 lg:col-span-7">
              <div className="relative rounded-2xl border border-neutral-300/80 bg-neutral-100/70 p-6 sm:p-10 shadow-md">
                <LandingPassport />

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 font-mono border-t border-neutral-200/80 pt-4">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    BabyJubJub Curve: 248-bit scalar
                  </span>
                  <span>Poseidon(HolderSecret) = Commit</span>
                </div>

                {/* Floating blue feature badge */}
                <div className="absolute -top-3 right-6 z-10 rounded-full bg-[#0808E8] px-3.5 py-1 text-xs font-semibold text-white shadow-md">
                  02 Browser-Bound EdDSA
                </div>
              </div>
            </div>

            {/* Right Column: Editorial Copy */}
            <div className="order-1 lg:order-2 lg:col-span-5 space-y-6">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-500">
                02 / PASSPORT
              </span>
              <h3 className="font-serif text-3xl sm:text-4xl font-normal text-neutral-900 leading-[1.15]">
                One credential. A lifetime of private proofs.
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-neutral-600">
                Your browser creates a cryptographic secret that never leaves local storage. The issuer
                receives only your public commitment, signing it with EdDSA over the BabyJubJub curve.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-neutral-700">
                <li className="flex items-center gap-2">
                  <span className="text-[#0808E8] font-bold">✓</span>
                  <span>Zero identity documents stored on issuer servers</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#0808E8] font-bold">✓</span>
                  <span>Instant client-side key generation in milliseconds</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#0808E8] font-bold">✓</span>
                  <span>Automatic revocation checking via verifier domain tags</span>
                </li>
              </ul>
              <div>
                <Link
                  href="/passport"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0808E8] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0000CC]"
                >
                  <span>Issue Passport</span>
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Showcase 03 — PAY */}
        <section id="pay" className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
            {/* Left Column / Editorial */}
            <div className="lg:col-span-4 space-y-6">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-500">
                03 / PAY
              </span>
              <h3 className="font-serif text-3xl sm:text-4xl font-normal text-neutral-900 leading-[1.15]">
                Prove you&apos;re eligible. Never reveal why.
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-neutral-600">
                For every payment, your browser compiles a Groth16 zero-knowledge proof in two seconds. It
                proves your KYC approval, credential expiry, and age requirement without revealing your birth
                date or holder secret.
              </p>

              <div className="rounded-xl border border-neutral-300/80 bg-white/90 p-5 shadow-xs text-xs space-y-2 font-mono text-neutral-700">
                <div className="text-neutral-500 font-bold uppercase">Verifier receives 9 public signals:</div>
                <div className="truncate text-neutral-600">nullifier, revocation_tag, issuer_pk,</div>
                <div className="truncate text-neutral-600">timestamp, payment_challenge, verifier_id...</div>
                <div className="text-emerald-600 font-semibold pt-1">Never sees name, birthdate, or ID.</div>
              </div>

              <div>
                <Link
                  href="/pay"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0808E8] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0000CC]"
                >
                  <span>Test payment gate</span>
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>

            {/* Right Column / Proof & Capture Showcase */}
            <div className="lg:col-span-8">
              <div className="relative overflow-hidden rounded-2xl border border-neutral-300/90 bg-white shadow-md">
                {/* Header bar */}
                <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100/90 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                    <span className="ml-2 font-mono text-[11px] text-neutral-500">
                      PayPal Sandbox Checkout
                    </span>
                  </div>
                  <div className="flex gap-1 rounded-md bg-neutral-200/80 p-0.5 text-xs font-medium">
                    <button
                      onClick={() => setActivePayTab("receipt")}
                      className={`rounded px-2.5 py-1 transition ${
                        activePayTab === "receipt" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      PayPal Capture Receipt
                    </button>
                    <button
                      onClick={() => setActivePayTab("rejected")}
                      className={`rounded px-2.5 py-1 transition ${
                        activePayTab === "rejected" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      Attack Defense Proof
                    </button>
                  </div>
                </div>

                {/* Screenshot Container */}
                <div className="relative aspect-[16/10] bg-neutral-50">
                  <Image
                    src={activePayTab === "receipt" ? "/receipt.png" : "/rejected.png"}
                    alt={activePayTab === "receipt" ? "PayPal Sandbox capture receipt" : "Tampered proof rejected"}
                    fill
                    className="object-cover object-top"
                  />

                  {/* Floating blue feature badge */}
                  <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-[#0808E8] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                    <span className="h-2 w-2 rounded-full bg-amber-300" />
                    <span>03 PayPal Sandbox Orders v2 + Vault</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 6. Testimonial / Privacy Statement Section */}
      <section className="bg-white py-24 sm:py-32 border-y border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left: Philosophy quote */}
            <div className="lg:col-span-7 space-y-6">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#0808E8]">
                WHY IT MATTERS
              </span>
              <h2 className="font-serif text-[clamp(2.3rem,4.8vw,4rem)] font-normal text-neutral-900 leading-[1.12]">
                &ldquo;Your documents are yours. Your proofs are enough.&rdquo;
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-neutral-600 max-w-xl">
                The verifier receives mathematical certainty of eligibility, not your identity documents,
                full legal name, date of birth, or holder secret. Altered, stale, or replayed proofs fail
                in-circuit before PayPal checkout can ever unlock.
              </p>
              <div className="pt-2 text-xs font-mono text-neutral-400">
                ZK Pass Cryptographic Architecture · Zero-Knowledge Payment Protocol
              </div>
            </div>

            {/* Right: Intricate geometric pixel rosette */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80 shadow-xs">
                <PixelRosette size={260} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Dark Product Capabilities Section (Charcoal #18181b) */}
      <section className="relative overflow-hidden bg-[#18181b] py-24 sm:py-32 text-white">
        {/* Subtle corner pixel scatter */}
        <div className="pointer-events-none absolute right-0 top-0 w-80 opacity-60">
          <PixelWave variant="scatter" height={160} />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          {/* Centered headline */}
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-[clamp(2.4rem,5vw,4rem)] font-normal text-white leading-[1.14]">
              Built to make private payments actually work.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-neutral-400">
              Three coordinated layers of defense against unnecessary identity disclosure.
            </p>
          </div>

          {/* Three Feature Cards */}
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* Card 1 */}
            <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#202023] p-7 transition hover:border-white/20">
              <div className="space-y-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0808E8] text-white font-mono text-sm font-bold">
                  01
                </div>
                <h3 className="text-xl font-semibold text-white tracking-tight">
                  Verify once, reuse everywhere
                </h3>
                <p className="text-sm leading-relaxed text-neutral-400">
                  Issuer signs an EdDSA signature over BabyJubJub curve bound to Poseidon hash of your holder
                  secret. You never upload documents a second time.
                </p>
              </div>
              <div className="mt-6 rounded-lg bg-black/40 p-3 font-mono text-[11px] text-neutral-400 border border-white/5">
                <code>HolderSecret → Poseidon → EdDSA(Issuer)</code>
              </div>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#202023] p-7 transition hover:border-white/20">
              <div className="space-y-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0808E8] text-white font-mono text-sm font-bold">
                  02
                </div>
                <h3 className="text-xl font-semibold text-white tracking-tight">
                  Cryptographic proof, not trust
                </h3>
                <p className="text-sm leading-relaxed text-neutral-400">
                  In-circuit Groth16 verification with single-use nullifiers bound to each payment challenge.
                  Tampering, replaying, or forged signatures are mathematically rejected.
                </p>
              </div>
              <div className="mt-6 rounded-lg bg-black/40 p-3 font-mono text-[11px] text-neutral-400 border border-white/5">
                <code>Nullifier = Poseidon(secret, challenge)</code>
              </div>
            </div>

            {/* Card 3 */}
            <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#202023] p-7 transition hover:border-white/20">
              <div className="space-y-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0808E8] text-white font-mono text-sm font-bold">
                  03
                </div>
                <h3 className="text-xl font-semibold text-white tracking-tight">
                  Real payment workflows
                </h3>
                <p className="text-sm leading-relaxed text-neutral-400">
                  Integrates directly with PayPal Sandbox Orders v2 create and capture, PayPal Vault for
                  one-click repeat payments, refunds, and verified freelancer payouts.
                </p>
              </div>
              <div className="mt-6 rounded-lg bg-black/40 p-3 font-mono text-[11px] text-neutral-400 border border-white/5">
                <code>PayPal Orders v2 · Vault · Payouts v1</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Final CTA Banner — Electric Blue */}
      <section className="bg-white py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#0808E8] text-white shadow-xl relative">
          <div className="grid lg:grid-cols-12 items-center">
            {/* Left side: Heading & CTAs */}
            <div className="lg:col-span-7 p-8 sm:p-14 space-y-6 z-10">
              <h2 className="font-serif text-[clamp(2.3rem,4.5vw,3.75rem)] font-normal text-white leading-[1.12]">
                Your identity. Your control. Your proof.
              </h2>
              <p className="text-base sm:text-lg text-white/85 max-w-lg leading-relaxed">
                Experience a different approach to identity verification and payment authorization.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-[#0808E8] shadow-sm transition hover:bg-neutral-100"
                >
                  <span>Try the demo</span>
                  <span aria-hidden>→</span>
                </Link>
                <a
                  href="https://github.com/6289subhasree/paypal_zk"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  Explore GitHub
                </a>
              </div>
            </div>

            {/* Right side: Pixel Wave Tunnel */}
            <div className="lg:col-span-5 h-64 lg:h-full relative overflow-hidden flex items-center justify-center">
              <PixelWave variant="cta" height={240} className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* 9. Footer — Charcoal / Black with Oversized Pixelated Typography */}
      <footer className="bg-[#111113] pt-20 pb-12 text-white border-t border-neutral-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Top Footer Row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-neutral-800/80 pb-12">
            <div className="flex items-center gap-3">
              <Logo dark className="h-6 w-6" />
              <span className="text-xl font-bold tracking-tight">ZK Pass</span>
              <span className="ml-2 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-mono text-neutral-400">
                Sandbox Mode
              </span>
            </div>

            <nav className="flex flex-wrap items-center gap-6 text-xs text-neutral-400 font-medium">
              <Link href="/verify" className="hover:text-white transition">Verify</Link>
              <Link href="/passport" className="hover:text-white transition">Passport</Link>
              <Link href="/pay" className="hover:text-white transition">Pay</Link>
              <Link href="/payouts" className="hover:text-white transition">Payouts</Link>
              <Link href="/history" className="hover:text-white transition">History</Link>
              <a
                href="https://github.com/6289subhasree/paypal_zk"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition"
              >
                GitHub
              </a>
            </nav>
          </div>

          {/* Centerpiece: Oversized Pixelated ZK PASS Wordmark */}
          <div className="py-14 sm:py-20 select-none opacity-85">
            <PixelText text="ZK PASS" />
          </div>

          {/* Bottom disclaimer and copyright */}
          <div className="border-t border-neutral-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 font-mono">
            <p>
              Independent hackathon prototype for PayPal AI Hackathon. All identity data is mock data and payments
              run in PayPal Sandbox.
            </p>
            <p>© 2026 ZK Pass. Open source MIT.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
