"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ErrorNote, Spinner } from "./ui";

const DEMO_ACCOUNTS = [
  { role: "Payer", email: "payer@zkpass.dev", pass: "zkpass-demo-123", desc: "Test buyer with KYC" },
  { role: "Merchant", email: "merchant@zkpass.dev", pass: "zkpass-demo-123", desc: "Payment recipient" },
  { role: "Reviewer", email: "reviewer@zkpass.dev", pass: "zkpass-demo-123", desc: "KYC approvals queue" },
];

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function fillDemo(acc: typeof DEMO_ACCOUNTS[0]) {
    setEmail(acc.email);
    setPassword(acc.pass);
    setError("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
      router.push(next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[#EDEDF0] px-4 py-12">
      {/* Background ambient gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[360px] w-[800px] -translate-x-1/2 bg-gradient-to-b from-[#0018f2]/10 to-transparent blur-3xl" />
      </div>

      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200/90 bg-white p-7 shadow-[0_20px_50px_-20px_rgba(0,24,242,0.12)] sm:p-9">
        {/* Brand header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
            <div className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-[#0018f2] text-white shadow-xs">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2.5a1 1 0 0 1-.3.7L7.4 12.5a1 1 0 0 1-1.4 0L2.3 8.8A1 1 0 0 1 2 8.1V3z" />
              </svg>
            </div>
            <span className="font-sans text-[15px] font-bold tracking-tight text-[#111111]">ZK Pass</span>
          </Link>
          <span className="rounded-full border border-[#a9d5f5] bg-[#a9d5f5]/30 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#0018f2]">
            Sandbox
          </span>
        </div>

        <div className="mt-6 mb-6">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
            {mode === "login" ? "Sign in to ZK Pass" : "Create your account"}
          </h1>
          <p className="mt-1 font-sans text-xs text-neutral-500">
            {mode === "login"
              ? "Use a demo account or sign in with your email."
              : "Register a new identity holder or merchant test account."}
          </p>
        </div>

        {/* Quick Demo Accounts pills for fast review/demo */}
        {mode === "login" && (
          <div className="mb-6 rounded-xl border border-neutral-200/70 bg-[#FAFAFA] p-3">
            <div className="mb-2 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-wider text-neutral-500">
              <span>Quick Demo Autofill</span>
              <span className="text-[#0018f2]">1-Click</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className={`rounded-lg border px-2 py-1.5 text-center font-sans transition ${
                    email === acc.email
                      ? "border-[#0018f2] bg-[#0018f2] text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  <div className="text-[11px] font-semibold">{acc.role}</div>
                  <div className={`text-[9.5px] truncate ${email === acc.email ? "text-white/80" : "text-neutral-400"}`}>
                    {acc.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "register" && (
            <label className="block">
              <span className="mb-1 block font-sans text-xs font-semibold text-neutral-700">Display name</span>
              <input
                name="name"
                required
                maxLength={120}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="field"
                placeholder="Asha Verma"
                autoComplete="name"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block font-sans text-xs font-semibold text-neutral-700">Email address</span>
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="payer@zkpass.dev"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-sans text-xs font-semibold text-neutral-700">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              placeholder="••••••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {mode === "register" && (
              <span className="mt-1 block font-sans text-[11px] text-neutral-400">At least 8 characters.</span>
            )}
          </label>

          <ErrorNote>{error}</ErrorNote>

          <button
            type="submit"
            className="btn w-full justify-center bg-[#0018f2] py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#0014cc]"
            disabled={busy}
          >
            {busy ? <Spinner label="Authenticating" /> : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-6 border-t border-neutral-100 pt-4 text-center font-sans text-xs text-neutral-500">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <Link className="font-semibold text-[#0018f2] underline hover:text-[#0014cc]" href="/register">
                Create one now
              </Link>
            </>
          ) : (
            <>
              Already registered?{" "}
              <Link className="font-semibold text-[#0018f2] underline hover:text-[#0014cc]" href="/login">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
