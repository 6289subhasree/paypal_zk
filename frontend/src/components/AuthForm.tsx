"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Logo } from "./Logo";
import { ErrorNote } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await login(String(f.get("email")), String(f.get("password")));
      else await register(String(f.get("email")), String(f.get("password")), String(f.get("name")));
      router.push(next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hero-gradient relative grid min-h-dvh place-items-center px-4 py-10">
      <div className="hero-pattern pointer-events-none absolute inset-0" aria-hidden />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md space-y-5 rounded-2xl bg-surface p-8 shadow-[0_30px_80px_-30px_rgba(0,28,100,0.6)]"
      >
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Logo dark />
          ZK Pass
        </Link>
        <h1 className="text-3xl font-semibold">{mode === "login" ? "Sign in" : "Create your account"}</h1>
        {mode === "register" && (
          <label className="block">
            <span className="mb-1 block font-medium">Display name</span>
            <input name="name" required maxLength={120} className="field" autoComplete="name" />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block font-medium">Email</span>
          <input name="email" type="email" required className="field" autoComplete="email" />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="field"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {mode === "register" && <span className="mt-1 block text-sm text-ink-soft">At least 8 characters.</span>}
        </label>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn w-full justify-center py-3" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <p className="text-sm text-ink-soft">
          {mode === "login" ? (
            <>New here? <Link className="font-semibold text-brand underline" href="/register">Create an account</Link></>
          ) : (
            <>Have an account? <Link className="font-semibold text-brand underline" href="/login">Sign in</Link></>
          )}
        </p>
        {mode === "login" && (
          <p className="rounded-xl bg-paper-deep px-4 py-3 text-sm text-ink-soft">
            Demo accounts after running the seed command: payer@zkpass.dev, merchant@zkpass.dev and
            reviewer@zkpass.dev, password zkpass-demo-123.
          </p>
        )}
      </form>
    </div>
  );
}
