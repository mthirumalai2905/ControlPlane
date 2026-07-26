"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, type SearchProviderId } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";

type SearchProvider = SearchProviderId;

export default function AgentsMarketplacePage() {
  const { workspace } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const [agentCount, setAgentCount] = useState(3);
  const [selected, setSelected] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("What are the latest breakthroughs in AI agents?");
  const [provider, setProvider] = useState<SearchProvider>("searxng");
  const [providerTouched, setProviderTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ["agents-status", workspace?.id],
    queryFn: () => api.agents.status(workspace!.id),
    enabled: !!workspace,
    refetchInterval: 8_000,
  });

  const agents = status.data?.agents ?? [];
  const tavilyOk = !!(status.data?.tavily_connected || status.data?.providers?.tavily?.connected);
  const firecrawlOk = !!(
    status.data?.firecrawl_connected || status.data?.providers?.firecrawl?.connected
  );
  const searxngOk = !!(
    status.data?.searxng_connected || status.data?.providers?.searxng?.connected
  );
  const ready = !!status.data?.arena_ready || tavilyOk || firecrawlOk || searxngOk;
  const providerReady =
    provider === "firecrawl" ? firecrawlOk : provider === "searxng" ? searxngOk : tavilyOk;

  useEffect(() => {
    if (providerTouched || !status.data) return;
    const sp = status.data.search_provider;
    if (sp === "tavily" || sp === "firecrawl" || sp === "searxng") {
      setProvider(sp);
      return;
    }
    if (searxngOk) setProvider("searxng");
    else if (tavilyOk) setProvider("tavily");
    else if (firecrawlOk) setProvider("firecrawl");
  }, [status.data, providerTouched, searxngOk, tavilyOk, firecrawlOk]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const effectiveIds = useMemo(() => {
    if (selected.length >= 2) return selected;
    return agents.slice(0, agentCount).map((a) => a.id);
  }, [selected, agents, agentCount]);

  const connectTavily = useMutation({
    mutationFn: () => api.agents.connectTavily(workspace!.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agents-status"] });
      void qc.invalidateQueries({ queryKey: ["servers"] });
      setProvider("tavily");
      setProviderTouched(true);
    },
    onError: (e: Error) => setError(e.message),
  });

  const connectFirecrawl = useMutation({
    mutationFn: () => api.agents.connectFirecrawl(workspace!.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agents-status"] });
      void qc.invalidateQueries({ queryKey: ["servers"] });
      setProvider("firecrawl");
      setProviderTouched(true);
    },
    onError: (e: Error) => setError(e.message),
  });

  const connectSearxng = useMutation({
    mutationFn: () => api.agents.connectSearxng(workspace!.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agents-status"] });
      void qc.invalidateQueries({ queryKey: ["servers"] });
      setProvider("searxng");
      setProviderTouched(true);
    },
    onError: (e: Error) => setError(e.message),
  });

  const startContest = useMutation({
    mutationFn: () =>
      api.contests.create({
        workspace_id: workspace!.id,
        prompt,
        agent_count: effectiveIds.length,
        agent_ids: effectiveIds,
        provider,
      }),
    onSuccess: (contest) => {
      router.push(`/arena?contest=${contest.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const providers: {
    id: SearchProvider;
    title: string;
    blurb: string;
    ok: boolean;
    connect?: () => void;
    pending?: boolean;
  }[] = [
    {
      id: "searxng",
      title: "SearXNG",
      blurb: searxngOk ? "Connected (free)" : "Free - docker on :8080",
      ok: searxngOk,
      connect: () => connectSearxng.mutate(),
      pending: connectSearxng.isPending,
    },
    {
      id: "tavily",
      title: "Tavily",
      blurb: tavilyOk ? "Connected" : "Uses TAVILY_API_KEY",
      ok: tavilyOk,
      connect: () => connectTavily.mutate(),
      pending: connectTavily.isPending,
    },
    {
      id: "firecrawl",
      title: "Firecrawl",
      blurb: firecrawlOk ? "Connected" : "Uses FIRECRAWL_API_KEY",
      ok: firecrawlOk,
      connect: () => connectFirecrawl.mutate(),
      pending: connectFirecrawl.isPending,
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--faint)]">
          Hermes harness - Phase 0
        </p>
        <h1 className="mt-1 font-display text-4xl text-[var(--ink)]">Agent Marketplace</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Connect SearXNG (free), Tavily, or Firecrawl. Toggle the provider per run to control
          credit spend.
        </p>
      </header>

      <section className="panel rounded-2xl p-5 space-y-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
            Research connectors
          </p>
          <h2 className="font-heading text-xl text-[var(--ink)]">SearXNG - Tavily - Firecrawl</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {ready
              ? "At least one provider is ready. Toggle below before spawning."
              : "Start with free SearXNG (docker compose up searxng), or connect a paid key."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {providers.map((p) => (
            <div key={p.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-heading text-lg text-[var(--ink)]">{p.title}</p>
                  <p className="text-xs text-[var(--muted)]">{p.blurb}</p>
                </div>
                {p.ok ? (
                  <span className="font-mono text-[10px] uppercase text-[var(--ok)]">ready</span>
                ) : (
                  <button
                    type="button"
                    className="console-btn-accent"
                    disabled={!workspace || p.pending}
                    onClick={() => {
                      setError(null);
                      p.connect?.();
                    }}
                  >
                    {p.pending ? "Connecting..." : "Connect"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">Active provider</p>
            <p className="text-xs text-[var(--muted)]">
              Prefer SearXNG when you want zero search credits.
            </p>
          </div>
          <div className="flex rounded-lg border border-[var(--line)] bg-[var(--page-bg-soft)] p-0.5">
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!p.ok}
                onClick={() => {
                  setProvider(p.id);
                  setProviderTouched(true);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs capitalize transition",
                  provider === p.id
                    ? "bg-[var(--accent)] font-medium text-white"
                    : "text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-40",
                )}
              >
                {p.id}
              </button>
            ))}
          </div>
        </div>

        {ready ? (
          <button type="button" className="console-btn" onClick={() => router.push("/arena")}>
            Open arena
          </button>
        ) : null}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl text-[var(--ink)]">Contest roster</h2>
            <p className="text-sm text-[var(--muted)]">Select 2-4 agents, or set a spawn count.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            Spawn
            <select
              className="console-input w-20 py-1.5"
              value={agentCount}
              onChange={(e) => {
                setSelected([]);
                setAgentCount(Number(e.target.value));
              }}
            >
              {[2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {agents.map((agent) => {
            const on = effectiveIds.includes(agent.id);
            return (
              <li key={agent.id}>
                <button
                  type="button"
                  onClick={() => toggle(agent.id)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition",
                    on
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)] ring-1 ring-[var(--accent)]/40"
                      : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)]",
                  )}
                >
                  <span
                    className="mb-3 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: agent.color }}
                  />
                  <p className="font-heading text-lg text-[var(--ink)]">{agent.name}</p>
                  <p className={cn("mt-1 text-xs", on ? "text-[var(--accent)]" : "text-[var(--faint)]")}>
                    {agent.family} - {agent.style}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{agent.tagline}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel rounded-2xl p-5 space-y-4">
        <h2 className="font-heading text-xl text-[var(--ink)]">Start contest</h2>
        <textarea
          className="console-input min-h-[96px] resize-y"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Research question for the agents..."
        />
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="console-btn-accent"
            disabled={
              !providerReady || !workspace || startContest.isPending || prompt.trim().length < 3
            }
            onClick={() => {
              setError(null);
              startContest.mutate();
            }}
          >
            {startContest.isPending
              ? "Running contest..."
              : `Spawn ${effectiveIds.length} via ${provider}`}
          </button>
          <button type="button" className="console-btn-ghost" onClick={() => router.push("/arena")}>
            Go to arena chat
          </button>
        </div>
      </section>
    </div>
  );
}
