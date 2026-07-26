"use client";

import { useMemo, useState } from "react";
import { api, type AgentRun, type Contest } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  contest: Contest | null;
  activeAgentId: string | null;
  onSelectAgent: (id: string) => void;
};

function GoldMedal({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]", className)}
      title="Winner"
      aria-label="Gold medal"
      style={{
        background: "linear-gradient(145deg,#f6e27a,#d4a017 45%,#f9e79f)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 2px rgba(0,0,0,0.15)",
        color: "#5c4300",
      }}
    >
      ★
    </span>
  );
}

export function ResultsPreview({ contest, activeAgentId, onSelectAgent }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const runs = contest?.runs ?? [];
  const winnerId = contest?.winner_id;

  const active: AgentRun | null = useMemo(() => {
    if (!runs.length) return null;
    return runs.find((r) => r.agent_id === activeAgentId) || runs[0];
  }, [runs, activeAgentId]);

  const records = active?.records || [];
  const columns =
    active?.record_columns?.length
      ? active.record_columns
      : records[0]
        ? Object.keys(records[0])
        : [];
  const preview = records.slice(0, 25);

  if (!contest) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">No results yet</p>
          <p className="mt-1 max-w-sm text-[13px] text-[var(--muted)]">
            Run a scrape contest like &quot;scrape 50 Redfin and StreetEasy listings in Brooklyn&quot;.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-[var(--line)] px-3 py-2">
        {runs.map((run) => {
          const activeTab = active?.agent_id === run.agent_id;
          const isWinner = winnerId === run.agent_id;
          return (
            <button
              key={run.agent_id}
              type="button"
              onClick={() => {
                setConfirmed(false);
                onSelectAgent(run.agent_id);
              }}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition",
                activeTab
                  ? "bg-[var(--page-bg-soft)] font-medium text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]",
              )}
            >
              {isWinner ? <GoldMedal /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: run.color }} />}
              <span>{run.agent_name}</span>
              <span className="font-mono text-[10px] text-[var(--faint)]">{run.record_count ?? records.length ?? 0}</span>
            </button>
          );
        })}
      </div>

      {!active || !(active.record_count || records.length) ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">
              {contest.status === "running" ? "Collecting records…" : "No structured records"}
            </p>
            <p className="mt-1 max-w-sm text-[13px] text-[var(--muted)]">
              {contest.task?.kind === "property_scrape"
                ? `Target ${contest.task.target_count || 50} listings. Preview appears when an agent finishes extraction.`
                : "This contest did not produce a tabular dataset. Try a scrape prompt."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {winnerId === active.agent_id ? <GoldMedal className="h-6 w-6 text-[13px]" /> : null}
                <p className="truncate text-[13px] font-medium text-[var(--ink)]">{active.agent_name}</p>
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                Preview {preview.length} of {records.length} records
                {winnerId === active.agent_id ? " · contest winner" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!confirmed ? (
                <button type="button" className="lab-btn" onClick={() => setConfirmed(true)}>
                  Review & download
                </button>
              ) : (
                <>
                  <button type="button" className="lab-btn-ghost" onClick={() => setConfirmed(false)}>
                    Back
                  </button>
                  <a
                    className="lab-btn"
                    href={api.contests.exportCsvUrl(contest.id, active.agent_id)}
                    download
                  >
                    Download CSV
                  </a>
                </>
              )}
            </div>
          </div>

          {confirmed ? (
            <div className="shrink-0 border-b border-[var(--line)] bg-[var(--page-bg-soft)]/50 px-4 py-3 text-[12px] text-[var(--muted)]">
              Ready to export <span className="font-mono text-[var(--ink)]">{records.length}</span> rows
              as CSV from {active.agent_name}. Confirm download when the preview looks right.
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="min-w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-[var(--page-bg)] text-[var(--faint)]">
                <tr className="border-b border-[var(--line)]">
                  <th className="px-3 py-2 font-medium">#</th>
                  {columns.map((col) => (
                    <th key={col} className="whitespace-nowrap px-3 py-2 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--line)]/70 hover:bg-[var(--page-bg-soft)]/40">
                    <td className="px-3 py-2 font-mono text-[var(--faint)]">{i + 1}</td>
                    {columns.map((col) => (
                      <td key={col} className="max-w-[220px] truncate px-3 py-2 text-[var(--ink)]">
                        {col === "url" && row[col] ? (
                          <a
                            href={row[col]}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--accent)] hover:underline"
                          >
                            {row[col]}
                          </a>
                        ) : (
                          row[col] || "-"
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length > preview.length ? (
              <p className="px-4 py-3 text-[12px] text-[var(--faint)]">
                Showing first {preview.length} rows. Full set is included in the CSV download.
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export { GoldMedal };
