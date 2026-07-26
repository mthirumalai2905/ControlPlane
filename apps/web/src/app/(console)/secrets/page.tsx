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
        <h1 className="font-display text-4xl text-[#1a2218]">Secrets</h1>
        <p className="mt-2 text-[#5c6b58]">
          Metadata only — values are never returned by the API.
        </p>
      </header>
      <ul className="panel divide-y divide-[#e9eee6] rounded-xl">
        {(secrets.data ?? []).map((s) => (
          <li key={s.id} className="flex justify-between px-4 py-3 text-sm">
            <span className="font-mono text-[#1a2218]">{s.key_name}</span>
            <span className="text-[#8a9a84]">{s.secret_type}</span>
          </li>
        ))}
        {(secrets.data ?? []).length === 0 && (
          <li className="px-4 py-3 text-sm text-[#5c6b58]">No secrets stored.</li>
        )}
      </ul>
    </div>
  );
}
