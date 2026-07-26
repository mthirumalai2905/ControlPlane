import type { RegistryEntry } from "@/lib/api";
import { CATEGORY_LABELS, type CatalogConnector } from "@/lib/catalog";

export function entryMeta(entry: RegistryEntry) {
  const meta =
    (entry.install_methods?._meta as {
      auth_type?: string;
      tools_hint?: string[];
      required_env?: { name: string; purpose?: string; secret?: boolean }[];
    }) || {};
  return {
    auth: meta.auth_type || "none",
    tools: meta.tools_hint || [],
    requiredEnv: meta.required_env || [],
    secrets: (meta.required_env || [])
      .filter((e) => e.secret)
      .map((e) => ({ name: e.name, purpose: e.purpose || e.name })),
    configFields: (meta.required_env || []).filter((e) => !e.secret),
  };
}

const TAG_TO_CATEGORY: Record<string, CatalogConnector["category"]> = {
  github: "dev",
  git: "dev",
  filesystem: "dev",
  files: "dev",
  vcs: "dev",
  postgres: "data",
  sqlite: "data",
  database: "data",
  sql: "data",
  slack: "comms",
  chat: "comms",
  http: "web",
  web: "web",
  fetch: "web",
  search: "web",
  brave: "web",
  browser: "web",
  scraping: "web",
  maps: "web",
  geo: "web",
  memory: "ai",
  reasoning: "ai",
  "knowledge-graph": "ai",
  time: "utils",
  timezone: "utils",
  reference: "utils",
  test: "utils",
};

export function categoryForEntry(entry: RegistryEntry): string {
  for (const tag of entry.tags || []) {
    const cat = TAG_TO_CATEGORY[tag.toLowerCase()];
    if (cat) return CATEGORY_LABELS[cat];
  }
  return "Utilities";
}

export function tierForEntry(entry: RegistryEntry): string {
  const auth = entryMeta(entry).auth;
  if (auth === "none") return "Tier 1";
  return entry.tags?.includes("slack") || entry.tags?.includes("maps") || entry.tags?.includes("brave")
    ? "Tier 2"
    : "Tier 1";
}
