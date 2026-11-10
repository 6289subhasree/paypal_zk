"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Logo } from "./Logo";
import { ErrorNote } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  // Fill in one of the seeded demo accounts; the user still presses Sign in.
  function fillPersona(email: string) {
    const f = form.current;
    if (!f) return;
    (f.elements.namedItem("email") as HTMLInputElement).value = email;
    (f.elements.namedItem("password") as HTMLInputElement).value = DEMO_PASSWORD;
    (f.elements.namedItem("password") as HTMLInputElement).focus();
  }

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
    <div className="grid min-h-dvh place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-[15px] font-semibold tracking-tight">
          <Logo />
          ZK Pass
        </Link>
        <form ref={form} onSubmit={onSubmit} className="panel space-y-5 p-7 sm:p-8">
          <h1 className="text-[34px]">{mode === "login" ? "Sign in" : "Create your account"}</h1>
          {mode === "register" && (
            <label className="block">
              <span className="label">Display name</span>
              <input name="name" required maxLength={120} className="field" autoComplete="name" />
            </label>
          )}
          <label className="block">
            <span className="label">Email</span>
            <input name="email" type="email" required className="field" autoComplete="email" />
          </label>
          <label className="block">
            <span className="label">Password</span>
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
          <button className="btn btn-accent w-full justify-center" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
          <p className="text-center text-sm text-ink-soft">
            {mode === "login" ? (
              <>New here? <Link className="font-medium text-primary hover:underline" href="/register">Create an account</Link></>
            ) : (
              <>Have an account? <Link className="font-medium text-primary hover:underline" href="/login">Sign in</Link></>
            )}
          </p>
        </form>
        {mode === "login" && (
          <section aria-labelledby="personas" className="mt-4 rounded-xl border border-line bg-white/60 p-4">
            <h2 id="personas" className="font-mono text-[11px] font-normal tracking-normal text-ink-soft">
              Demo accounts
            </h2>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {PERSONAS.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => fillPersona(p.email)}
                  className="rounded-md bg-white px-2 py-2 text-left text-[13px] shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--primary)]"
                >
                  <span className="block font-medium">{p.role}</span>
                  <span className="block truncate font-mono text-[10.5px] text-ink-soft">{p.email}</span>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[12px] text-ink-soft">
              Pick one to fill the form (shared demo key: <code className="font-mono">{DEMO_PASSWORD}</code>). Available after running the seed command.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

const DEMO_PASSWORD = "zkpass-demo-123";
const PERSONAS = [
  { role: "Payer", email: "payer@zkpass.dev" },
  { role: "Merchant", email: "merchant@zkpass.dev" },
  { role: "Reviewer", email: "reviewer@zkpass.dev" },
];
