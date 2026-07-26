"use client";

import { useMemo } from "react";
import type { Contest } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  contest: Contest | null;
};

function MetricBar({
  title,
  unit,
  rows,
}: {
  title: string;
  unit?: string;
  rows: { label: string; value: number; color: string; highlight?: boolean; pending?: boolean }[];
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-medium text-[var(--ink)]">{title}</h3>
        {unit ? <span className="font-mono text-[11px] text-[var(--faint)]">{unit}</span> : null}
      </div>
      <ul className="space-y-2.5">
        {rows.map((row) => {
          const pct = row.pending ? 6 : Math.max(3, (row.value / max) * 100);
          return (
            <li key={row.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-[12px]">
                <span className={cn("truncate", row.highlight ? "text-[var(--ink)]" : "text-[var(--muted)]")}>
                  {row.label}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-[var(--ink)]">
                  {row.pending ? "-" : Number.isInteger(row.value) ? row.value : row.value.toFixed(1)}
                </span>
              </div>
              <div className="h-[3px] overflow-hidden rounded-full bg-[var(--page-bg-soft)]">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", row.pending && "animate-pulse opacity-40")}
                  style={{ width: `${pct}%`, background: row.highlight ? "var(--ink)" : row.color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ArenaCharts({ contest }: Props) {
  const runs = contest?.runs ?? [];
  const winnerId = contest?.winner_id;
  const live = contest?.status === "running";

  const scoreRows = useMemo(
    () =>
      runs.map((r) => ({
        label: r.agent_name,
        value: Number(r.score ?? 0),
        color: r.color,
        highlight: r.agent_id === winnerId,
        pending: r.score == null && (r.scoring_status === "scoring" || r.scoring_status === "waiting" || live),
      })),
    [runs, winnerId, live],
  );

  const latencyRows = useMemo(
    () =>
      runs.map((r) => ({
        label: r.agent_name,
        value: r.duration_ms || 0,
        color: r.color,
        highlight: r.agent_id === winnerId,
        pending: r.status === "queued" || r.status === "running",
      })),
    [runs, winnerId],
  );

  const sourceRows = useMemo(
    () =>
      runs.map((r) => ({
        label: r.agent_name,
        value: r.browser_pages?.length ?? 0,
        color: r.color,
        highlight: r.agent_id === winnerId,
      })),
    [runs, winnerId],
  );

  if (!runs.length) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <div className="max-w-sm">
          <p className="text-sm font-medium text-[var(--ink)]">No run yet</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">
            Start a contest from Command. Benchmarks appear here as Hermes scores each agent.
          </p>
        </div>
      </div>
    );
  }

  const ranked = [...runs].sort((a, b) => Number(b.score ?? -1) - Number(a.score ?? -1));
  const winner = ranked.find((r) => r.agent_id === winnerId) || ranked.find((r) => r.score != null);
  const scoredCount = runs.filter((r) => r.score != null).length;

  return (
    <div className="space-y-8 p-5 md:p-6">
      <div className="flex items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--faint)]">
            {live ? `Live · ${contest?.phase || "running"}` : "Results"}
          </p>
          <p className="mt-1 font-heading text-xl text-[var(--ink)]">
            {winner?.score != null ? (
              <span className="inline-flex items-center gap-2">
                {winner.agent_id === winnerId ? (
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px]"
                    style={{
                      background: "linear-gradient(145deg,#f6e27a,#d4a017 45%,#f9e79f)",
                      color: "#5c4300",
                    }}
                  >
                    ★
                  </span>
                ) : null}
                {winner.agent_name}
              </span>
            ) : live ? (
              "Scoring…"
            ) : (
              "Pending"
            )}
          </p>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            {scoredCount}/{runs.length} scored
            {winner?.score != null ? ` · lead ${winner.score}` : ""}
          </p>
        </div>
        {winner?.score != null ? (
          <p className="font-mono text-3xl tabular-nums tracking-tight text-[var(--ink)]">{winner.score}</p>
        ) : null}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <MetricBar title="Score" unit="0-100" rows={scoreRows} />
        <MetricBar title="Latency" unit="ms" rows={latencyRows} />
        <MetricBar title="Sources" unit="tabs" rows={sourceRows} />
        <div className="space-y-3">
          <h3 className="text-[13px] font-medium text-[var(--ink)]">Standing</h3>
          <div className="overflow-hidden rounded-md border border-[var(--line)]">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[var(--page-bg-soft)]/60 text-[var(--faint)]">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Agent</th>
                  <th className="px-3 py-2 font-medium">Score</th>
                  <th className="px-3 py-2 font-medium">Rows</th>
                  <th className="px-3 py-2 font-medium">ms</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.agent_id} className="border-t border-[var(--line)]">
                    <td className="px-3 py-2 font-mono text-[var(--faint)]">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
                      {r.agent_name}
                      {r.agent_id === winnerId ? " ★" : ""}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {r.score != null ? r.score : r.scoring_status === "scoring" ? "…" : "-"}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums text-[var(--muted)]">
                      {r.record_count ?? r.records?.length ?? 0}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums text-[var(--muted)]">
                      {r.duration_ms || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {runs.some((r) => r.score_breakdown) ? (
        <div className="space-y-3">
          <h3 className="text-[13px] font-medium text-[var(--ink)]">Rubric</h3>
          <div className="grid gap-2">
            {runs
              .filter((r) => r.score_breakdown)
              .map((r) => (
                <div key={r.agent_id} className="rounded-md border border-[var(--line)] px-3 py-2.5">
                  <p className="mb-2 text-[12px] font-medium text-[var(--ink)]">{r.agent_name}</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(["relevance", "grounding", "clarity", "usefulness", "efficiency"] as const).map((k) => (
                      <div key={k} className="rounded bg-[var(--page-bg-soft)] px-1.5 py-1.5 text-center">
                        <p className="font-mono text-[10px] uppercase text-[var(--faint)]">{k.slice(0, 3)}</p>
                        <p className="font-mono text-[12px] tabular-nums text-[var(--ink)]">
                          {r.score_breakdown?.[k] ?? "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                  {r.judge_notes ? (
                    <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">{r.judge_notes}</p>
                  ) : null}
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {contest?.judge?.rationale ? (
        <div className="border-t border-[var(--line)] pt-5">
          <h3 className="text-[13px] font-medium text-[var(--ink)]">Verdict</h3>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
            {contest.judge.rationale}
          </p>
        </div>
      ) : null}
    </div>
  );
}
