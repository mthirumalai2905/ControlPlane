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
        <h1 className="font-display text-4xl text-[var(--ink)]">Installed Connectors</h1>
        <p className="mt-2 text-[var(--muted)]">
          Open a connector to repair, update, download, or inspect tools and logs.
        </p>
      </header>
      <div className="panel overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--line)] text-left text-[var(--faint)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Health</th>
              <th className="px-4 py-3 font-medium">Version</th>
            </tr>
          </thead>
          <tbody>
            {(servers.data ?? []).map((s) => (
              <tr key={s.id} className="border-b border-[var(--line)] hover:bg-[var(--page-bg-soft)]">
                <td className="px-4 py-3">
                  <Link href={`/servers/${s.id}`} className="font-medium hover:text-[var(--accent)]">
                    {s.registry_entry?.name ?? s.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={s.status} />
                </td>
                <td className="px-4 py-3 font-mono text-[var(--muted)]">{s.health_score.toFixed(0)}</td>
                <td className="px-4 py-3 font-mono text-[var(--faint)]">
                  {s.version_installed ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!servers.isLoading && (servers.data ?? []).length === 0 && (
          <p className="p-4 text-sm text-[var(--muted)]">No installed connectors.</p>
        )}
      </div>
    </div>
  );
}
