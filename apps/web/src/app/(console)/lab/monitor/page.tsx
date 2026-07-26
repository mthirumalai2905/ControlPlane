"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";

export default function LabMonitorPage() {
  const { workspace } = useWorkspace();
  const monitor = useQuery({
    queryKey: ["lab-monitor", workspace?.id],
    queryFn: () => api.lab.monitor(workspace!.id),
    enabled: !!workspace,
    refetchInterval: 4000,
  });

  const data = monitor.data;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--faint)]">
            Feedback canvas
          </p>
          <h1 className="mt-1 font-heading text-3xl text-[var(--ink)]">Lab Monitor</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Start-to-end timeline of contests, agent memory, and lessons persisted in Postgres
            (Docker). Agents reuse judge + download feedback on the next run.
          </p>
        </div>
        <Link href="/arena" className="lab-btn">
          Open Lab
        </Link>
      </header>

      {monitor.isLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading monitor...</p>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-[var(--line)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--faint)]">Contests</p>
              <p className="mt-1 font-mono text-2xl tabular-nums">{data.contests.length}</p>
            </div>
            <div className="rounded-md border border-[var(--line)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--faint)]">Agent memories</p>
              <p className="mt-1 font-mono text-2xl tabular-nums">{data.memories.length}</p>
            </div>
            <div className="rounded-md border border-[var(--line)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--faint)]">Active lessons</p>
              <p className="mt-1 font-mono text-2xl tabular-nums">{data.lessons.length}</p>
            </div>
            <div className="rounded-md border border-[var(--line)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--faint)]">Recent events</p>
              <p className="mt-1 font-mono text-2xl tabular-nums">{data.events.length}</p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-md border border-[var(--line)]">
              <div className="border-b border-[var(--line)] px-4 py-3">
                <h2 className="text-sm font-medium text-[var(--ink)]">Agent memory</h2>
                <p className="text-[12px] text-[var(--muted)]">Wins, scores, downloads (learning state)</p>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="text-[var(--faint)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Agent</th>
                      <th className="px-3 py-2 font-medium">W/L</th>
                      <th className="px-3 py-2 font-medium">Avg</th>
                      <th className="px-3 py-2 font-medium">Rows</th>
                      <th className="px-3 py-2 font-medium">DL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.memories.map((m) => (
                      <tr key={m.agent_id} className="border-t border-[var(--line)]">
                        <td className="px-3 py-2">{m.agent_name || m.agent_id}</td>
                        <td className="px-3 py-2 font-mono">
                          {m.wins}/{m.losses}
                        </td>
                        <td className="px-3 py-2 font-mono">{m.avg_score}</td>
                        <td className="px-3 py-2 font-mono">{m.total_records}</td>
                        <td className="px-3 py-2 font-mono">{m.downloads}</td>
                      </tr>
                    ))}
                    {!data.memories.length ? (
                      <tr>
                        <td className="px-3 py-6 text-[var(--faint)]" colSpan={5}>
                          No memory yet. Complete a contest to seed the loop.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-md border border-[var(--line)]">
              <div className="border-b border-[var(--line)] px-4 py-3">
                <h2 className="text-sm font-medium text-[var(--ink)]">Lessons</h2>
                <p className="text-[12px] text-[var(--muted)]">Fed back into the next agent run</p>
              </div>
              <ul className="max-h-[360px] space-y-0 overflow-auto">
                {data.lessons.map((l, i) => (
                  <li key={`${l.agent_id}-${i}`} className="border-t border-[var(--line)] px-4 py-3">
                    <p className="font-mono text-[10px] uppercase text-[var(--faint)]">
                      {l.agent_id} - {l.source} - w{l.weight}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink)]">{l.lesson}</p>
                  </li>
                ))}
                {!data.lessons.length ? (
                  <li className="px-4 py-6 text-[13px] text-[var(--faint)]">No lessons stored yet.</li>
                ) : null}
              </ul>
            </div>
          </section>

          <section className="rounded-md border border-[var(--line)]">
            <div className="border-b border-[var(--line)] px-4 py-3">
              <h2 className="text-sm font-medium text-[var(--ink)]">Contest timeline</h2>
              <p className="text-[12px] text-[var(--muted)]">Persisted runs from start to finish</p>
            </div>
            <ul className="divide-y divide-[var(--line)]">
              {data.contests.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[var(--ink)]">{c.prompt}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--faint)]">
                      {c.status}
                      {c.phase ? ` - ${c.phase}` : ""}
                      {c.winner_id ? ` - winner ${c.winner_id}` : ""}
                      {c.task?.kind ? ` - ${c.task.kind}` : ""}
                    </p>
                  </div>
                  <Link href={`/arena?contest=${c.id}`} className="lab-btn-ghost shrink-0">
                    Open
                  </Link>
                </li>
              ))}
              {!data.contests.length ? (
                <li className="px-4 py-6 text-[13px] text-[var(--faint)]">No contests in Postgres yet.</li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-md border border-[var(--line)]">
            <div className="border-b border-[var(--line)] px-4 py-3">
              <h2 className="text-sm font-medium text-[var(--ink)]">Event stream</h2>
            </div>
            <ul className="max-h-[420px] overflow-auto font-mono text-[11px]">
              {data.events.map((e, i) => (
                <li key={`${e.ts}-${i}`} className="border-t border-[var(--line)] px-4 py-2 text-[var(--muted)]">
                  <span className="text-[var(--faint)]">{e.ts?.replace("T", " ").slice(0, 19)}</span>
                  {"  "}
                  <span className="text-[var(--ink)]">{e.event_type}</span>
                  {e.agent_id ? `  ${e.agent_id}` : ""}
                  {"  "}
                  {e.message}
                </li>
              ))}
              {!data.events.length ? (
                <li className="px-4 py-6 text-[var(--faint)]">No events yet.</li>
              ) : null}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
