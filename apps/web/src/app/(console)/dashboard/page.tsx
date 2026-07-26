"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { StatusPill } from "@/components/StatusPill";

export default function DashboardPage() {
  const { workspace } = useWorkspace();
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
  const summary = useQuery({
    queryKey: ["metrics-summary", workspace?.id],
    queryFn: () => api.metrics.summary(workspace!.id),
    enabled: !!workspace?.id,
    refetchInterval: 15_000,
  });

  const list = servers.data ?? [];
  const s = summary.data;
  const widgets = [
    { label: "Installed connectors", value: s?.installed ?? list.length },
    { label: "Healthy", value: s?.healthy ?? list.filter((x) => x.status === "healthy").length },
    {
      label: "Failed / degraded",
      value:
        s?.failed ??
        list.filter((x) => ["unhealthy", "failed", "degraded"].includes(x.status)).length,
    },
    { label: "Avg latency (ms)", value: s?.avg_latency_ms ?? 0 },
    { label: "Total requests", value: s?.total_requests ?? 0 },
    { label: "Recent errors", value: s?.total_errors ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl text-[#1a2218]"
          >
            Dashboard
          </motion.h1>
          <p className="mt-2 max-w-xl text-[#5c6b58]">
            Fleet health for every connector Control Plane manages — install from the marketplace, then
            monitor and repair here.
          </p>
        </div>
        <Link href="/registry" className="console-btn-accent">
          Open marketplace
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {widgets.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            className="panel rounded-xl px-5 py-4"
          >
            <p className="text-xs uppercase tracking-wider text-[#8a9a84]">{stat.label}</p>
            <p className="mt-2 font-display text-3xl text-[#2f5d3a]">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-[#1a2218]">Installed connectors</h2>
            <Link href="/servers" className="text-sm text-[#2f5d3a] hover:underline">
              View all →
            </Link>
          </div>
          {servers.isLoading && <p className="text-sm text-[#8a9a84]">Loading…</p>}
          {!servers.isLoading && list.length === 0 && (
            <p className="text-sm text-[#5c6b58]">
              No connectors yet. Install GitHub, Filesystem, or PostgreSQL from the marketplace.
            </p>
          )}
          <ul className="divide-y divide-[#e9eee6]">
            {list.slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Link href={`/servers/${c.id}`} className="font-medium hover:text-[#2f5d3a]">
                    {c.registry_entry?.name ?? c.id.slice(0, 8)}
                  </Link>
                  <p className="mt-0.5 font-mono text-xs text-[#8a9a84]">
                    v{c.version_installed ?? "—"} · score {c.health_score.toFixed(0)}
                  </p>
                </div>
                <StatusPill status={c.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="panel rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-[#1a2218]">Recent AI actions</h2>
            <Link href="/activity" className="text-sm text-[#2f5d3a] hover:underline">
              Activity feed →
            </Link>
          </div>
          {(tasks.data ?? []).slice(0, 8).map((t) => (
            <div key={t.id} className="border-b border-[#e9eee6] py-2 last:border-0">
              <p className="text-sm text-[#1a2218]">{t.intent}</p>
              <p className="mt-1 text-xs text-[#5c6b58]">{t.summary}</p>
            </div>
          ))}
          {(tasks.data ?? []).length === 0 && (
            <p className="text-sm text-[#5c6b58]">
              Try: <span className="font-mono text-[#2f5d3a]">Install GitHub</span> in AI Activity.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
