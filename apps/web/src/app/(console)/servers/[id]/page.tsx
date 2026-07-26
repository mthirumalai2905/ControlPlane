"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { StatusPill } from "@/components/StatusPill";

export default function ServerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const server = useQuery({
    queryKey: ["server", id],
    queryFn: () => api.servers.get(id),
  });
  const logs = useQuery({
    queryKey: ["server-logs", id],
    queryFn: () => api.servers.logs(id),
    refetchInterval: 5000,
  });
  const tools = useQuery({
    queryKey: ["server-tools", id],
    queryFn: () => api.servers.tools(id),
  });
  const metrics = useQuery({
    queryKey: ["server-metrics", id],
    queryFn: () => api.servers.metrics(id),
    refetchInterval: 10_000,
  });
  const clientConfig = useQuery({
    queryKey: ["server-client-config", id],
    queryFn: () => api.servers.clientConfig(id),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["server", id] });
    void qc.invalidateQueries({ queryKey: ["servers"] });
    void qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const restart = useMutation({
    mutationFn: () => api.servers.restart(id),
    onSuccess: invalidate,
  });
  const repair = useMutation({
    mutationFn: () => api.servers.repair(id),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: () => api.servers.update(id),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: () => api.servers.remove(id),
    onSuccess: () => {
      window.location.href = "/servers";
    },
  });

  const s = server.data;
  if (server.isLoading) return <p className="text-[#8a9a84]">Loading…</p>;
  if (!s) return <p className="text-[#8b3a3a]">Connector not found</p>;

  const latest = metrics.data?.points?.at(-1);
  const authType =
    ((s.registry_entry?.install_methods as { _meta?: { auth_type?: string } })?._meta
      ?.auth_type) || "none";

  const copyConfig = async () => {
    await navigator.clipboard.writeText(JSON.stringify(clientConfig.data ?? {}, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl text-[#1a2218]">
              {s.registry_entry?.name ?? "Connector"}
            </h1>
            <StatusPill status={s.status} />
          </div>
          <p className="mt-2 font-mono text-sm text-[#8a9a84]">{s.id}</p>
          {s.status_reason && (
            <p className="mt-2 text-sm text-[#8a5a18]">{s.status_reason}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={api.servers.downloadUrl(id)} className="console-btn-accent">
            Download
          </a>
          <button type="button" onClick={() => void copyConfig()} className="console-btn-ghost">
            {copied ? "Copied!" : "Client config"}
          </button>
          <button
            type="button"
            onClick={() => restart.mutate()}
            disabled={restart.isPending}
            className="console-btn-ghost"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={() => repair.mutate()}
            disabled={repair.isPending}
            className="console-btn-ghost"
          >
            {repair.isPending ? "Repairing…" : "Repair"}
          </button>
          <button
            type="button"
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="console-btn-ghost"
          >
            {update.isPending ? "Updating…" : "Update"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this connector?")) remove.mutate();
            }}
            className="rounded-full border border-[#b85c5c]/40 px-4 py-2 text-sm text-[#8b3a3a] hover:bg-[#b85c5c]/10"
          >
            Delete
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Health", value: s.health_score.toFixed(0) },
          { label: "Version", value: s.version_installed ?? "—" },
          { label: "Authentication", value: authType },
          {
            label: "Last check",
            value: latest?.ts ? new Date(latest.ts).toLocaleTimeString() : "—",
          },
        ].map((m) => (
          <div key={m.label} className="panel rounded-xl p-4">
            <p className="text-xs uppercase text-[#8a9a84]">{m.label}</p>
            <p className="mt-1 font-display text-xl text-[#2f5d3a]">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "CPU %", value: latest?.cpu_pct?.toFixed(1) ?? "—" },
          { label: "Memory MB", value: latest?.mem_mb?.toFixed(0) ?? "—" },
          { label: "p50 ms", value: latest?.p50_ms?.toFixed(0) ?? "—" },
          { label: "Errors", value: latest?.error_count ?? "—" },
        ].map((m) => (
          <div key={m.label} className="panel rounded-xl p-4">
            <p className="text-xs uppercase text-[#8a9a84]">{m.label}</p>
            <p className="mt-1 font-display text-xl text-[#1a2218]">{m.value}</p>
          </div>
        ))}
      </div>

      <section className="panel rounded-xl p-5">
        <h2 className="mb-3 font-display text-xl">Tools</h2>
        {(tools.data?.tools ?? []).length === 0 ? (
          <p className="text-sm text-[#5c6b58]">No tools recorded yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tools.data!.tools.map((t) => (
              <li
                key={t.name}
                className="rounded-full border border-[#d5ddd0] bg-[#f4f6f2] px-3 py-1 font-mono text-xs text-[#5c6b58]"
              >
                {t.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel rounded-xl p-5">
        <h2 className="mb-3 font-display text-xl">Client config (Claude / Cursor)</h2>
        <pre className="max-h-64 overflow-auto rounded-lg bg-[#1a2218] p-4 font-mono text-xs text-[#c5d0bc]">
          {JSON.stringify(clientConfig.data ?? {}, null, 2)}
        </pre>
      </section>

      <section className="panel rounded-xl p-5">
        <h2 className="mb-3 font-display text-xl">Logs</h2>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-[#1a2218] p-4 font-mono text-xs text-[#c5d0bc]">
          {logs.data?.logs ?? "…"}
        </pre>
      </section>
    </div>
  );
}
