import Link from "next/link";
import { FeatureIcon } from "@/components/FeatureIcon";
import { LandingPassport } from "@/components/LandingPassport";
import { Logo } from "@/components/Logo";

const FEATURES = [
  {
    icon: "shield" as const,
    title: "An AI-guided check, decided by a person",
    body: "An assistant walks you through a test-document check. OCR reads the card, liveness runs on your device, and a reviewer makes the call.",
  },
  {
    icon: "card" as const,
    title: "A passport only you can use",
    body: "The issuer signs a credential bound to a secret that never leaves your browser. It carries no name and no document number.",
  },
  {
    icon: "lock" as const,
    title: "Checkout that needs a proof",
    body: "Each payment gets a fresh zero-knowledge proof tied to that one request. Altered, stale, revoked or replayed proofs keep PayPal locked.",
  },
  {
    icon: "eighteen" as const,
    title: "18+ without your birthday",
    body: "When a merchant needs an adult, your proof shows you're old enough. Your date of birth stays with you.",
  },
  {
    icon: "bolt" as const,
    title: "One click next time",
    body: "Save PayPal with Vault on your first payment. After that, a fresh proof and one click pay, with no popup.",
  },
  {
    icon: "arrow" as const,
    title: "Payouts to verified people",
    body: "Platforms pay freelancers through PayPal Payouts, and the money only moves once the recipient proves they passed KYC.",
  },
];

const STEPS = [
  { who: "You", title: "Verify once", body: "Upload a SPECIMEN test card and finish the liveness prompts. A reviewer approves the session." },
  { who: "Issuer", title: "Get your Passport", body: "Your browser makes a secret; the issuer signs a credential bound to its hash." },
  { who: "Your browser", title: "Prove, per payment", body: "A Groth16 proof in about two seconds: signed, approved, unexpired, yours, and for this payment only." },
  { who: "PayPal", title: "Pay", body: "The proof unlocks Sandbox checkout. The backend captures and checks the payment before calling it paid." },
];

const SEES = ["One-time nullifier", "Revocation tag", "Issuer key (2 values)", "Timestamp", "Payment challenge", "Verifier ID", "Today's date", "Minimum age"];
const KEEPS = ["Your name", "Date of birth", "Document number", "Credential ID", "Holder secret"];

export default function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <section className="hero-gradient relative">
        <div className="hero-pattern pointer-events-none absolute inset-0" aria-hidden />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 text-white">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Logo />
            ZK Pass
          </span>
          <p className="hidden text-sm font-medium text-white/85 md:block">
            Private KYC for PayPal payments <span className="mx-2 text-white/40">|</span> ZK proofs · AI
          </p>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/10 sm:block">
              Sign in
            </Link>
            <Link href="/register" className="btn btn-accent py-2 text-sm">
              Get started
            </Link>
          </nav>
        </header>

        <div className="relative mx-auto flex min-h-[78svh] max-w-6xl flex-col items-center justify-center px-4 pb-28 pt-10 text-center text-white">
          <h1 className="text-[clamp(4.5rem,15vw,10rem)] font-semibold leading-[0.9] tracking-[-0.06em] drop-shadow-[0_6px_30px_rgba(0,28,100,0.35)]">
            ZK Pass
          </h1>
          <p className="mt-6 text-[clamp(1.25rem,2.4vw,1.6rem)] font-medium leading-snug tracking-[-0.02em]">
            Verify once. Prove anywhere.
            <br />
            Pay with PayPal.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn btn-accent px-5 py-3">Start verification</Link>
            <Link href="/login" className="btn btn-glass px-5 py-3">I have an account</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 lg:grid-cols-[1fr_1.05fr] [&>*]:min-w-0">
        <div>
          <h2 className="text-[clamp(2.2rem,4.4vw,3.4rem)] font-medium">Prove you passed KYC. Share nothing else.</h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
            Every new app asks for your ID again. With ZK Pass your browser sends a zero-knowledge proof instead,
            and only a valid proof made for this exact payment opens PayPal checkout.
          </p>
          <p className="mt-6 max-w-lg text-sm text-ink-soft">
            Hackathon prototype: test identity documents only, payments in PayPal Sandbox. It removes repeated
            identity disclosure; it doesn&apos;t speed up bank settlement.
          </p>
        </div>
        <LandingPassport />
      </section>

      <section className="bg-paper-deep">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <h2 className="max-w-3xl text-[clamp(2.2rem,4.4vw,3.4rem)] font-medium">
            One proof gate in front of everything PayPal does.
          </h2>
          <div className="mt-16 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <FeatureIcon kind={f.icon} />
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-24">
        <h2 className="text-[clamp(2.2rem,4.4vw,3.4rem)] font-medium">How a payment goes.</h2>
        <ol className="mt-12 divide-y divide-line border-y border-line">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid gap-2 py-6 sm:grid-cols-[4rem_10rem_1fr] sm:items-baseline sm:gap-6">
              <span className="font-mono text-sm text-ink-soft">0{i + 1}</span>
              <span>
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[13px] font-medium text-brand">{s.who}</span>
              </span>
              <span>
                <span className="block text-xl font-semibold tracking-[-0.02em]">{s.title}</span>
                <span className="mt-1 block text-ink-soft">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid overflow-hidden rounded-2xl border border-line md:grid-cols-2">
          <div className="bg-navy-deep p-8 text-white">
            <h3 className="text-2xl font-semibold">What the verifier receives</h3>
            <p className="mt-2 text-white/65">Nine public numbers and the proof. That&apos;s all.</p>
            <ul className="mt-6 grid grid-cols-2 gap-2 font-mono text-[13px]">
              {SEES.map((s) => (
                <li key={s} className="rounded-lg bg-white/8 px-3 py-2 ring-1 ring-white/15">{s}</li>
              ))}
            </ul>
          </div>
          <div className="bg-surface p-8">
            <h3 className="text-2xl font-semibold">What stays in your browser</h3>
            <p className="mt-2 text-ink-soft">Never sent to a merchant, never stored by the verifier.</p>
            <ul className="mt-6 grid grid-cols-2 gap-2 text-[15px]">
              {KEEPS.map((s) => (
                <li key={s} className="flex items-center gap-2 rounded-lg bg-paper-deep px-3 py-2">
                  <span aria-hidden className="text-approve">●</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="hero-gradient relative overflow-hidden">
        <div className="hero-pattern pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center text-white">
          <h2 className="text-[clamp(2.4rem,5vw,4rem)] font-semibold">Verify once.</h2>
          <p className="mt-3 text-lg text-white/85">Then let a proof do the talking at checkout.</p>
          <Link href="/register" className="btn btn-accent mt-8 px-5 py-3">Start verification</Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-soft">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <Logo dark />
            ZK Pass
          </span>
          <span>Independent hackathon prototype, not a PayPal product. Sandbox only, no real money.</span>
          <a href="https://github.com/6289subhasree/paypal_zk" className="font-medium text-brand hover:underline">
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
