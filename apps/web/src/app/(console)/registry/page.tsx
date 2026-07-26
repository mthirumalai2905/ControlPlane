"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConnectModal } from "@/components/marketplace/ConnectModal";
import { GlassConnectorCard } from "@/components/marketplace/GlassConnectorCard";
import { PRODUCT_CATALOG } from "@/lib/catalog";
import { api, type RegistryEntry } from "@/lib/api";
import { categoryForEntry, entryMeta, tierForEntry } from "@/lib/marketplace";
import { useWorkspace } from "@/lib/workspace";

type CatalogConnectorCategory =
  | "Developer"
  | "Data"
  | "Comms"
  | "Web & Search"
  | "AI & Memory"
  | "Utilities";
type FilterId = "all" | "ready" | "auth" | "installed" | CatalogConnectorCategory;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All products" },
  { id: "ready", label: "No auth needed" },
  { id: "auth", label: "Needs credentials" },
  { id: "installed", label: "Installed" },
  { id: "Developer", label: "Developer" },
  { id: "Data", label: "Data" },
  { id: "Comms", label: "Comms" },
  { id: "Web & Search", label: "Web & Search" },
  { id: "AI & Memory", label: "AI & Memory" },
  { id: "Utilities", label: "Utilities" },
];

export default function RegistryPage() {
  const { workspace } = useWorkspace();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [selected, setSelected] = useState<RegistryEntry | null>(null);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [needsSecretsMsg, setNeedsSecretsMsg] = useState<string | null>(null);
  const router = useRouter();
  const qc = useQueryClient();

  const registry = useQuery({
    queryKey: ["registry"],
    queryFn: () => api.registry.list(),
  });

  const servers = useQuery({
    queryKey: ["servers", workspace?.id],
    queryFn: () => api.servers.list(workspace!.id),
    enabled: !!workspace,
  });

  const installedSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const s of servers.data ?? []) {
      if (s.registry_entry?.slug) set.add(s.registry_entry.slug);
    }
    return set;
  }, [servers.data]);

  const entries = useMemo(() => {
    let list = registry.data ?? [];
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.slug.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query) ||
          (e.tags || []).some((t) => t.toLowerCase().includes(query)),
      );
    }
    if (filter === "ready") {
      list = list.filter((e) => entryMeta(e).auth === "none");
    } else if (filter === "auth") {
      list = list.filter((e) => entryMeta(e).auth !== "none");
    } else if (filter === "installed") {
      list = list.filter((e) => installedSlugs.has(e.slug));
    } else if (filter !== "all") {
      list = list.filter((e) => categoryForEntry(e) === filter);
    }
    return list;
  }, [registry.data, q, filter, installedSlugs]);

  const install = useMutation({
    mutationFn: () =>
      api.servers.install(
        workspace!.id,
        selected!.slug,
        Object.keys(secrets).length ? secrets : undefined,
      ),
    onSuccess: (server) => {
      void qc.invalidateQueries({ queryKey: ["servers"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      if (server.needs_secrets?.length) {
        setSecrets({});
        setNeedsSecretsMsg(`Need secrets: ${server.needs_secrets.join(", ")}`);
        return;
      }
      setNeedsSecretsMsg(null);
      setSelected(null);
      router.push(`/servers/${server.id}`);
    },
  });

  const catalogCount = registry.data?.length ?? PRODUCT_CATALOG.length;

  return (
    <div className="relative -mx-8 -mt-8 min-h-full px-8 py-8">
      {/* soft meadow glass backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(47,93,58,0.07),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(232,238,230,0.9),_transparent_45%)]" />

      <div className="relative mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8a9a84]">
              Product catalog · {catalogCount} connectors
            </p>
            <h1 className="mt-1 font-display text-4xl text-[#1a2218] sm:text-5xl">Marketplace</h1>
            <p className="mt-2 max-w-xl text-[#5c6b58]">
              Browse the full Control Plane catalog. Connect once — authenticate, validate, and
              monitor automatically.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[240px] flex-1 lg:w-72 lg:flex-none">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search GitHub, Slack, Postgres…"
                className="console-input rounded-full border-white/70 bg-white/55 pl-10 backdrop-blur-md"
              />
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8a9a84]">
                ⌕
              </span>
            </div>
          </div>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                filter === f.id
                  ? "bg-[#1a2218] text-[#e8efe6]"
                  : "border border-white/70 bg-white/45 text-[#5c6b58] backdrop-blur-md hover:bg-white/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {registry.isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md"
              />
            ))}
          </div>
        )}

        {!registry.isLoading && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry, i) => {
              const meta = entryMeta(entry);
              const installed = installedSlugs.has(entry.slug);
              return (
                <li key={entry.id} className="h-full">
                  <GlassConnectorCard
                    name={entry.name}
                    slug={entry.slug}
                    description={entry.description}
                    classification={entry.classification}
                    tier={tierForEntry(entry)}
                    category={categoryForEntry(entry)}
                    auth={meta.auth}
                    tools={meta.tools}
                    tags={entry.tags}
                    installed={installed}
                    index={i}
                    primaryAction={{
                      label: installed ? "Connect another" : "Connect",
                      disabled: !workspace,
                      onClick: () => {
                        setSelected(entry);
                        setSecrets({});
                        setNeedsSecretsMsg(null);
                        install.reset();
                      },
                    }}
                    secondaryAction={
                      entry.repo_url
                        ? { label: "Source", href: entry.repo_url }
                        : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}

        {!registry.isLoading && entries.length === 0 && (
          <div className="rounded-2xl border border-white/70 bg-white/50 px-6 py-12 text-center backdrop-blur-xl">
            {(registry.data ?? []).length === 0 ? (
              <p className="text-sm text-[#5c6b58]">
                Marketplace empty — run{" "}
                <code className="font-mono text-[#2f5d3a]">python -m hermes_api.seed</code> in{" "}
                <code className="font-mono">apps/api</code>
              </p>
            ) : (
              <p className="text-sm text-[#5c6b58]">No connectors match this filter.</p>
            )}
          </div>
        )}

        <section className="rounded-2xl border border-white/70 bg-white/40 p-6 backdrop-blur-xl">
          <h2 className="font-display text-2xl text-[#1a2218]">What you get with every connect</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Discover", "Matched from the curated product catalog"],
              ["Install", "Sandboxed download + dependency setup"],
              ["Validate", "Health check and tool discovery"],
              ["Monitor", "Latency, errors, repair, and updates"],
            ].map(([t, d]) => (
              <div key={t}>
                <p className="font-medium text-[#1a2218]">{t}</p>
                <p className="mt-1 text-sm text-[#5c6b58]">{d}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {selected && (
        <ConnectModal
          entry={selected}
          secrets={secrets}
          setSecrets={setSecrets}
          onClose={() => {
            setSelected(null);
            setNeedsSecretsMsg(null);
          }}
          onConfirm={() => install.mutate()}
          pending={install.isPending}
          error={
            needsSecretsMsg ||
            (install.isError ? (install.error as Error).message : null)
          }
        />
      )}
    </div>
  );
}
