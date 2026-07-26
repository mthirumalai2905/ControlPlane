/** Full product catalog — mirrors apps/api/hermes_api/catalog.py for landing + fallbacks. */

export type CatalogConnector = {
  name: string;
  slug: string;
  description: string;
  classification: "official" | "community" | "enterprise";
  category: "dev" | "data" | "comms" | "web" | "ai" | "utils";
  auth: "none" | "pat" | "api_key" | "oauth";
  tools: string[];
  tags: string[];
  tier: "Tier 1" | "Tier 2";
};

export const PRODUCT_CATALOG: CatalogConnector[] = [
  {
    name: "Filesystem",
    slug: "filesystem",
    description: "Secure file operations with configurable access controls.",
    classification: "official",
    category: "dev",
    auth: "none",
    tools: ["read_file", "write_file", "list_directory", "search_files"],
    tags: ["filesystem", "files"],
    tier: "Tier 1",
  },
  {
    name: "GitHub",
    slug: "github",
    description: "Repos, issues, PRs, and code search via the GitHub API.",
    classification: "official",
    category: "dev",
    auth: "pat",
    tools: ["create_issue", "list_commits", "search_code", "create_pull_request"],
    tags: ["github", "git", "issues"],
    tier: "Tier 1",
  },
  {
    name: "Memory",
    slug: "memory",
    description: "Knowledge graph memory for agents across sessions.",
    classification: "official",
    category: "ai",
    auth: "none",
    tools: ["create_entities", "create_relations", "search_nodes"],
    tags: ["memory", "knowledge-graph"],
    tier: "Tier 1",
  },
  {
    name: "Fetch",
    slug: "fetch",
    description: "Web content fetching and conversion for LLM use.",
    classification: "official",
    category: "web",
    auth: "none",
    tools: ["fetch"],
    tags: ["http", "web"],
    tier: "Tier 1",
  },
  {
    name: "PostgreSQL",
    slug: "postgres",
    description: "Read-only SQL access with schema inspection.",
    classification: "official",
    category: "data",
    auth: "api_key",
    tools: ["query"],
    tags: ["postgres", "sql", "database"],
    tier: "Tier 1",
  },
  {
    name: "SQLite",
    slug: "sqlite",
    description: "Database interaction and BI over SQLite files.",
    classification: "official",
    category: "data",
    auth: "none",
    tools: ["read_query", "write_query", "list_tables"],
    tags: ["sqlite", "database"],
    tier: "Tier 1",
  },
  {
    name: "Brave Search",
    slug: "brave-search",
    description: "Web and local search via Brave Search API.",
    classification: "official",
    category: "web",
    auth: "api_key",
    tools: ["brave_web_search", "brave_local_search"],
    tags: ["search", "brave"],
    tier: "Tier 2",
  },
  {
    name: "Browser Automation",
    slug: "puppeteer",
    description: "Browser automation and scraping via Puppeteer.",
    classification: "official",
    category: "web",
    auth: "none",
    tools: ["puppeteer_navigate", "puppeteer_screenshot", "puppeteer_click"],
    tags: ["browser", "scraping"],
    tier: "Tier 1",
  },
  {
    name: "Slack",
    slug: "slack",
    description: "Channels and messaging for Slack workspaces.",
    classification: "official",
    category: "comms",
    auth: "api_key",
    tools: ["slack_list_channels", "slack_post_message", "slack_reply_to_thread"],
    tags: ["slack", "chat"],
    tier: "Tier 2",
  },
  {
    name: "Google Maps",
    slug: "google-maps",
    description: "Geocoding, directions, and place details.",
    classification: "official",
    category: "web",
    auth: "api_key",
    tools: ["maps_geocode", "maps_search_places", "maps_place_details"],
    tags: ["maps", "geo"],
    tier: "Tier 2",
  },
  {
    name: "Git",
    slug: "git",
    description: "Read, search, and manipulate Git repositories.",
    classification: "official",
    category: "dev",
    auth: "none",
    tools: ["git_status", "git_log", "git_diff", "git_show"],
    tags: ["git", "vcs"],
    tier: "Tier 1",
  },
  {
    name: "Everything",
    slug: "everything",
    description: "Reference MCP server for prompts, resources, and tools.",
    classification: "official",
    category: "utils",
    auth: "none",
    tools: ["echo", "add", "printEnv"],
    tags: ["reference", "test"],
    tier: "Tier 1",
  },
  {
    name: "Sequential Thinking",
    slug: "sequential-thinking",
    description: "Dynamic problem-solving through thought sequences.",
    classification: "official",
    category: "ai",
    auth: "none",
    tools: ["sequentialthinking"],
    tags: ["reasoning"],
    tier: "Tier 1",
  },
  {
    name: "Time",
    slug: "time",
    description: "Time and timezone conversion capabilities.",
    classification: "official",
    category: "utils",
    auth: "none",
    tools: ["get_current_time", "convert_time"],
    tags: ["time", "timezone"],
    tier: "Tier 1",
  },
];

export const CATEGORY_LABELS: Record<CatalogConnector["category"], string> = {
  dev: "Developer",
  data: "Data",
  comms: "Comms",
  web: "Web & Search",
  ai: "AI & Memory",
  utils: "Utilities",
};

export function markFor(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9 ]/g, "").split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
