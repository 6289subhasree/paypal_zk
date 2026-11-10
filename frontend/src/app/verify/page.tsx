"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Badge, ErrorNote, PageTitle, Spinner } from "@/components/ui";
import { ChecksList } from "@/components/ChecksList";
import { LivenessCheck } from "@/components/LivenessCheck";
import { api, type KycSession } from "@/lib/api";

type Step = "welcome" | "details" | "document" | "liveness" | "submit";
const ORDER: Step[] = ["welcome", "details", "document", "liveness", "submit"];
const LABELS: Record<Step, string> = {
  welcome: "Consent",
  details: "Identity details",
  document: "Test document",
  liveness: "On-device liveness",
  submit: "Submission",
};

function Verify() {
  const [session, setSession] = useState<KycSession | null>(null);
  const [step, setStep] = useState<Step>("welcome");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ kyc: KycSession | null }>("/api/verification/status")
      .then(({ kyc }) => {
        if (kyc) {
          setSession(kyc);
          if (kyc.status !== "started") setStep("submit");
          else if (kyc.extracted && "ocr_chars" in kyc.extracted) setStep("liveness");
          else if (kyc.declared?.full_name) setStep("document");
          else setStep("details");
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }, []);

  const goto = (s: Step) => {
    setStep(s);
    if (session?.status === "started") {
      api<{ transcript: KycSession["transcript"] }>(`/api/kyc/sessions/${session.id}/chat`, { method: "POST", json: { step: s } })
        .then((r) => setSession((cur) => (cur ? { ...cur, transcript: r.transcript } : cur)))
        .catch(() => {});
    }
  };

  const submitted = session && session.status !== "started";
  if (!loaded) return <p className="text-ink-soft">Loading…</p>;

  return (
    <>
      <PageTitle
        title="Verify your identity"
        lead="A guided check using a test document. The assistant explains each step; a human reviewer makes the decision."
      />
      <ol className="mb-6 flex flex-wrap items-center gap-1.5" aria-label="Verification progress">
        {ORDER.map((s, i) => {
          const done = ORDER.indexOf(step) > i || submitted;
          const current = s === step && !submitted;
          return (
            <li key={s} className="flex items-center gap-1.5" aria-current={current ? "step" : undefined}>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] ${
                  current ? "bg-primary text-white" : done ? "bg-white text-approve ring-1 ring-line" : "bg-white/60 text-ink-soft ring-1 ring-line"
                }`}
              >
                <span className="font-mono text-[11px] opacity-80">{done && !current ? "✓" : String(i + 1).padStart(2, "0")}</span>
                {LABELS[s]}
              </span>
              {i < ORDER.length - 1 && <span className="hidden h-px w-3 bg-line-strong sm:block" aria-hidden />}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <section className="panel p-6 sm:p-7">
          <ErrorNote>{error}</ErrorNote>
          <div className={error ? "mt-4" : ""}>
            {step === "welcome" && !session && (
              <Consent busy={busy} onStart={() => run("Starting", async () => {
                const s = await api<KycSession>("/api/kyc/sessions", { method: "POST", json: { consent: true } });
                setSession(s);
                goto("details");
              })} />
            )}
            {step === "details" && session && (
              <Details session={session} busy={busy} onSave={(name, dob) => run("Saving", async () => {
                const s = await api<KycSession>(`/api/kyc/sessions/${session.id}/details`, { method: "POST", json: { full_name: name, date_of_birth: dob } });
                setSession(s);
                goto("document");
              })} />
            )}
            {step === "document" && session && (
              <DocumentStep session={session} busy={busy} onUpload={(file) => run("Reading document", async () => {
                const fd = new FormData();
                fd.append("file", file);
                setSession(await api<KycSession>(`/api/kyc/sessions/${session.id}/documents`, { method: "POST", body: fd }));
              })} onNext={() => goto("liveness")} />
            )}
            {step === "liveness" && session && (
              <LivenessCheck busy={busy} onDone={(result) => run("Submitting", async () => {
                await api(`/api/kyc/sessions/${session.id}/liveness`, { method: "POST", json: result });
                setSession(await api<KycSession>(`/api/kyc/sessions/${session.id}/complete`, { method: "POST" }));
                setStep("submit");
              })} />
            )}
            {step === "submit" && session && <Result session={session} onRestart={() => { setSession(null); setStep("welcome"); }} />}
          </div>
        </section>

        <Assistant session={session} step={step} onReply={(t) => setSession((s) => (s ? { ...s, transcript: t } : s))} />
      </div>
    </>
  );
}

function Consent({ busy, onStart }: { busy: string; onStart: () => void }) {
  const [agree, setAgree] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-[30px]">Before you start</h2>
      <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-ink-soft marker:text-primary">
        <li>Use one of the SPECIMEN test cards from the repo&apos;s <code>samples/</code> folder, never a real ID.</li>
        <li>The image is read in memory and discarded. Only masked fields and check results are kept.</li>
        <li>A short liveness check runs in your browser with your camera. Nothing is recorded or uploaded, and it isn&apos;t a certified check.</li>
        <li>An AI assistant helps you, but a human reviewer approves or rejects the session.</li>
      </ul>
      <label className="flex items-start gap-3 rounded-lg bg-paper-deep px-4 py-3">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--primary)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I agree to a demo verification using test data only.</span>
      </label>
      <button className="btn btn-accent" disabled={!agree || !!busy} onClick={onStart}>
        {busy ? <Spinner label={busy} /> : "Start verification"}
      </button>
    </div>
  );
}

function Details({ session, busy, onSave }: { session: KycSession; busy: string; onSave: (n: string, d: string) => void }) {
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      onSave(String(f.get("name")), String(f.get("dob")));
    }}>
      <h2 className="text-[30px]">Identity details</h2>
      <p className="text-[15px] text-ink-soft">Enter them exactly as printed on the test document.</p>
      <label className="block">
        <span className="label">Full name</span>
        <input name="name" required className="field" defaultValue={session.declared?.full_name ?? "Asha Verma"} />
      </label>
      <label className="block">
        <span className="label">Date of birth</span>
        <input name="dob" type="date" required className="field" defaultValue={session.declared?.date_of_birth ?? "1999-08-14"} />
      </label>
      <button className="btn btn-accent" disabled={!!busy}>{busy ? <Spinner label={busy} /> : "Save and continue"}</button>
    </form>
  );
}

function DocumentStep({ session, busy, onUpload, onNext }: { session: KycSession; busy: string; onUpload: (f: File) => void; onNext: () => void }) {
  const ex = session.extracted ?? {};
  const read = "ocr_chars" in ex;
  return (
    <div className="space-y-4">
      <h2 className="text-[30px]">Upload the test document</h2>
      <label className="block cursor-pointer rounded-xl border-2 border-dashed border-line-strong bg-paper-deep p-7 text-center transition-colors hover:border-primary hover:bg-brand-soft focus-within:ring-2 focus-within:ring-primary">
        <span className="btn pointer-events-none inline-flex">Choose file</span>
        <span className="mt-3 block font-medium">PNG, JPEG or WebP · SPECIMEN test cards only</span>
        <span className="mt-1 block text-sm text-ink-soft">
          Use <code className="font-mono text-[12px]">samples/specimen_pan_card.png</code>, or{" "}
          <code className="font-mono text-[12px]">mismatch_name_card.png</code> to see failed checks.
        </span>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
      </label>
      {busy && <Spinner label={busy} />}
      {read && (
        <dl className="reveal-in grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-charcoal p-5 font-mono text-[13px] text-white" aria-label="Fields read from the document">
          {[
            ["Name read", ex.full_name],
            ["Date of birth", ex.date_of_birth],
            ["Document type", ex.document_type],
            ["Number (masked)", ex.document_number_masked],
            ["SPECIMEN marker", ex.specimen_marker ? "Found" : "Missing"],
            ["Extraction", ex.extraction_method],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <dt className="text-[11px] text-white/50">{String(k)}</dt>
              <dd className={v ? "text-white" : "text-[#ff9b94]"}>{v ? String(v) : "Not found"}</dd>
            </div>
          ))}
        </dl>
      )}
      <button className="btn btn-accent" disabled={!read || !!busy} onClick={onNext}>Continue to liveness</button>
    </div>
  );
}

function Result({ session, onRestart }: { session: KycSession; onRestart: () => void }) {
  const tone = session.status === "approved" ? "ok" : session.status === "rejected" ? "bad" : "neutral";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-[30px]">Verification result</h2>
        <Badge tone={tone}>{session.status.replace("_", " ")}</Badge>
      </div>
      <ChecksList checks={session.checks} />
      {session.status === "needs_review" && <p className="text-ink-soft">A reviewer will look at your evidence summary. Refresh this page to see the decision.</p>}
      {session.status === "approved" && <Link href="/passport" className="btn">Issue your Passport</Link>}
      {session.status === "rejected" && <button className="btn" onClick={onRestart}>Start a new session</button>}
    </div>
  );
}

function Assistant({ session, step, onReply }: { session: KycSession | null; step: Step; onReply: (t: KycSession["transcript"]) => void }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const transcript = session?.transcript ?? [];
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [transcript.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !msg.trim()) return;
    setSending(true);
    try {
      const r = await api<{ transcript: KycSession["transcript"] }>(`/api/kyc/sessions/${session.id}/chat`, {
        method: "POST", json: { step, message: msg },
      });
      onReply(r.transcript);
      setMsg("");
    } finally {
      setSending(false);
    }
  }

  return (
    <aside className="flex max-h-[680px] flex-col overflow-hidden rounded-2xl bg-charcoal text-white" aria-label="Verification assistant">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[22px]">Assistant</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11px] text-white/75">{session?.ai_provider ?? "Starts with your session"}</span>
        </div>
        <p className="mt-2 rounded-md bg-white/5 px-2.5 py-1.5 text-[12px] text-white/70">
          AI guides and extracts evidence; a human reviewer approves. It can&apos;t approve you.
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
        {transcript.length === 0 && <p className="text-[14px] text-white/60">Start the session to chat with the assistant.</p>}
        {transcript.map((m, i) => (
          <p
            key={i}
            className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
              m.role === "assistant" ? "bg-white/[0.07] text-white/90" : "ml-auto bg-primary text-white"
            }`}
          >
            {m.content}
          </p>
        ))}
        {sending && (
          <p className="flex w-14 items-center justify-center gap-1 rounded-xl bg-white/[0.07] px-3 py-3" aria-label="Assistant is typing">
            {[0, 150, 300].map((d) => (
              <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
            ))}
          </p>
        )}
        <div ref={end} />
      </div>
      {session?.status === "started" && (
        <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
          <label className="sr-only" htmlFor="ask">Ask the assistant</label>
          <input
            id="ask"
            className="w-full rounded-[7px] border border-white/15 bg-white/5 px-3 py-2 text-[14px] text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
            placeholder="Ask about this step"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
          <button className="btn" disabled={sending || !msg.trim()}>Send</button>
        </form>
      )}
    </aside>
  );
}

export default function Page() {
  return (
    <Shell>
      <Verify />
    </Shell>
  );
}
