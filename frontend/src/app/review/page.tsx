"use client";
import { useCallback, useEffect, useState } from "react";
import { ChecksList } from "@/components/ChecksList";
import { Shell } from "@/components/Shell";
import { Badge, ErrorNote, PageTitle } from "@/components/ui";
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

  if (user?.role !== "reviewer") return <ErrorNote>Only reviewer accounts can open the review queue.</ErrorNote>;

  return (
    <>
      <PageTitle
        title="Review queue"
        lead="Automated checks and an AI-written evidence summary help you decide. The decision, and responsibility for it, is yours."
      />
      <ErrorNote>{error}</ErrorNote>
      {queue === null ? (
        <p className="text-ink-soft">Loading…</p>
      ) : queue.length === 0 ? (
        <div className="panel p-6">
          <p className="font-semibold">Nothing waiting for review.</p>
          <button className="mt-3 btn btn-quiet" onClick={load}>Check again</button>
        </div>
      ) : (
        <ul className="space-y-6">
          {queue.map((s) => {
            const passed = s.checks.filter((c) => c.passed).length;
            return (
              <li key={s.id} className="panel p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-2xl font-semibold">{s.user.display_name}</h2>
                  <span className="text-ink-soft">{s.user.email}, submitted {s.completed_at ? new Date(s.completed_at).toLocaleString() : ""}</span>
                </div>
                <p className="mt-2">
                  <Badge tone={passed === s.checks.length ? "ok" : "bad"}>{passed} of {s.checks.length} checks passed</Badge>
                </p>
                <div className="mt-5 grid gap-6 lg:grid-cols-2">
                  <ChecksList checks={s.checks} />
                  <div>
                    <h3 className="font-display text-lg font-semibold">Evidence summary</h3>
                    <p className="text-sm text-ink-soft">Written by {s.ai_provider}. It describes the evidence and doesn&apos;t recommend a decision.</p>
                    <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-paper-deep p-4 text-[15px]">{s.ai_summary}</p>
                    <dl className="mt-3 text-sm">
                      <dt className="text-ink-soft">Declared</dt>
                      <dd>{s.declared?.full_name}, born {s.declared?.date_of_birth}</dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button className="btn" disabled={busy === s.id} onClick={() => decide(s.id, "approved")}>Approve</button>
                  <button className="btn btn-quiet" disabled={busy === s.id} onClick={() => decide(s.id, "rejected")}>Reject</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Shell>
      <Review />
    </Shell>
  );
}
