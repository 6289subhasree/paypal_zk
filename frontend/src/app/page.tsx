import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PixelField } from "@/components/landing/PixelField";
import { Reveal } from "@/components/landing/Reveal";
import { GridMark, ShowcaseNav } from "@/components/landing/ShowcaseNav";

export const metadata: Metadata = {
  title: "ZK Pass: verify once, prove anywhere",
  description:
    "Private KYC for payments. Verify once with an AI-guided check, hold a credential only your browser can use, and authorize PayPal Sandbox payments with a zero-knowledge proof.",
  openGraph: {
    title: "ZK Pass: verify once, prove anywhere",
    description: "Prove you passed KYC, and that you're over 18, without revealing who you are. Independent hackathon prototype.",
    images: ["/landing/accepted.webp"],
  },
};

const GITHUB = "https://github.com/6289subhasree/paypal_zk";

function Arrow() {
  return (
    <svg viewBox="0 0 12 12" className="arrow h-3 w-3" aria-hidden>
      <path d="M2 6h7.5M6.5 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Mark({ className = "h-4 w-4", tone = "blue" }: { className?: string; tone?: "blue" | "white" }) {
  const fg = tone === "blue" ? "var(--lp-blue)" : "#fff";
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill={fg} />
      <path d="M4.3 8.2l2.4 2.4 5-5.2" fill="none" stroke={tone === "blue" ? "#fff" : "var(--lp-blue)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Product screenshot on a grey canvas with a floating label, as in the reference layout. */
function Screen({ src, alt, w, h, label, crop = "h-[340px] sm:h-[460px]" }: {
  src: string; alt: string; w: number; h: number; label?: string; crop?: string;
}) {
  return (
    <Reveal as="figure" className="relative overflow-hidden bg-[var(--lp-canvas)]">
      <div className={`relative overflow-hidden px-5 pt-6 sm:px-10 sm:pt-9 ${crop}`}>
        <Image
          src={src}
          alt={alt}
          width={w}
          height={h}
          sizes="(min-width: 1024px) 760px, 100vw"
          className="w-full rounded-t-[6px] shadow-[0_18px_50px_-20px_rgb(0_0_0/0.35)] ring-1 ring-black/5"
        />
      </div>
      {label && (
        <figcaption className="absolute bottom-3 left-3 flex items-center gap-2 rounded-[3px] bg-[#dfe3ff] px-3 py-1.5 font-serif text-[19px] text-[var(--lp-blue)] shadow-sm sm:bottom-4 sm:left-4">
          <GridMark />
          {label}
        </figcaption>
      )}
    </Reveal>
  );
}

function Showcase({ id, title, body, points, cta, children }: {
  id: string; title: string; body: string; points: string[]; cta: { href: string; label: string }; children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <Reveal>
        <h2 className="max-w-[18ch] text-[34px] sm:text-[42px]">{title}</h2>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-[46ch] text-[14px] leading-relaxed text-[var(--lp-muted)]">{body}</p>
          <Link href={cta.href} className="lp-btn lp-btn-blue self-start sm:self-auto">
            {cta.label} <Arrow />
          </Link>
        </div>
        <ul className="mt-5 grid gap-x-6 gap-y-1.5 font-mono text-[12px] text-[#4a4a4a] sm:grid-cols-2">
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--lp-blue)]" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      </Reveal>
      <div className="mt-7">{children}</div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="lp min-h-dvh overflow-x-clip">
      {/* ---------- navigation ---------- */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-11 max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
              <Mark />
              ZK Pass
            </Link>
            <nav aria-label="Main" className="hidden items-center gap-5 text-[13px] text-[#3a3a3a] md:flex">
              <a href="#verify" className="hover:text-[var(--lp-blue)]">Product</a>
              <a href="#how" className="hover:text-[var(--lp-blue)]">How it works</a>
              <a href="#privacy" className="hover:text-[var(--lp-blue)]">Privacy</a>
              <a href={GITHUB} className="hover:text-[var(--lp-blue)]">GitHub</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-[13px] text-[#3a3a3a] hover:text-[var(--lp-blue)] sm:block">Sign in</Link>
            <Link href="/register" className="lp-btn lp-btn-blue">Try the demo</Link>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- hero ---------- */}
        <section className="relative overflow-hidden bg-[var(--lp-blue)] text-white">
          <div className="relative z-10 mx-auto max-w-4xl px-4 pb-10 pt-20 text-center sm:pt-24">
            <h1 className="lp-rise text-[46px] sm:text-[64px] lg:text-[72px]">
              Verify once. <span className="lp-mark">Prove anywhere.</span>
            </h1>
            <p className="lp-rise mx-auto mt-6 max-w-[52ch] text-[15px] leading-relaxed text-white/90" style={{ animationDelay: "120ms" }}>
              Your identity stays yours. Prove what matters, authorize payments, and keep sensitive information private.
            </p>
            <div className="lp-rise mt-7 flex flex-wrap justify-center gap-2.5" style={{ animationDelay: "220ms" }}>
              <Link href="/register" className="lp-btn lp-btn-white">Explore the demo <Arrow /></Link>
              <a href="#how" className="lp-btn lp-btn-ghost">How it works</a>
            </div>
          </div>
          <div className="relative -mt-4 h-[230px] sm:h-[300px]">
            <PixelField variant="wave" gap={10} label="Animated waves of dots" />
          </div>
        </section>

        {/* ---------- built-on strip (technology, not customers) ---------- */}
        <div className="border-b border-black/5 bg-[#f6f6f6]">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-4 text-[12px] text-[#555]">
            <span>Built on:</span>
            {["PayPal Sandbox", "Circom + Groth16", "snarkjs", "MediaPipe", "Tesseract OCR"].map((t) => (
              <span key={t} className="font-mono text-[12px] text-[#222]">{t}</span>
            ))}
          </div>
        </div>

        {/* ---------- problem / introduction ---------- */}
        <section id="how" className="scroll-mt-12 bg-white">
          <div className="mx-auto max-w-[760px] px-4 py-20 text-center sm:py-24">
            <Reveal className="mx-auto h-[86px] w-[150px]">
              <PixelField variant="tile" gap={12.5} label="A grid of cells representing a private credential" />
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mx-auto mt-9 max-w-[22ch] text-[30px] sm:text-[36px]">
                Your identity shouldn&apos;t be the price of making a payment.
              </h2>
            </Reveal>
            <Reveal delay={140} className="mx-auto mt-7 max-w-[56ch] space-y-5 font-serif text-[19px] leading-snug text-[#2a2a2a] sm:text-[21px]">
              <p>
                Traditional verification makes people expose the same documents again and again, to every service that asks.
              </p>
              <p>
                ZK Pass changes the model: <strong className="font-medium text-[var(--lp-ink)]">verify once</strong>, hold a private
                credential, and <strong className="font-medium text-[var(--lp-ink)]">prove only what&apos;s necessary</strong>.
              </p>
            </Reveal>
            <Reveal delay={200} className="mt-8 flex flex-wrap justify-center gap-2.5">
              <Link href="/register" className="lp-btn lp-btn-grey">Create a test account <Arrow /></Link>
              <a href="#verify" className="lp-btn lp-btn-blue">See the flow <Arrow /></a>
            </Reveal>
          </div>
        </section>

        {/* ---------- product showcase ---------- */}
        <section aria-label="Product" className="bg-[var(--lp-grey)]">
          <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-20 lg:py-24">
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-8">
                <ShowcaseNav />
                <figure className="bg-white p-5 text-[13px] leading-relaxed shadow-sm">
                  <p className="font-mono text-[11px] text-[var(--lp-muted)]">What a verifier receives</p>
                  <pre className="mt-3 overflow-hidden whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-[var(--lp-ink)]">
{`P<ZKPASS<<KYC<APPROVED<<VALID<<<
NUL 3001…0070 < REV 1296…3023`}
                  </pre>
                  <figcaption className="mt-3 text-[#4a4a4a]">
                    A one-time nullifier, a revocation tag and the proof. No name, no birth date, no document number.
                  </figcaption>
                </figure>
              </div>
            </aside>

            <div className="space-y-24 lg:space-y-32">
              <Showcase
                id="verify"
                title="Verify your identity. Keep control of your data."
                body="An AI assistant guides a check of a SPECIMEN test card. OCR reads it, rule-based checks compare it with what you typed, a liveness check runs on your own device, and a human reviewer makes the decision."
                points={[
                  "Tesseract OCR with masked fields",
                  "Deterministic document checks",
                  "MediaPipe liveness in the browser",
                  "AI-written evidence summary",
                  "Human reviewer approves or rejects",
                ]}
                cta={{ href: "/register", label: "Start a verification" }}
              >
                <div className="space-y-5">
                  <Screen src="/landing/verify.webp" alt="ZK Pass verification step: the test document has been read, with the number masked and the SPECIMEN marker found, next to the assistant chat." w={1342} h={892} label="Verify" />
                  <Screen src="/landing/review.webp" alt="Reviewer queue showing 7 of 7 automated checks passed and an evidence summary, with Approve and Reject buttons." w={1342} h={915} crop="h-[300px] sm:h-[400px]" />
                </div>
              </Showcase>

              <Showcase
                id="passport"
                title="One credential. A lifetime of private proofs."
                body="Your browser creates a random holder secret and sends only its Poseidon hash. The issuer signs that commitment with your KYC claim, birth date and an expiry, so only this browser can ever use the credential."
                points={[
                  "Holder secret never leaves the browser",
                  "Poseidon holder commitment",
                  "EdDSA signature over BabyJubJub",
                  "Expiry and per-verifier revocation",
                ]}
                cta={{ href: "/register", label: "Issue a Passport" }}
              >
                <Screen src="/landing/passport.webp" alt="The ZK Passport card: holder Asha Verma, issuer zkpass-demo-issuer, claims KYC approved and age, status Active, with the verifier strip at the bottom." w={1342} h={660} label="Passport" crop="h-[320px] sm:h-[480px]" />
              </Showcase>

              <Showcase
                id="pay"
                title="Prove you're eligible. Never reveal why."
                body="For each payment your browser generates a Groth16 proof in about two seconds. It is bound to that one payment request, can prove you're 18 or older, and is checked by the backend before PayPal Sandbox checkout unlocks."
                points={[
                  "Groth16 proof generated in the browser",
                  "Bound to one payment challenge",
                  "Age check without the birth date",
                  "Nullifier stops replays",
                  "Server-side proof verification",
                  "PayPal capture checked by the backend",
                ]}
                cta={{ href: "/register", label: "Try a payment" }}
              >
                <div className="space-y-5">
                  <Screen src="/landing/accepted.webp" alt="Payment page after a valid proof: the Passport is stamped Proof accepted and PayPal checkout is unlocked." w={1342} h={840} label="Pay" />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Screen src="/landing/rejected.webp" alt="A proof made for a different payment is rejected and checkout stays locked." w={1342} h={1095} crop="h-[260px] sm:h-[300px]" />
                    <Screen src="/landing/receipt.webp" alt="PayPal Sandbox receipt: USD 7.50 captured, status COMPLETED, with the PayPal order and capture IDs." w={1420} h={940} crop="h-[260px] sm:h-[300px]" />
                  </div>
                </div>
              </Showcase>
            </div>
          </div>
        </section>

        {/* ---------- privacy statement ---------- */}
        <section id="privacy" className="scroll-mt-12 bg-[var(--lp-grey)] px-4 pb-20 sm:px-6 lg:pb-28">
          <Reveal className="mx-auto grid max-w-[1180px] items-center gap-10 bg-white px-6 py-12 sm:px-12 lg:grid-cols-[1.25fr_1fr] lg:py-16">
            <div>
              <p className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight">
                <Mark className="h-3.5 w-3.5" /> ZK Pass
              </p>
              <h2 className="mt-6 max-w-[20ch] text-[32px] sm:text-[40px]">
                &ldquo;Your documents are yours. Your proofs are enough.&rdquo;
              </h2>
              <p className="mt-5 max-w-[50ch] text-[15px] leading-relaxed text-[var(--lp-muted)]">
                The verifier receives cryptographic evidence of eligibility, not your identity documents, date of birth or
                holder secret.
              </p>
              <dl className="mt-8 grid max-w-[520px] grid-cols-2 gap-6 border-t border-black/10 pt-6 text-[13px]">
                <div>
                  <dt className="font-mono text-[11px] text-[var(--lp-muted)]">The verifier sees</dt>
                  <dd className="mt-2 leading-relaxed">Nullifier, revocation tag, issuer key, timestamp, payment challenge, verifier ID, today&apos;s date, minimum age</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] text-[var(--lp-muted)]">Stays with you</dt>
                  <dd className="mt-2 leading-relaxed">Name, date of birth, document number, credential ID, holder secret</dd>
                </div>
              </dl>
            </div>
            <div className="mx-auto aspect-square w-full max-w-[300px]">
              <PixelField variant="orb" gap={9} label="A dotted seal with a check mark" />
            </div>
          </Reveal>
        </section>

        {/* ---------- capabilities ---------- */}
        <section aria-labelledby="cap-title" className="bg-[var(--lp-grey)] px-4 pb-16 sm:px-6">
          <div className="relative mx-auto max-w-[1320px] overflow-hidden bg-[var(--lp-charcoal)] px-5 pb-14 pt-20 text-white sm:px-10 lg:pt-24">
            <div className="pointer-events-none absolute right-0 top-0 h-[120px] w-[180px] sm:h-[260px] sm:w-[460px]">
              <PixelField variant="spray" gap={10} />
            </div>
            <Reveal className="relative mx-auto max-w-[620px] text-center">
              <h2 id="cap-title" className="text-[32px] sm:text-[40px]">Built to make private payments actually work.</h2>
              <p className="mt-4 text-[14px] text-white/65">
                Identity checks, cryptography and PayPal&apos;s payment APIs, wired into one flow you can run on a laptop.
              </p>
              <a href={GITHUB} className="lp-btn lp-btn-white mt-6">Read the code <Arrow /></a>
            </Reveal>
            <div className="relative mt-14 grid gap-8 md:grid-cols-3 md:gap-6">
              {[
                {
                  img: "/landing/passport.webp", w: 1342, h: 660,
                  alt: "An issued ZK Passport credential.",
                  title: "Verify once, reuse everywhere",
                  body: "An issuer-signed credential, bound to a secret only your browser holds. Every payment reuses it without a new KYC check.",
                },
                {
                  img: "/landing/rejected.webp", w: 1342, h: 1095,
                  alt: "A rejected proof with the reason shown.",
                  title: "Cryptographic proof, not trust",
                  body: "Groth16 proofs checked server-side. Altered, stale, revoked, replayed or wrong-payment proofs keep checkout locked.",
                },
                {
                  img: "/landing/receipt.webp", w: 1420, h: 940,
                  alt: "A PayPal Sandbox capture receipt.",
                  title: "Real payment workflows",
                  body: "PayPal Orders checkout and capture, one-click repeat payments with Vault, refunds, and payouts to verified recipients.",
                },
              ].map((c, i) => (
                <Reveal key={c.title} delay={i * 90}>
                  <div className="h-[200px] overflow-hidden bg-[#2c2c2c] px-5 pt-5">
                    <Image src={c.img} alt={c.alt} width={c.w} height={c.h} sizes="(min-width: 768px) 400px, 100vw" className="w-full rounded-t-[4px] opacity-95" />
                  </div>
                  <h3 className="mt-5 text-[15px] font-medium">{c.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/60">{c.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- final call to action ---------- */}
        <section className="bg-[var(--lp-grey)] px-4 pb-20 sm:px-6">
          <Reveal className="relative mx-auto grid max-w-[1180px] overflow-hidden bg-[var(--lp-blue)] text-white md:grid-cols-[1fr_1fr]">
            <div className="relative z-10 px-6 py-14 sm:px-12 sm:py-16">
              <h2 className="max-w-[16ch] text-[32px] sm:text-[40px]">Your identity. Your control. Your proof.</h2>
              <p className="mt-4 max-w-[42ch] text-[14px] leading-relaxed text-white/85">
                Experience a different approach to identity verification and payment authorization.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link href="/register" className="lp-btn lp-btn-white">Try the demo <Arrow /></Link>
                <a href={GITHUB} className="lp-btn lp-btn-ghost">Explore GitHub</a>
              </div>
            </div>
            <div className="h-[180px] md:h-auto">
              <PixelField variant="stream" gap={10} />
            </div>
          </Reveal>
        </section>
      </main>

      {/* ---------- footer ---------- */}
      <footer className="bg-[var(--lp-charcoal)] text-white">
        <div className="mx-auto max-w-[1320px] px-4 pt-14 sm:px-6">
          <div className="flex flex-col justify-between gap-10 md:flex-row">
            <div>
              <p className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
                <Mark tone="white" /> ZK Pass
              </p>
              <p className="mt-4 font-serif text-[30px] leading-tight sm:text-[34px]">
                Verify once. <span className="text-[#8fa3ff]">Prove anywhere.</span>
              </p>
              <Link href="/register" className="lp-btn lp-btn-white mt-5">Try the demo <Arrow /></Link>
            </div>
            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-14 gap-y-1.5 text-[13px] text-white/75">
              <a href="#verify" className="hover:text-white">Verify</a>
              <a href={GITHUB} className="hover:text-white">GitHub</a>
              <a href="#passport" className="hover:text-white">Passport</a>
              <Link href="/login" className="hover:text-white">Sign in</Link>
              <a href="#pay" className="hover:text-white">Pay</a>
              <Link href="/register" className="hover:text-white">Create account</Link>
            </nav>
          </div>
          <div className="mt-12 h-[110px] sm:h-[200px] lg:h-[280px]">
            <PixelField variant="wordmark" text="ZK PASS" gap={9} label="ZK PASS" />
          </div>
          <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-[12px] text-white/50 sm:flex-row sm:justify-between">
            <p>© 2026 ZK Pass. Built for the PayPal AI Hackathon. MIT licensed.</p>
            <p>Independent hackathon prototype. Not affiliated with PayPal. Test data and PayPal Sandbox only.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
