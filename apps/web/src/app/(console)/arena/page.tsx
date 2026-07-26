"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArenaCharts } from "@/components/arena/ArenaCharts";
import { GoldMedal, ResultsPreview } from "@/components/arena/ResultsPreview";
import { api, type Contest, type SearchProviderId } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

type RightTab = "command" | "benchmark" | "results";
type SearchProvider = SearchProviderId;

function StatusDot({ tone }: { tone: "idle" | "live" | "done" | "err" }) {
  const color =
    tone === "live"
      ? "bg-emerald-500"
      : tone === "done"
        ? "bg-[var(--ink)]"
        : tone === "err"
          ? "bg-red-500"
          : "bg-[var(--faint)]";
  return (
    <span className={cn("inline-block h-1.5 w-1.5 rounded-full", color, tone === "live" && "animate-pulse")} />
  );
}

function ArenaInner() {
  const { workspace } = useWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const contestId = params.get("contest");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("command");
  const [message, setMessage] = useState("");
  const [spawnCount, setSpawnCount] = useState(3);
  const [provider, setProvider] = useState<SearchProvider>("searxng");
  const [prompt, setPrompt] = useState(
    "Scrape 50 Redfin and StreetEasy property listings in Brooklyn and return structured records",
  );
  const [localContest, setLocalContest] = useState<Contest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ["agents-status", workspace?.id],
    queryFn: () => api.agents.status(workspace!.id),
    enabled: !!workspace,
  });

  useEffect(() => {
    const sp = status.data?.search_provider;
    if (sp === "tavily" || sp === "firecrawl" || sp === "searxng") setProvider(sp);
  }, [status.data?.search_provider]);

  const contestQuery = useQuery({
    queryKey: ["contest", contestId],
    queryFn: () => api.contests.get(contestId!, workspace?.id),
    enabled: !!contestId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "running" || s === "pending" ? 1200 : false;
    },
  });

  const contest = localContest || contestQuery.data || null;

  useEffect(() => {
    if (contestQuery.data) setLocalContest(contestQuery.data);
  }, [contestQuery.data]);

  useEffect(() => {
    if (!contest?.runs?.length) return;
    if (!activeAgent || !contest.runs.some((r) => r.agent_id === activeAgent)) {
      setActiveAgent(contest.runs[0].agent_id);
    }
  }, [contest, activeAgent]);

  useEffect(() => {
    if (rightTab === "command") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [contest?.chat?.length, rightTab]);

  useEffect(() => {
    if (!contest) return;
    const hasScore = contest.runs?.some((r) => r.score != null);
    const hasRecords = contest.runs?.some((r) => (r.record_count || r.records?.length || 0) > 0);
    if (contest.status === "running" && hasScore) setRightTab("benchmark");
    if (contest.status === "completed") {
      setRightTab(hasRecords || contest.task?.kind === "property_scrape" ? "results" : "benchmark");
    }
  }, [contest?.id, contest?.status, contest?.runs, contest?.task?.kind]);

  const activeRun = useMemo(
    () => contest?.runs?.find((r) => r.agent_id === activeAgent) || null,
    [contest, activeAgent],
  );

  const start = useMutation({
    mutationFn: () =>
      api.contests.create({
        workspace_id: workspace!.id,
        prompt: prompt.trim(),
        agent_count: spawnCount,
        provider,
      }),
    onSuccess: (c) => {
      setLocalContest(c);
      setRightTab(c.task?.kind === "property_scrape" ? "results" : "benchmark");
      router.replace(`/arena?contest=${c.id}`);
      void qc.invalidateQueries({ queryKey: ["contest", c.id] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const chat = useMutation({
    mutationFn: (text: string) => api.contests.chat(contest!.id, workspace!.id, text),
    onSuccess: (c) => {
      setLocalContest(c);
      if (c.id !== contestId) router.replace(`/arena?contest=${c.id}`);
      if (c.status === "completed") {
        const hasRecords = c.runs?.some((r) => (r.record_count || r.records?.length || 0) > 0);
        setRightTab(hasRecords || c.task?.kind === "property_scrape" ? "results" : "benchmark");
      }
    },
    onError: (e: Error) => setError(e.message),
  });

  if (status.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--muted)]">
        Loading lab...
      </div>
    );
  }

  if (!status.data?.arena_ready) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-lg border border-[var(--line)] p-6">
          <p className="text-sm font-medium text-[var(--ink)]">Lab locked</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            Connect Tavily, Firecrawl, or free SearXNG from Agents first. That unlocks the Hermes contest lab.
          </p>
          <button type="button" className="lab-btn mt-4" onClick={() => router.push("/agents")}>
            Open Agents
          </button>
        </div>
      </div>
    );
  }

  const tone =
    contest?.status === "running" ? "live" : contest?.status === "completed" ? "done" : contest?.status === "failed" ? "err" : "idle";
  const tavilyOk = !!status.data?.tavily_connected;
  const firecrawlOk = !!status.data?.firecrawl_connected;
  const searxngOk = !!status.data?.searxng_connected;
  const providerReady =
    provider === "firecrawl" ? firecrawlOk : provider === "searxng" ? searxngOk : tavilyOk;
  const activeProviderLabel = contest?.provider || provider;
  const providerOptions: { id: SearchProvider; ok: boolean }[] = [
    { id: "searxng", ok: searxngOk },
    { id: "tavily", ok: tavilyOk },
    { id: "firecrawl", ok: firecrawlOk },
  ];

  return (
    <div className="lab-surface flex h-full min-h-0 flex-col">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-[var(--line)] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <StatusDot tone={tone} />
            <h1 className="text-[13px] font-medium text-[var(--ink)]">Agent Lab</h1>
          </div>
          <span className="hidden h-3 w-px bg-[var(--line)] sm:block" />
          <p className="hidden truncate text-[12px] text-[var(--muted)] sm:block">
            {contest
              ? contest.status === "running"
                ? `Running - ${contest.phase || "research"} - ${activeProviderLabel}`
                : contest.prompt
              : "Hermes harness - SearXNG / Tavily / Firecrawl"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!contest ? (
            <div className="hidden items-center rounded-md border border-[var(--line)] p-0.5 sm:flex">
              {providerOptions.map(({ id: p, ok }) => (
                <button
                  key={p}
                  type="button"
                  disabled={!ok}
                  onClick={() => setProvider(p)}
                  className={cn(
                    "rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition",
                      provider === p
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-35",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          ) : (
            <span className="hidden font-mono text-[10px] uppercase tracking-wide text-[var(--faint)] sm:inline">
              {activeProviderLabel}
            </span>
          )}
          <button type="button" className="lab-btn-ghost" onClick={() => router.push("/agents")}>
            Agents
          </button>
          {contest ? (
            <span className="hidden font-mono text-[11px] text-[var(--faint)] md:inline">
              {contest.id.slice(0, 8)}
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1.2fr_0.95fr]">
        {/* Browser pane */}
        <section className="flex min-h-0 flex-col border-r border-[var(--line)]">
          <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--page-bg-soft)]/40 px-2">
            {(contest?.runs?.length ? contest.runs : []).map((run) => {
              const active = activeAgent === run.agent_id;
              const winner = contest?.winner_id === run.agent_id;
              return (
                <button
                  key={run.agent_id}
                  type="button"
                  onClick={() => setActiveAgent(run.agent_id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition",
                    active
                      ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]",
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: run.color }} />
                  <span>{run.agent_name}</span>
                  {winner ? <GoldMedal /> : null}
                  {run.score != null ? (
                    <span className="font-mono text-[10px] text-[var(--faint)]">{run.score}</span>
                  ) : null}
                  {(run.record_count || 0) > 0 ? (
                    <span className="font-mono text-[10px] text-[var(--faint)]">{run.record_count} rows</span>
                  ) : null}
                </button>
              );
            })}
            {!contest?.runs?.length ? (
              <p className="px-2 text-[12px] text-[var(--faint)]">Browser tabs appear when agents run</p>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {!activeRun || activeRun.status === "queued" ? (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <div className="mb-3 flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--line)]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--line)]" />
                  <span className="h-2 w-2 rounded-full bg-[var(--line)]" />
                </div>
                <p className="text-sm font-medium text-[var(--ink)]">
                  {activeRun?.status === "queued" ? "Queued" : "Empty browser"}
                </p>
                <p className="mt-1 max-w-sm text-[13px] text-[var(--muted)]">
                  Start a contest from Command. Each agent opens sources via {activeProviderLabel} in this pane.
                </p>
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                {/* Fake browser chrome */}
                <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] px-3 py-2">
                  <div className="flex gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--line)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--line)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--line)]" />
                  </div>
                  <div className="min-w-0 flex-1 truncate rounded-md border border-[var(--line)] bg-[var(--page-bg-soft)]/50 px-3 py-1 font-mono text-[11px] text-[var(--muted)]">
                    {activeRun.query || "about:blank"}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[11px] tabular-nums text-[var(--ink)]">
                      {activeRun.score != null ? activeRun.score : activeRun.scoring_status === "scoring" ? "..." : "-"}
                    </p>
                    <p className="font-mono text-[10px] text-[var(--faint)]">{activeRun.duration_ms || 0}ms</p>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto p-4">
                  <div className="mb-4 rounded-md border border-[var(--line)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {contest?.winner_id === activeRun.agent_id ? <GoldMedal className="h-6 w-6 text-[13px]" /> : null}
                        <p className="text-[13px] font-medium text-[var(--ink)]">{activeRun.agent_name}</p>
                      </div>
                      <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--faint)]">
                        {activeRun.family} - {activeRun.status}
                        {(activeRun.record_count || 0) > 0 ? ` - ${activeRun.record_count} rows` : ""}
                      </p>
                    </div>
                    <pre className="max-h-36 overflow-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-[var(--muted)]">
                      {activeRun.answer || "Waiting for research output..."}
                    </pre>
                  </div>

                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--faint)]">
                    Sources - {activeRun.browser_pages.length}
                  </p>
                  <ul className="space-y-2">
                    {activeRun.browser_pages.map((page, i) => (
                      <li key={`${page.url}-${i}`}>
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-md border border-[var(--line)] px-3 py-2.5 transition hover:bg-[var(--page-bg-soft)]/60"
                        >
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 font-mono text-[10px] text-[var(--faint)]">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-[var(--ink)]">{page.title}</p>
                              <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--accent)]">{page.url}</p>
                              <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-[var(--muted)]">
                                {page.snippet}
                              </p>
                            </div>
                          </div>
                        </a>
                      </li>
                    ))}
                    {!activeRun.browser_pages.length ? (
                      <li className="py-6 text-center text-[13px] text-[var(--faint)]">
                        {activeRun.status === "running" ? "Fetching sources..." : "No sources yet"}
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Command / Benchmark */}
        <section className="relative flex min-h-0 flex-col bg-[var(--page-bg)]">
          <div className="pointer-events-none absolute inset-0 dot-grid opacity-[0.55]" aria-hidden />

          <div className="relative z-[1] flex h-10 shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--page-bg)]/80 px-3 backdrop-blur-sm">
            <div className="lab-seg">
              {(
                [
                  ["command", "Command"],
                  ["benchmark", "Benchmark"],
                  ["results", "Results"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  data-active={rightTab === id}
                  className="lab-seg-item"
                  onClick={() => setRightTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] text-[var(--faint)]">master</p>
          </div>

          {rightTab === "command" ? (
            <>
              {!contest ? (
                <div className="relative z-[1] shrink-0 space-y-3 border-b border-[var(--line)] bg-[var(--page-bg)]/75 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-medium text-[var(--ink)]">New contest</p>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-md border border-[var(--line)] p-0.5 sm:hidden">
                        {providerOptions.map(({ id: p, ok }) => (
                            <button
                              key={p}
                              type="button"
                              disabled={!ok}
                              onClick={() => setProvider(p)}
                              className={cn(
                                "rounded px-2 py-1 font-mono text-[10px] uppercase",
                                provider === p
                                  ? "bg-[var(--accent)] text-white"
                                  : "text-[var(--muted)] disabled:opacity-35",
                              )}
                            >
                              {p}
                            </button>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
                        Agents
                        <select
                          className="lab-input w-14 py-1"
                          value={spawnCount}
                          onChange={(e) => setSpawnCount(Number(e.target.value))}
                        >
                          {[2, 3, 4].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  <textarea
                    className="lab-input min-h-[84px] resize-none"
                    placeholder="Ask a research question..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <button
                    type="button"
                    className="lab-btn w-full"
                    disabled={start.isPending || prompt.trim().length < 3 || !providerReady}
                    onClick={() => {
                      setError(null);
                      start.mutate();
                    }}
                  >
                    {start.isPending ? "Starting..." : `Run ${spawnCount} agents - ${provider}`}
                  </button>
                </div>
              ) : null}

              <div className="relative z-[1] min-h-0 flex-1 space-y-1 overflow-auto px-3 py-3">
                {(contest?.chat || []).map((m, i) => (
                  <div
                    key={`${m.ts}-${i}`}
                    className={cn(
                      "rounded-md px-3 py-2 text-[13px] leading-relaxed",
                      m.role === "user"
                        ? "ml-6 bg-[var(--accent)] text-white"
                        : "mr-4 text-[var(--ink)]",
                    )}
                  >
                    <p
                      className={cn(
                        "mb-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
                        m.role === "user" ? "text-white/70" : "text-[var(--faint)]",
                      )}
                    >
                      {m.role === "hermes" ? "Hermes" : m.role}
                    </p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
                {!contest ? (
                  <p className="px-2 py-8 text-center text-[13px] text-[var(--faint)]">
                    Configure a contest above to begin.
                  </p>
                ) : null}
                <div ref={chatEndRef} />
              </div>

              <form
                className="relative z-[1] shrink-0 border-t border-[var(--line)] bg-[var(--page-bg)]/85 p-3 backdrop-blur-md"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!contest || !message.trim() || chat.isPending) return;
                  const text = message.trim();
                  setMessage("");
                  setError(null);
                  chat.mutate(text);
                }}
              >
                {error ? <p className="mb-2 text-[12px] text-[var(--danger)]">{error}</p> : null}
                <div className="flex items-center gap-2">
                  <input
                    className="lab-input flex-1"
                    placeholder={contest ? "Message Hermes..." : "Start a contest first"}
                    value={message}
                    disabled={!contest || chat.isPending}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="lab-btn"
                    disabled={!contest || chat.isPending || !message.trim()}
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : rightTab === "results" ? (
            <div className="relative z-[1] min-h-0 flex-1 overflow-hidden bg-[var(--page-bg)]/80 backdrop-blur-[2px]">
              <ResultsPreview
                contest={contest}
                activeAgentId={activeAgent}
                onSelectAgent={setActiveAgent}
              />
            </div>
          ) : (
            <div className="relative z-[1] min-h-0 flex-1 overflow-auto bg-[var(--page-bg)]/70 backdrop-blur-[2px]">
              <ArenaCharts contest={contest} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ArenaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-[13px] text-[var(--muted)]">
          Loading lab...
        </div>
      }
    >
      <ArenaInner />
    </Suspense>
  );
}
