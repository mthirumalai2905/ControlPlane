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
        <h1 className="font-display text-4xl">Secrets</h1>
        <p className="mt-2 text-mist-400">
          Metadata only — values are never returned by the API.
        </p>
      </header>
      <ul className="panel rounded-lg divide-y divide-ink-700/80">
        {(secrets.data ?? []).map((s) => (
          <li key={s.id} className="px-4 py-3 flex justify-between text-sm">
            <span className="font-mono">{s.key_name}</span>
            <span className="text-mist-400">{s.secret_type}</span>
          </li>
        ))}
        {(secrets.data ?? []).length === 0 && (
          <li className="px-4 py-3 text-mist-400 text-sm">No secrets stored.</li>
        )}
      </ul>
    </div>
  );
}
