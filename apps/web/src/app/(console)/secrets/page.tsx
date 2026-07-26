"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";

export default function SecretsPage() {
  const { workspace } = useWorkspace();
  const secrets = useQuery({
    queryKey: ["secrets", workspace?.id],
    queryFn: () => api.secrets.list(workspace!.id),
    enabled: !!workspace?.id,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl text-[var(--ink)]">Secrets</h1>
        <p className="mt-2 text-[var(--muted)]">
          Metadata only. Values are never returned by the API.
        </p>
      </header>
      <ul className="panel divide-y divide-[var(--line)] rounded-xl">
        {(secrets.data ?? []).map((s) => (
          <li key={s.id} className="flex justify-between px-4 py-3 text-sm">
            <span className="font-mono text-[var(--ink)]">{s.key_name}</span>
            <span className="text-[var(--faint)]">{s.secret_type}</span>
          </li>
        ))}
        {(secrets.data ?? []).length === 0 && (
          <li className="px-4 py-3 text-sm text-[var(--muted)]">No secrets stored.</li>
        )}
      </ul>
    </div>
  );
}
