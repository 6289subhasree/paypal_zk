"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
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
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <form onSubmit={onSubmit} className="panel w-full max-w-md space-y-5 p-8">
        <Link href="/" className="font-display text-xl font-extrabold">ZK Pass</Link>
        <h1 className="text-3xl font-bold">{mode === "login" ? "Sign in" : "Create your account"}</h1>
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
        <button className="btn w-full justify-center" disabled={busy}>
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
