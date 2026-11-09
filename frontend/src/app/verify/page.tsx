"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Shell } from "@/components/Shell";
import { Badge, ErrorNote, PageTitle, Spinner } from "@/components/ui";
import { ChecksList } from "@/components/ChecksList";
import { api, type KycSession } from "@/lib/api";

type Step = "welcome" | "details" | "document" | "liveness" | "submit";
const ORDER: Step[] = ["welcome", "details", "document", "liveness", "submit"];
const LABELS: Record<Step, string> = {
  welcome: "Consent",
  details: "Your details",
  document: "Test document",
  liveness: "Liveness",
  submit: "Submit",
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
      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Verification progress">
        {ORDER.map((s, i) => {
          const done = ORDER.indexOf(step) > i || submitted;
          return (
            <li key={s}>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${s === step ? "bg-ink text-paper" : done ? "bg-approve-soft text-approve" : "bg-paper-deep text-ink-soft"}`}>
                {i + 1}. {LABELS[s]}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <section className="panel p-6">
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
              <Liveness busy={busy} onDone={() => run("Submitting", async () => {
                await api(`/api/kyc/sessions/${session.id}/liveness`, { method: "POST" });
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
      <h2 className="text-2xl font-bold">Before you start</h2>
      <ul className="list-disc space-y-1 pl-5 text-ink-soft">
        <li>Use one of the SPECIMEN test cards from the repo&apos;s <code>samples/</code> folder, never a real ID.</li>
        <li>The image is read in memory and discarded. Only masked fields and check results are kept.</li>
        <li>Liveness is simulated in this demo. No face or voice analysis happens.</li>
        <li>An AI assistant helps you, but a human reviewer approves or rejects the session.</li>
      </ul>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1.5 h-4 w-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I agree to a demo verification using test data only.</span>
      </label>
      <button className="btn" disabled={!agree || !!busy} onClick={onStart}>
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
      <h2 className="text-2xl font-bold">Your details</h2>
      <p className="text-ink-soft">Enter them exactly as printed on the test document.</p>
      <label className="block">
        <span className="mb-1 block font-medium">Full name</span>
        <input name="name" required className="field" defaultValue={session.declared?.full_name ?? "Asha Verma"} />
      </label>
      <label className="block">
        <span className="mb-1 block font-medium">Date of birth</span>
        <input name="dob" type="date" required className="field" defaultValue={session.declared?.date_of_birth ?? "1999-08-14"} />
      </label>
      <button className="btn" disabled={!!busy}>{busy ? <Spinner label={busy} /> : "Save and continue"}</button>
    </form>
  );
}

function DocumentStep({ session, busy, onUpload, onNext }: { session: KycSession; busy: string; onUpload: (f: File) => void; onNext: () => void }) {
  const ex = session.extracted ?? {};
  const read = "ocr_chars" in ex;
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Upload the test document</h2>
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-line p-6 text-center hover:bg-paper-deep focus-within:ring-2">
        <span className="btn pointer-events-none inline-flex">Choose file</span>
        <span className="mt-3 block font-semibold">PNG, JPEG or WebP</span>
        <span className="mt-1 block text-sm text-ink-soft">Try samples/specimen_pan_card.png, or mismatch_name_card.png to see failed checks.</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
      </label>
      {busy && <Spinner label={busy} />}
      {read && (
        <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-paper-deep p-4 text-[15px]">
          {[
            ["Name read", ex.full_name],
            ["Date of birth", ex.date_of_birth],
            ["Document type", ex.document_type],
            ["Number (masked)", ex.document_number_masked],
            ["SPECIMEN marker", ex.specimen_marker ? "Found" : "Missing"],
            ["Extraction", ex.extraction_method],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <dt className="text-sm text-ink-soft">{String(k)}</dt>
              <dd className="font-semibold">{v ? String(v) : "Not found"}</dd>
            </div>
          ))}
        </dl>
      )}
      <button className="btn" disabled={!read || !!busy} onClick={onNext}>Continue to liveness</button>
    </div>
  );
}

function Liveness({ busy, onDone }: { busy: string; onDone: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [camera, setCamera] = useState<"off" | "on" | "denied">("off");

  useEffect(() => {
    const v = video.current;
    return () => {
      (v?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (video.current) video.current.srcObject = stream;
      setCamera("on");
    } catch {
      setCamera("denied");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold">Liveness</h2>
        <Badge tone="sim">Simulated</Badge>
      </div>
      <p className="text-ink-soft">
        A real deployment would use a certified liveness SDK. Here the camera preview stays on your device: nothing is
        recorded, uploaded or analysed.
      </p>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink">
        <video ref={video} autoPlay playsInline muted className="h-full w-full object-cover" />
        {camera !== "on" && (
          <div className="absolute inset-0 grid place-items-center p-4 text-center text-paper">
            {camera === "denied" ? "Camera unavailable. You can still complete the simulated step." : "Camera preview is off."}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {camera !== "on" && <button className="btn btn-quiet" onClick={startCamera}>Turn on camera preview</button>}
        <button className="btn" disabled={!!busy} onClick={onDone}>
          {busy ? <Spinner label={busy} /> : "Complete simulated liveness and submit"}
        </button>
      </div>
    </div>
  );
}

function Result({ session, onRestart }: { session: KycSession; onRestart: () => void }) {
  const tone = session.status === "approved" ? "ok" : session.status === "rejected" ? "bad" : "neutral";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">Verification result</h2>
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
    <aside className="panel flex max-h-[640px] flex-col" aria-label="Verification assistant">
      <div className="border-b border-line px-5 py-3">
        <h2 className="font-display text-lg font-bold">Assistant</h2>
        <p className="text-sm text-ink-soft">{session?.ai_provider ?? "Starts when you begin a session"}. It guides and explains; it can&apos;t approve you.</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
        {transcript.length === 0 && <p className="text-ink-soft">Start the session to chat with the assistant.</p>}
        {transcript.map((m, i) => (
          <p key={i} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 ${m.role === "assistant" ? "bg-teal-soft" : "ml-auto bg-ink text-paper"}`}>
            {m.content}
          </p>
        ))}
        <div ref={end} />
      </div>
      {session?.status === "started" && (
        <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
          <label className="sr-only" htmlFor="ask">Ask the assistant</label>
          <input id="ask" className="field" placeholder="Ask about this step" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <button className="btn" disabled={sending || !msg.trim()}>{sending ? "…" : "Send"}</button>
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
