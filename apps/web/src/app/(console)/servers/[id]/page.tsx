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
  const clientConfig = useQuery({
    queryKey: ["server-client-config", id],
    queryFn: () => api.servers.clientConfig(id),
  });

  const restart = useMutation({
    mutationFn: () => api.servers.restart(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["server", id] }),
  });
  const remove = useMutation({
    mutationFn: () => api.servers.remove(id),
    onSuccess: () => {
      window.location.href = "/servers";
    },
  });

  const s = server.data;
  if (server.isLoading) return <p className="text-mist-400">Loading…</p>;
  if (!s) return <p className="text-signal-bad">Server not found</p>;

  const copyConfig = async () => {
    await navigator.clipboard.writeText(JSON.stringify(clientConfig.data ?? {}, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl">{s.registry_entry?.name ?? "Server"}</h1>
            <StatusPill status={s.status} />
          </div>
          <p className="mt-2 text-sm text-mist-400 font-mono">{s.id}</p>
          {s.status_reason && <p className="mt-2 text-sm text-signal-warn">{s.status_reason}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={api.servers.downloadUrl(id)}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink-950"
          >
            Download package
          </a>
          <button
            type="button"
            onClick={() => void copyConfig()}
            className="rounded-md border border-ink-700 px-3 py-2 text-sm hover:border-accent"
          >
            {copied ? "Copied!" : "Copy client config"}
          </button>
          <button
            type="button"
            onClick={() => restart.mutate()}
            className="rounded-md border border-ink-700 px-3 py-2 text-sm hover:border-accent"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this server?")) remove.mutate();
            }}
            className="rounded-md border border-signal-bad/40 px-3 py-2 text-sm text-signal-bad"
          >
            Delete
          </button>
        </div>
      </header>

      <div className="grid sm:grid-cols-4 gap-4">
        <div className="panel rounded-lg p-4">
          <p className="text-xs text-mist-400 uppercase">Health</p>
          <p className="font-display text-2xl mt-1">{s.health_score.toFixed(0)}</p>
        </div>
        <div className="panel rounded-lg p-4">
          <p className="text-xs text-mist-400 uppercase">Version</p>
          <p className="font-mono mt-1">{s.version_installed ?? "—"}</p>
        </div>
        <div className="panel rounded-lg p-4">
          <p className="text-xs text-mist-400 uppercase">Endpoint</p>
          <p className="font-mono text-xs mt-1 truncate">{s.endpoint ?? "—"}</p>
        </div>
        <div className="panel rounded-lg p-4">
          <p className="text-xs text-mist-400 uppercase">Runtime</p>
          <p className="font-mono text-xs mt-1 truncate">{s.container_id ?? "—"}</p>
        </div>
      </div>

      <section className="panel rounded-lg p-4">
        <h2 className="font-display text-xl mb-3">Tools</h2>
        {(tools.data?.tools ?? []).length === 0 ? (
          <p className="text-sm text-mist-400">No tools recorded yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tools.data!.tools.map((t) => (
              <li
                key={t.name}
                className="rounded-md border border-ink-700 px-2 py-1 font-mono text-xs text-mist-200"
              >
                {t.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel rounded-lg p-4">
        <h2 className="font-display text-xl mb-3">Client config (Claude / Cursor)</h2>
        <pre className="font-mono text-xs text-mist-200 bg-ink-950/80 rounded-md p-3 max-h-64 overflow-auto">
          {JSON.stringify(clientConfig.data ?? {}, null, 2)}
        </pre>
      </section>

      <section className="panel rounded-lg p-4">
        <h2 className="font-display text-xl mb-3">Live logs</h2>
        <pre className="font-mono text-xs text-mist-200 bg-ink-950/80 rounded-md p-3 max-h-80 overflow-auto whitespace-pre-wrap">
          {logs.data?.logs ?? "…"}
        </pre>
      </section>
    </div>
  );
}
