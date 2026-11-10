"use client";
import { useCallback, useEffect, useState } from "react";
import { ChecksList } from "@/components/ChecksList";
import { Shell } from "@/components/Shell";
import { Badge, ErrorNote, PageTitle, Spinner } from "@/components/ui";
import { api, type KycSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type QueueItem = KycSession & { user: { id: string; display_name: string; email: string } };

function Review() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(() => {
    api<QueueItem[]>("/api/review/queue").then(setQueue).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function decide(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    setError("");
    try {
      await api(`/api/review/sessions/${id}/decision`, {
        method: "POST",
        json: { decision, reason_code: decision === "approved" ? "checks_confirmed" : "checks_failed" },
      });
      setQueue((q) => q?.filter((s) => s.id !== id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  if (user?.role !== "reviewer") {
    return (
      <div className="space-y-4">
        <PageTitle title="Reviewer Access Required" />
        <ErrorNote>
          Only reviewer accounts can access the verification approval queue. Switch to <code>reviewer@zkpass.dev</code> on the sign in page.
        </ErrorNote>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageTitle
        title="Review Queue"
        highlight="human-in-the-loop"
        lead="Automated OCR checks and AI-generated evidence summaries guide your decision. Final approval authority resides with human reviewers."
      />

      <ErrorNote>{error}</ErrorNote>

      {queue === null ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
          <Spinner label="Loading reviewer queue" />
        </div>
      ) : queue.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-8 text-center shadow-xs space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#e6f4ec] text-[#1a7f4b] font-bold">
            ✓
          </div>
          <h2 className="font-serif text-xl font-bold text-neutral-900">All submissions reviewed</h2>
          <p className="font-sans text-sm text-neutral-500 max-w-md mx-auto">
            There are no pending KYC sessions waiting for evaluation right now.
          </p>
          <button
            className="btn btn-quiet"
            onClick={load}
          >
            Check again
          </button>
        </div>
      ) : (
        <ul className="space-y-6">
          {queue.map((s) => {
            const passed = s.checks.filter((c) => c.passed).length;
            const allPassed = passed === s.checks.length;
            return (
              <li
                key={s.id}
                className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs sm:p-7 space-y-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-neutral-100 pb-4">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-neutral-900">{s.user.display_name}</h2>
                    <span className="font-mono text-xs text-neutral-500">{s.user.email}</span>
                  </div>
                  <div className="text-right font-sans text-xs text-neutral-500">
                    Submitted {s.completed_at ? new Date(s.completed_at).toLocaleString() : "Just now"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge tone={allPassed ? "ok" : "bad"}>
                    {passed} of {s.checks.length} checks passed
                  </Badge>
                  <span className="font-mono text-xs text-neutral-400">Session {s.id.slice(0, 8)}</span>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-2">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      Automated Checks List
                    </span>
                    <ChecksList checks={s.checks} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        AI Evidence Summary
                      </span>
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600">
                        {s.ai_provider}
                      </span>
                    </div>

                    <div className="rounded-xl border border-neutral-200/90 bg-[#FAFAFA] p-4 font-sans text-xs sm:text-[13px] leading-relaxed text-neutral-700 whitespace-pre-wrap">
                      {s.ai_summary}
                    </div>

                    <div className="rounded-xl border border-neutral-200/80 bg-white p-3 font-sans text-xs">
                      <div className="font-semibold text-neutral-900">Declared Identity Details</div>
                      <div className="text-neutral-600 mt-0.5">
                        {s.declared?.full_name}, born {s.declared?.date_of_birth}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-neutral-100">
                  <button
                    className="btn bg-[#0018f2] text-white hover:bg-[#0014cc] shadow-xs"
                    disabled={busy === s.id}
                    onClick={() => decide(s.id, "approved")}
                  >
                    {busy === s.id ? <Spinner label="Approving" /> : "Approve Session"}
                  </button>
                  <button
                    className="btn border border-[#cf3a31]/30 bg-[#fdecea] text-[#cf3a31] hover:bg-[#fbdcd9]"
                    disabled={busy === s.id}
                    onClick={() => decide(s.id, "rejected")}
                  >
                    Reject Session
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Review />
    </Shell>
  );
}
