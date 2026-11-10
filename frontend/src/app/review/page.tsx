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
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; decision: "approved" | "rejected" } | null>(null);

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
      setConfirm(null);
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
          <p className="font-medium">Nothing waiting for review.</p>
          <button className="btn btn-quiet mt-3" onClick={load}>Check again</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead className="border-b border-line font-mono text-[11px] text-ink-soft">
                <tr>
                  <th className="px-4 py-2.5 font-normal">Declared name</th>
                  <th className="px-4 py-2.5 font-normal">Submitted</th>
                  <th className="px-4 py-2.5 font-normal">Document</th>
                  <th className="px-4 py-2.5 font-normal">Liveness</th>
                  <th className="px-4 py-2.5 font-normal">Checks</th>
                  <th className="px-4 py-2.5"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {queue.map((s) => {
                  const passed = s.checks.filter((c) => c.passed).length;
                  const live = s.checks.find((c) => c.name === "liveness");
                  const open = (openId ?? queue[0].id) === s.id;
                  return (
                    <tr key={s.id} className={open ? "bg-brand-soft/60" : ""}>
                      <td className="px-4 py-3 font-medium">{s.declared?.full_name ?? s.user.display_name}</td>
                      <td className="px-4 py-3 text-ink-soft">{s.completed_at ? new Date(s.completed_at).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">{String(s.extracted?.document_type ?? "—")}</td>
                      <td className="px-4 py-3">
                        {live ? <Badge tone={live.on_device ? "sandbox" : live.simulated ? "sim" : "neutral"}>{live.on_device ? "On-device" : live.simulated ? "Simulated" : "Missing"}</Badge> : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={passed === s.checks.length ? "ok" : "bad"}>{passed}/{s.checks.length}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-[13px] font-medium text-primary hover:underline" onClick={() => { setOpenId(s.id); setConfirm(null); }}>
                          {open ? "Inspecting" : "Inspect"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {queue.filter((s) => s.id === (openId ?? queue[0].id)).map((s) => {
            const passed = s.checks.filter((c) => c.passed).length;
            const ex = s.extracted ?? {};
            const rows: [string, string | undefined, string | undefined][] = [
              ["Full name", s.declared?.full_name, ex.full_name as string | undefined],
              ["Date of birth", s.declared?.date_of_birth, ex.date_of_birth as string | undefined],
            ];
            return (
              <section key={s.id} className="panel reveal-in p-6" aria-label={`Evidence for ${s.user.display_name}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-[30px]">{s.user.display_name}</h2>
                  <span className="text-[14px] text-ink-soft">{s.user.email}</span>
                </div>
                <p className="mt-2">
                  <Badge tone={passed === s.checks.length ? "ok" : "bad"}>{passed} of {s.checks.length} checks passed</Badge>
                </p>

                <div className="mt-6 overflow-hidden rounded-xl border border-line">
                  <table className="w-full text-left text-[14px]">
                    <thead className="bg-paper-deep font-mono text-[11px] text-ink-soft">
                      <tr>
                        <th className="px-4 py-2 font-normal">Field</th>
                        <th className="px-4 py-2 font-normal">Declared</th>
                        <th className="px-4 py-2 font-normal">Read by OCR</th>
                        <th className="px-4 py-2 font-normal"><span className="sr-only">Match</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rows.map(([k, d, o]) => {
                        const match = !!d && !!o && d.trim().toLowerCase() === o.trim().toLowerCase();
                        return (
                          <tr key={k}>
                            <td className="px-4 py-2.5 text-ink-soft">{k}</td>
                            <td className="px-4 py-2.5">{d ?? "—"}</td>
                            <td className="px-4 py-2.5 font-mono text-[13px]">{o ?? "Not found"}</td>
                            <td className="px-4 py-2.5 text-right"><Badge tone={match ? "ok" : "bad"}>{match ? "match" : "differs"}</Badge></td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td className="px-4 py-2.5 text-ink-soft">Document</td>
                        <td className="px-4 py-2.5 text-ink-soft">—</td>
                        <td className="px-4 py-2.5 font-mono text-[13px]">
                          {String(ex.document_type ?? "—")} · {String(ex.document_number_masked ?? "—")}
                        </td>
                        <td className="px-4 py-2.5 text-right"><Badge tone={ex.specimen_marker ? "ok" : "bad"}>{ex.specimen_marker ? "SPECIMEN" : "no marker"}</Badge></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <ChecksList checks={s.checks} />
                  <div>
                    <h3 className="text-[15px]">Evidence summary</h3>
                    <p className="text-[13px] text-ink-soft">Written by {s.ai_provider}. It describes the evidence and doesn&apos;t recommend a decision.</p>
                    <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-primary pl-4 font-serif text-[17px] leading-relaxed text-ink">
                      {s.ai_summary}
                    </blockquote>
                  </div>
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                  {confirm?.id === s.id ? (
                    <>
                      <span className="text-[14px]">
                        {confirm.decision === "approved" ? "Approve this session? The user can then issue a Passport." : "Reject this session? The user will have to start again."}
                      </span>
                      <button
                        className={confirm.decision === "approved" ? "btn btn-ok" : "btn btn-danger"}
                        disabled={busy === s.id}
                        onClick={() => decide(s.id, confirm.decision)}
                      >
                        {confirm.decision === "approved" ? "Yes, approve" : "Yes, reject"}
                      </button>
                      <button className="btn btn-quiet" disabled={busy === s.id} onClick={() => setConfirm(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-ok" onClick={() => setConfirm({ id: s.id, decision: "approved" })}>Approve session</button>
                      <button className="btn btn-danger" onClick={() => setConfirm({ id: s.id, decision: "rejected" })}>Reject session</button>
                    </>
                  )}
                </div>
              </section>
            );
          })}
        </div>
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
