"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { StatusPill } from "@/components/StatusPill";

export default function DashboardPage() {
  const { workspace } = useWorkspace();
  const health = useQuery({ queryKey: ["health"], queryFn: api.health });
  const servers = useQuery({
    queryKey: ["servers", workspace?.id],
    queryFn: () => api.servers.list(workspace!.id),
    enabled: !!workspace?.id,
  });
  const tasks = useQuery({
    queryKey: ["tasks", workspace?.id],
    queryFn: () => api.tasks.list(workspace!.id),
    enabled: !!workspace?.id,
  });

  const list = servers.data ?? [];
  const healthy = list.filter((s) => s.status === "healthy").length;
  const unhealthy = list.filter((s) =>
    ["unhealthy", "failed", "degraded"].includes(s.status)
  ).length;

  return (
    <div className="space-y-8">
      <header>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-4xl text-mist-100"
        >
          Dashboard
        </motion.h1>
        <p className="mt-2 text-mist-400 max-w-xl">
          At-a-glance health across installed MCP servers. Phase 0 walking skeleton —
          install the filesystem adapter from Registry to validate the sandbox.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Installed", value: list.length },
          { label: "Healthy", value: healthy },
          { label: "Needs attention", value: unhealthy },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="panel rounded-lg px-5 py-4"
          >
            <p className="text-xs uppercase tracking-wider text-mist-400">{stat.label}</p>
            <p className="mt-2 font-display text-3xl text-accent">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <section className="panel rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">Servers</h2>
          <Link href="/registry" className="text-sm text-accent hover:underline">
            Install from registry →
          </Link>
        </div>
        {servers.isLoading && <p className="text-mist-400 text-sm">Loading…</p>}
        {!servers.isLoading && list.length === 0 && (
          <p className="text-mist-400 text-sm">
            No servers yet. Seed the API (`python -m hermes_api.seed`) then install{" "}
            <code className="font-mono text-accent">filesystem</code>.
          </p>
        )}
        <ul className="divide-y divide-ink-700/80">
          {list.map((s) => (
            <li key={s.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <Link href={`/servers/${s.id}`} className="font-medium hover:text-accent">
                  {s.registry_entry?.name ?? s.id.slice(0, 8)}
                </Link>
                <p className="text-xs text-mist-400 font-mono mt-0.5">
                  score {s.health_score.toFixed(0)}
                </p>
              </div>
              <StatusPill status={s.status} />
            </li>
          ))}
        </ul>
      </section>

      <section className="panel rounded-lg p-5">
        <h2 className="font-display text-xl mb-3">Recent activity</h2>
        {(tasks.data ?? []).slice(0, 5).map((t) => (
          <div key={t.id} className="py-2 border-b border-ink-700/50 last:border-0">
            <p className="text-sm">{t.intent}</p>
            <p className="text-xs text-mist-400 mt-1">{t.summary}</p>
          </div>
        ))}
        {(tasks.data ?? []).length === 0 && (
          <p className="text-sm text-mist-400">No tasks yet.</p>
        )}
      </section>

      <p className="text-xs font-mono text-mist-400">
        API {health.data?.status ?? "…"} · phase {health.data?.phase ?? "?"}
      </p>
    </div>
  );
}
