"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { StatusPill } from "@/components/StatusPill";

export default function MonitoringPage() {
  const { workspace } = useWorkspace();
  const summary = useQuery({
    queryKey: ["metrics-summary", workspace?.id],
    queryFn: () => api.metrics.summary(workspace!.id),
    enabled: !!workspace?.id,
    refetchInterval: 10_000,
  });
  const servers = useQuery({
    queryKey: ["servers", workspace?.id],
    queryFn: () => api.servers.list(workspace!.id),
    enabled: !!workspace?.id,
  });

  const s = summary.data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl text-[#1a2218]">Monitoring</h1>
        <p className="mt-2 text-[#5c6b58]">
          Status, latency, requests, and errors across every installed connector.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Healthy", value: s?.healthy ?? "—" },
          { label: "Failed", value: s?.failed ?? "—" },
          { label: "Avg latency", value: s ? `${s.avg_latency_ms} ms` : "—" },
          { label: "Requests", value: s?.total_requests ?? "—" },
        ].map((w) => (
          <div key={w.label} className="panel rounded-xl p-4">
            <p className="text-xs uppercase text-[#8a9a84]">{w.label}</p>
            <p className="mt-1 font-display text-2xl text-[#2f5d3a]">{w.value}</p>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-[#d5ddd0] text-left text-[#8a9a84]">
            <tr>
              <th className="px-4 py-3">Connector</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Health</th>
            </tr>
          </thead>
          <tbody>
            {(servers.data ?? []).map((c) => (
              <tr key={c.id} className="border-b border-[#e9eee6] hover:bg-[#e9eee6]/50">
                <td className="px-4 py-3">
                  <Link href={`/servers/${c.id}`} className="font-medium hover:text-[#2f5d3a]">
                    {c.registry_entry?.name ?? c.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={c.status} />
                </td>
                <td className="px-4 py-3 font-mono text-[#8a9a84]">
                  {c.version_installed ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-[#5c6b58]">
                  {c.health_score.toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(servers.data ?? []).length === 0 && (
          <p className="p-4 text-sm text-[#5c6b58]">No connectors to monitor.</p>
        )}
      </div>
    </div>
  );
}
