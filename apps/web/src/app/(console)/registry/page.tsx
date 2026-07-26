"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api, type RegistryEntry } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";

function requiredSecrets(entry: RegistryEntry): { name: string; purpose: string }[] {
  const meta = (entry.install_methods?._meta as { required_env?: { name: string; purpose?: string; secret?: boolean }[] }) || {};
  return (meta.required_env || [])
    .filter((e) => e.secret)
    .map((e) => ({ name: e.name, purpose: e.purpose || e.name }));
}

export default function RegistryPage() {
  const { workspace } = useWorkspace();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<RegistryEntry | null>(null);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const router = useRouter();
  const qc = useQueryClient();

  const registry = useQuery({
    queryKey: ["registry", q],
    queryFn: () => api.registry.list(q || undefined),
  });

  const needed = useMemo(
    () => (selected ? requiredSecrets(selected) : []),
    [selected]
  );

  const install = useMutation({
    mutationFn: () =>
      api.servers.install(workspace!.id, selected!.slug, Object.keys(secrets).length ? secrets : undefined),
    onSuccess: (server) => {
      void qc.invalidateQueries({ queryKey: ["servers"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      if (server.needs_secrets?.length) {
        // stay on modal — show missing secrets
        setSecrets({});
        alert(`Need secrets: ${server.needs_secrets.join(", ")}`);
        return;
      }
      setSelected(null);
      router.push(`/servers/${server.id}`);
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Registry</h1>
        <p className="mt-2 text-mist-400">
          Browse MCP servers, connect them to your workspace, then inspect or download the package.
        </p>
      </header>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search GitHub, Slack, Postgres…"
        className="w-full max-w-md rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {(registry.data ?? []).map((entry) => {
          const secretsNeeded = requiredSecrets(entry);
          return (
            <li key={entry.id} className="panel rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-medium text-lg">{entry.name}</h2>
                    <span className="text-[10px] uppercase font-mono text-mist-400 border border-ink-700 rounded px-1.5 py-0.5">
                      {entry.classification}
                    </span>
                  </div>
                  <p className="text-sm text-mist-400 mt-1">{entry.description}</p>
                  <p className="text-xs font-mono text-mist-400 mt-2">{entry.slug}</p>
                  {secretsNeeded.length > 0 && (
                    <p className="text-xs text-signal-warn mt-2">
                      Needs: {secretsNeeded.map((s) => s.name).join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-auto">
                <button
                  type="button"
                  disabled={!workspace}
                  onClick={() => {
                    setSelected(entry);
                    setSecrets({});
                  }}
                  className="rounded-md bg-accent/90 px-4 py-2 text-sm font-medium text-ink-950 hover:bg-accent disabled:opacity-40"
                >
                  Connect
                </button>
                {entry.repo_url && (
                  <a
                    href={entry.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-ink-700 px-3 py-2 text-sm text-mist-200 hover:border-accent"
                  >
                    Source
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!registry.isLoading && (registry.data ?? []).length === 0 && (
        <p className="text-mist-400 text-sm">
          Registry empty — run <code className="font-mono text-accent">python -m hermes_api.seed</code>
        </p>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-4">
          <div className="panel max-w-lg w-full rounded-lg p-6 space-y-4">
            <h3 className="font-display text-2xl">Connect {selected.name}</h3>
            <p className="text-sm text-mist-200">
              Hermes will download the package, write config under{" "}
              <code className="font-mono text-xs">~/.hermes/servers/</code>, start a sandboxed
              runtime, and record every step in the AI Activity feed.
            </p>
            {needed.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-mist-400">Credentials</p>
                {needed.map((s) => (
                  <label key={s.name} className="block text-sm">
                    <span className="font-mono text-xs text-accent">{s.name}</span>
                    <p className="text-xs text-mist-400 mb-1">{s.purpose}</p>
                    <input
                      type="password"
                      className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm"
                      value={secrets[s.name] || ""}
                      onChange={(e) =>
                        setSecrets((prev) => ({ ...prev, [s.name]: e.target.value }))
                      }
                      placeholder="Paste secret (stored encrypted)"
                    />
                  </label>
                ))}
              </div>
            )}
            {install.isError && (
              <p className="text-sm text-signal-bad">{(install.error as Error).message}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" className="px-3 py-2 text-sm text-mist-200" onClick={() => setSelected(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink-950"
                disabled={
                  install.isPending ||
                  needed.some((s) => !(secrets[s.name] || "").trim())
                }
                onClick={() => install.mutate()}
              >
                {install.isPending ? "Connecting…" : "Confirm connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
