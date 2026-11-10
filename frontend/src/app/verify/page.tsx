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
  details: "Details",
  document: "Document",
  liveness: "Liveness",
  submit: "Verification",
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
  if (!loaded) {
    return (
      <div className="flex items-center gap-2 p-6 font-sans text-sm text-neutral-500">
        <Spinner label="Loading verification session" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageTitle
        title="Verify your identity"
        highlight="on-device"
        lead="A guided check using a test document and active liveness. The AI companion explains each check; a human reviewer approves or rejects the session."
      />

      {/* 5-step Horizontal Wizard Bar */}
      <nav aria-label="Verification progress">
        <ol className="flex flex-wrap items-center gap-2">
          {ORDER.map((s, i) => {
            const isCurrent = s === step;
            const isDone = ORDER.indexOf(step) > i || submitted;
            return (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-sans text-xs font-semibold transition ${
                    isCurrent
                      ? "bg-[#0018f2] text-white shadow-xs"
                      : isDone
                        ? "bg-[#e6f4ec] text-[#1a7f4b] border border-[#a3e0be]"
                        : "bg-white text-neutral-500 border border-neutral-200"
                  }`}
                >
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full font-mono text-[9.5px] ${
                      isCurrent ? "bg-white text-[#0018f2]" : isDone ? "bg-[#1a7f4b] text-white" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                  <span>{LABELS[s]}</span>
                </span>
                {i < ORDER.length - 1 && <span className="text-neutral-300 font-mono text-xs">→</span>}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid gap-8 xl:grid-cols-[1.3fr_1fr]">
        {/* Main Step Panel */}
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-7">
          <ErrorNote>{error}</ErrorNote>
          <div className={error ? "mt-4" : ""}>
            {step === "welcome" && !session && (
              <Consent
                busy={busy}
                onStart={() =>
                  run("Initializing session", async () => {
                    const s = await api<KycSession>("/api/kyc/sessions", { method: "POST", json: { consent: true } });
                    setSession(s);
                    goto("details");
                  })
                }
              />
            )}
            {step === "details" && session && (
              <Details
                session={session}
                busy={busy}
                onSave={(name, dob) =>
                  run("Saving details", async () => {
                    const s = await api<KycSession>(`/api/kyc/sessions/${session.id}/details`, {
                      method: "POST",
                      json: { full_name: name, date_of_birth: dob },
                    });
                    setSession(s);
                    goto("document");
                  })
                }
              />
            )}
            {step === "document" && session && (
              <DocumentStep
                session={session}
                busy={busy}
                onUpload={(file) =>
                  run("Processing OCR", async () => {
                    const fd = new FormData();
                    fd.append("file", file);
                    setSession(await api<KycSession>(`/api/kyc/sessions/${session.id}/documents`, { method: "POST", body: fd }));
                  })
                }
                onNext={() => goto("liveness")}
              />
            )}
            {step === "liveness" && session && (
              <LivenessCheck
                busy={busy}
                onDone={(result) =>
                  run("Finalizing KYC checks", async () => {
                    await api(`/api/kyc/sessions/${session.id}/liveness`, { method: "POST", json: result });
                    setSession(await api<KycSession>(`/api/kyc/sessions/${session.id}/complete`, { method: "POST" }));
                    setStep("submit");
                  })
                }
              />
            )}
            {step === "submit" && session && (
              <Result session={session} onRestart={() => { setSession(null); setStep("welcome"); }} />
            )}
          </div>
        </section>

        {/* AI Assistant Companion Sidebar */}
        <Assistant session={session} step={step} onReply={(t) => setSession((s) => (s ? { ...s, transcript: t } : s))} />
      </div>
    </div>
  );
}

function Consent({ busy, onStart }: { busy: string; onStart: () => void }) {
  const [agree, setAgree] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-[#0018f2] font-semibold">Step 01</span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#0018f2]" />
      </div>
      <h2 className="font-serif text-2xl font-bold text-neutral-900">Before you begin</h2>
      <ul className="space-y-2.5 font-sans text-xs sm:text-sm text-neutral-600">
        <li className="flex items-start gap-2">
          <span className="text-[#0018f2] font-bold">●</span>
          <span>Use one of the SPECIMEN test cards from the repository&apos;s <code>samples/</code> directory, never real government documents.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#0018f2] font-bold">●</span>
          <span>The document image is parsed in memory and discarded. Only masked fields and verification check results are retained.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#0018f2] font-bold">●</span>
          <span>A short on-device liveness check runs in your browser via MediaPipe. No video or biometric landmarks are uploaded.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#0018f2] font-bold">●</span>
          <span>An AI assistant answers questions and summarizes evidence, but human reviewers authorize the final approval.</span>
        </li>
      </ul>

      <div className="rounded-xl border border-neutral-200 bg-[#FAFAFA] p-3.5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#0018f2] focus:ring-[#0018f2]"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <span className="font-sans text-xs sm:text-sm text-neutral-800">
            I understand this is a hackathon prototype and agree to proceed using mock/test data only.
          </span>
        </label>
      </div>

      <button
        className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
        disabled={!agree || !!busy}
        onClick={onStart}
      >
        {busy ? <Spinner label={busy} /> : "Start verification"}
      </button>
    </div>
  );
}

function Details({ session, busy, onSave }: { session: KycSession; busy: string; onSave: (n: string, d: string) => void }) {
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave(String(f.get("name")), String(f.get("dob")));
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-[#0018f2] font-semibold">Step 02</span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#0018f2]" />
      </div>
      <h2 className="font-serif text-2xl font-bold text-neutral-900">Your details</h2>
      <p className="font-sans text-xs sm:text-sm text-neutral-600">
        Enter your details exactly as shown on the specimen test card for OCR cross-checking.
      </p>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block font-sans text-xs font-semibold text-neutral-700">Full name</span>
          <input
            name="name"
            required
            className="field"
            defaultValue={session.declared?.full_name ?? "Asha Verma"}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-sans text-xs font-semibold text-neutral-700">Date of birth</span>
          <input
            name="dob"
            type="date"
            required
            className="field"
            defaultValue={session.declared?.date_of_birth ?? "1999-08-14"}
          />
        </label>
      </div>

      <button
        className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
        disabled={!!busy}
      >
        {busy ? <Spinner label={busy} /> : "Save and continue"}
      </button>
    </form>
  );
}

function DocumentStep({
  session,
  busy,
  onUpload,
  onNext,
}: {
  session: KycSession;
  busy: string;
  onUpload: (f: File) => void;
  onNext: () => void;
}) {
  const ex = session.extracted ?? {};
  const read = "ocr_chars" in ex;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-[#0018f2] font-semibold">Step 03</span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#0018f2]" />
      </div>
      <h2 className="font-serif text-2xl font-bold text-neutral-900">Upload specimen document</h2>
      <p className="font-sans text-xs sm:text-sm text-neutral-600">
        Upload a test card image. Tesseract OCR parses the name, date of birth, document number, and checks for SPECIMEN watermark indicators.
      </p>

      <label className="group block cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 p-8 text-center transition hover:border-[#0018f2] hover:bg-[#FAFAFA]">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#a9d5f5]/30 text-[#0018f2] group-hover:scale-105 transition-transform">
          📄
        </div>
        <span className="mt-3 block font-sans text-sm font-semibold text-neutral-800">
          Select or drag test document image
        </span>
        <span className="mt-1 block font-sans text-xs text-neutral-500">
          PNG, JPEG, or WebP. Try <code>samples/specimen_pan_card.png</code> or <code>mismatch_name_card.png</code>.
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
        />
      </label>

      {busy && (
        <div className="rounded-xl border border-neutral-200 bg-[#FAFAFA] p-4 text-center">
          <Spinner label={busy} />
        </div>
      )}

      {read && (
        <div className="rounded-xl border border-neutral-200 bg-[#FAFAFA] p-4 space-y-3">
          <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            <span>OCR Extraction Results</span>
            <span className="text-[#1a7f4b]">Parsed</span>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-xs font-sans">
            {[
              ["Name read", ex.full_name],
              ["Date of birth", ex.date_of_birth],
              ["Document type", ex.document_type],
              ["Number (masked)", ex.document_number_masked],
              ["SPECIMEN marker", ex.specimen_marker ? "Found (Valid)" : "Missing"],
              ["Extraction method", ex.extraction_method],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg bg-white p-2.5 border border-neutral-200/70">
                <dt className="text-[11px] text-neutral-500 font-medium">{String(k)}</dt>
                <dd className="font-semibold text-neutral-900 mt-0.5">{v ? String(v) : "Not found"}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <button
        className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
        disabled={!read || !!busy}
        onClick={onNext}
      >
        Continue to liveness check →
      </button>
    </div>
  );
}

function Result({ session, onRestart }: { session: KycSession; onRestart: () => void }) {
  const tone = session.status === "approved" ? "ok" : session.status === "rejected" ? "bad" : "neutral";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-bold text-neutral-900">Verification Outcome</h2>
        <Badge tone={tone}>{session.status.replace("_", " ")}</Badge>
      </div>

      <ChecksList checks={session.checks} />

      {session.status === "needs_review" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 font-sans text-xs sm:text-sm text-amber-800">
          <div className="font-semibold">Pending Reviewer Evaluation</div>
          <p className="mt-1 text-amber-700">
            Your automated checks and AI evidence summary have been forwarded to the reviewer queue. Refresh once approved to issue your ZK Passport.
          </p>
        </div>
      )}

      {session.status === "approved" && (
        <div className="pt-2">
          <Link
            href="/passport"
            className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
          >
            Issue your ZK Passport →
          </Link>
        </div>
      )}

      {session.status === "rejected" && (
        <div className="pt-2">
          <button
            className="btn btn-quiet"
            onClick={onRestart}
          >
            Start a new session
          </button>
        </div>
      )}
    </div>
  );
}

function Assistant({
  session,
  step,
  onReply,
}: {
  session: KycSession | null;
  step: Step;
  onReply: (t: KycSession["transcript"]) => void;
}) {
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
        method: "POST",
        json: { step, message: msg },
      });
      onReply(r.transcript);
      setMsg("");
    } finally {
      setSending(false);
    }
  }

  return (
    <aside
      className="flex max-h-[640px] flex-col rounded-2xl border border-neutral-200/80 bg-white shadow-xs overflow-hidden"
      aria-label="Verification assistant"
    >
      <div className="border-b border-neutral-200/80 bg-[#FAFAFA] px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#0018f2]" />
            <h2 className="font-sans text-sm font-bold text-neutral-900">AI Companion</h2>
          </div>
          <span className="rounded bg-neutral-200/60 px-2 py-0.5 font-mono text-[10px] uppercase text-neutral-600">
            {session?.ai_provider ?? "Gemini AI"}
          </span>
        </div>
        <p className="mt-1 font-sans text-xs text-neutral-500">
          Guides and explains check requirements. Reviewers make final decisions.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 font-sans text-xs sm:text-[13px]" aria-live="polite">
        {transcript.length === 0 && (
          <div className="text-center py-8 text-neutral-400">
            Begin the verification session to interact with the assistant.
          </div>
        )}
        {transcript.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
              m.role === "assistant"
                ? "bg-[#a9d5f5]/30 text-neutral-900 border border-[#a9d5f5]/50"
                : "ml-auto bg-[#18181b] text-white"
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={end} />
      </div>

      {session?.status === "started" && (
        <form onSubmit={send} className="flex gap-2 border-t border-neutral-200/80 bg-white p-3">
          <input
            id="ask"
            className="field text-xs sm:text-sm"
            placeholder="Ask about this check step…"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
          <button
            type="submit"
            className="btn shrink-0 bg-[#0018f2] text-white hover:bg-[#0014cc] text-xs px-3.5"
            disabled={sending || !msg.trim()}
          >
            {sending ? "…" : "Send"}
          </button>
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
