"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { StatusPill } from "@/components/StatusPill";

export default function ServersPage() {
  const { workspace } = useWorkspace();
  const servers = useQuery({
    queryKey: ["servers", workspace?.id],
    queryFn: () => api.servers.list(workspace!.id),
    enabled: !!workspace?.id,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Installed Servers</h1>
        <p className="mt-2 text-mist-400">Filter by status; bulk actions arrive in Phase 2.</p>
      </header>
      <div className="panel rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-mist-400 border-b border-ink-700">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Health</th>
              <th className="px-4 py-3 font-medium">Version</th>
            </tr>
          </thead>
          <tbody>
            {(servers.data ?? []).map((s) => (
              <tr key={s.id} className="border-b border-ink-700/50 hover:bg-ink-800/40">
                <td className="px-4 py-3">
                  <Link href={`/servers/${s.id}`} className="hover:text-accent">
                    {s.registry_entry?.name ?? s.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={s.status} />
                </td>
                <td className="px-4 py-3 font-mono">{s.health_score.toFixed(0)}</td>
                <td className="px-4 py-3 font-mono text-mist-400">
                  {s.version_installed ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!servers.isLoading && (servers.data ?? []).length === 0 && (
          <p className="p-4 text-mist-400 text-sm">No installed servers.</p>
        )}
      </div>
    </div>
  );
}
