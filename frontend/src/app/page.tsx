import Link from "next/link";
import { LandingPassport } from "@/components/LandingPassport";

export default function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="font-display text-2xl font-extrabold tracking-tight">ZK Pass</span>
        <nav className="flex gap-2">
          <Link href="/login" className="btn btn-quiet hidden sm:inline-flex">Sign in</Link>
          <Link href="/register" className="btn">Create account</Link>
        </nav>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-6 lg:grid-cols-[1fr_1.05fr] lg:pt-14">
        <section>
          <h1 className="text-5xl font-extrabold sm:text-6xl">Verify once. Prove anywhere. Pay faster.</h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            Finish an AI-guided identity check one time and get a signed credential. When a payment needs proof
            that you passed KYC, your browser sends a zero-knowledge proof instead of your documents, and only a
            valid, payment-bound proof opens PayPal checkout.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn">Start verification</Link>
            <Link href="/login" className="btn btn-quiet">I already have an account</Link>
          </div>
          <p className="mt-6 max-w-xl text-sm text-ink-soft">
            Hackathon prototype: identity checks use test documents and simulated liveness, and payments run in
            PayPal Sandbox. It doesn&apos;t speed up bank settlement; it removes repeated identity disclosure.
          </p>
        </section>
        <LandingPassport />
      </main>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
          {[
            ["Verify", "An AI assistant walks you through a test-document check. OCR reads the card, rules compare it with what you typed, and a person makes the call."],
            ["Passport", "An issuer signs a credential bound to a secret only your browser holds. It proves “KYC approved” without carrying your name or document number."],
            ["Pay", "Each payment gets a fresh proof tied to that exact request. Altered, expired, revoked or reused proofs keep checkout locked."],
          ].map(([title, body], i) => (
            <div key={title}>
              <h2 className="text-2xl font-bold">
                <span className="mr-2 text-teal">{i + 1}</span>
                {title}
              </h2>
              <p className="mt-2 text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
