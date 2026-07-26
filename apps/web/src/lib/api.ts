const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text || res.statusText;
    try {
      const parsed = JSON.parse(text) as { detail?: unknown; message?: string };
      if (typeof parsed.detail === "string") message = parsed.detail;
      else if (Array.isArray(parsed.detail)) {
        message = parsed.detail
          .map((item) =>
            typeof item === "object" && item && "msg" in item
              ? String((item as { msg: string }).msg)
              : JSON.stringify(item),
          )
          .join("; ");
      } else if (parsed.message) message = parsed.message;
    } catch {
      /* keep raw text */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type Workspace = { id: string; name: string; created_at: string };
export type RegistryEntry = {
  id: string;
  name: string;
  slug: string;
  description: string;
  classification: string;
  latest_version: string | null;
  tags: string[];
  repo_url: string | null;
  install_methods: Record<string, unknown>;
  hardcoded_adapter: string | null;
};
export type InstalledServer = {
  id: string;
  workspace_id: string;
  status: string;
  health_score: number;
  version_installed: string | null;
  status_reason: string | null;
  container_id: string | null;
  endpoint: string | null;
  manifest: Record<string, unknown>;
  config_dir_path: string | null;
  registry_entry?: RegistryEntry | null;
  created_at: string;
  needs_secrets?: string[] | null;
  task_id?: string | null;
};
export type HermesStep = {
  id: string;
  step_number: number;
  reasoning: string;
  tool_used: string | null;
  outcome: string;
  duration_ms: number | null;
  created_at: string;
  action: Record<string, unknown>;
  result: Record<string, unknown>;
};
export type HermesTask = {
  id: string;
  intent: string;
  status: string;
  summary: string | null;
  created_at: string;
  installed_server_id?: string | null;
  steps: HermesStep[];
};

export const api = {
  health: () => request<{ status: string; phase: string }>("/health"),
  workspaces: {
    list: () => request<Workspace[]>("/workspaces"),
    create: (name: string) =>
      request<Workspace>("/workspaces", { method: "POST", body: JSON.stringify({ name }) }),
  },
  registry: {
    list: (q?: string) =>
      request<RegistryEntry[]>(`/registry${q ? `?search=${encodeURIComponent(q)}` : ""}`),
    downloadInfo: (id: string) =>
      request<Record<string, string | null>>(`/registry/${id}/download-info`),
  },
  servers: {
    list: (workspaceId: string) =>
      request<InstalledServer[]>(`/servers?workspace_id=${workspaceId}`),
    get: (id: string) => request<InstalledServer>(`/servers/${id}`),
    install: (workspaceId: string, slug: string, secrets?: Record<string, string>) =>
      request<InstalledServer>("/servers/install", {
        method: "POST",
        body: JSON.stringify({
          workspace_id: workspaceId,
          registry_entry_slug: slug,
          secrets: secrets || undefined,
        }),
      }),
    restart: (id: string) =>
      request<InstalledServer>(`/servers/${id}/restart`, { method: "POST" }),
    repair: (id: string) =>
      request<InstalledServer>(`/servers/${id}/repair`, { method: "POST" }),
    update: (id: string) =>
      request<InstalledServer>(`/servers/${id}/update`, { method: "POST" }),
    remove: (id: string) => request<void>(`/servers/${id}`, { method: "DELETE" }),
    logs: (id: string) => request<{ logs: string }>(`/servers/${id}/logs`),
    tools: (id: string) =>
      request<{ tools: { name: string; verified: boolean }[] }>(`/servers/${id}/tools`),
    metrics: (id: string, range = "1h") =>
      request<{
        points: {
          ts: string | null;
          cpu_pct: number;
          mem_mb: number;
          p50_ms: number;
          p95_ms: number;
          req_count: number;
          error_count: number;
        }[];
      }>(`/servers/${id}/metrics?range=${range}`),
    clientConfig: (id: string) => request<Record<string, unknown>>(`/servers/${id}/client-config`),
    downloadUrl: (id: string) => `${API_URL}/api/v1/servers/${id}/download`,
  },
  metrics: {
    summary: (workspaceId: string) =>
      request<{
        installed: number;
        healthy: number;
        failed: number;
        avg_latency_ms: number;
        total_requests: number;
        total_errors: number;
        versions: { id: string; name: string; version: string | null; status: string }[];
      }>(`/workspace/${workspaceId}/metrics/summary`),
  },
  tasks: {
    list: (workspaceId: string) =>
      request<HermesTask[]>(`/tasks?workspace_id=${workspaceId}`),
    get: (id: string) => request<HermesTask>(`/tasks/${id}`),
  },
  chat: (workspaceId: string, message: string) =>
    request<HermesTask>("/chat", {
      method: "POST",
      body: JSON.stringify({ workspace_id: workspaceId, message }),
    }),
  secrets: {
    list: (workspaceId: string) =>
      request<{ id: string; key_name: string; secret_type: string }[]>(
        `/secrets?workspace_id=${workspaceId}`
      ),
    create: (payload: {
      workspace_id: string;
      installed_server_id?: string;
      key_name: string;
      value: string;
    }) =>
      request("/secrets", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  incidents: {
    list: () =>
      request<{ id: string; symptom: string; state: string; resolved: boolean }[]>("/incidents"),
  },
  agents: {
    roster: () =>
      request<{ agents: AgentProfile[] }>("/agents/roster"),
    status: (workspaceId: string) =>
      request<AgentStatus>(`/agents/status?workspace_id=${workspaceId}`),
    connectTavily: (workspaceId: string, apiKey?: string) =>
      request<{ ok: boolean; server_id: string; status: string; redirect: string; provider?: string }>(
        "/agents/connect-tavily",
        {
          method: "POST",
          body: JSON.stringify({ workspace_id: workspaceId, api_key: apiKey || null }),
        },
      ),
    connectFirecrawl: (workspaceId: string, apiKey?: string) =>
      request<{ ok: boolean; server_id: string; status: string; redirect: string; provider?: string }>(
        "/agents/connect-firecrawl",
        {
          method: "POST",
          body: JSON.stringify({ workspace_id: workspaceId, api_key: apiKey || null }),
        },
      ),
    connectSearxng: (workspaceId: string, baseUrl?: string) =>
      request<{ ok: boolean; server_id: string; status: string; redirect: string; provider?: string }>(
        "/agents/connect-searxng",
        {
          method: "POST",
          body: JSON.stringify({ workspace_id: workspaceId, api_key: baseUrl || null }),
        },
      ),
  },
  contests: {
    list: (workspaceId: string) =>
      request<{ contests: Contest[] }>(`/contests?workspace_id=${workspaceId}`),
    get: (id: string, workspaceId?: string) =>
      request<Contest>(
        `/contests/${id}${workspaceId ? `?workspace_id=${workspaceId}` : ""}`,
      ),
    create: (payload: {
      workspace_id: string;
      prompt: string;
      agent_count?: number;
      agent_ids?: string[];
      provider?: "tavily" | "firecrawl" | "searxng";
    }) =>
      request<Contest>("/contests", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    chat: (contestId: string, workspaceId: string, message: string) =>
      request<Contest>(`/contests/${contestId}/chat`, {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, message }),
      }),
    records: (contestId: string, agentId: string) =>
      request<AgentRecords>(`/contests/${contestId}/agents/${agentId}/records`),
    exportCsvUrl: (contestId: string, agentId: string) =>
      `${API_URL}/api/v1/contests/${contestId}/agents/${agentId}/export.csv`,
  },
  lab: {
    monitor: (workspaceId: string) =>
      request<LabMonitor>(`/lab/monitor?workspace_id=${workspaceId}`),
  },
};

export type AgentProfile = {
  id: string;
  name: string;
  family: string;
  tagline: string;
  style: string;
  color: string;
};

export type SearchProviderId = "tavily" | "firecrawl" | "searxng";

export type AgentStatus = {
  tavily_connected: boolean;
  firecrawl_connected?: boolean;
  searxng_connected?: boolean;
  search_provider?: SearchProviderId;
  providers?: Partial<
    Record<SearchProviderId, { connected: boolean; label: string; tier?: string }>
  >;
  connector_slug: string;
  arena_ready: boolean;
  llm_judge_ready?: boolean;
  agents: AgentProfile[];
};

export type BrowserPage = {
  title: string;
  url: string;
  snippet: string;
  score?: number | null;
};

export type AgentRun = {
  agent_id: string;
  agent_name: string;
  family: string;
  color: string;
  status: string;
  error?: string | null;
  query: string;
  answer: string;
  browser_pages: BrowserPage[];
  duration_ms: number;
  records?: Record<string, string>[];
  record_columns?: string[];
  record_count?: number;
  score?: number | null;
  score_breakdown?: {
    relevance?: number | null;
    grounding?: number | null;
    clarity?: number | null;
    usefulness?: number | null;
    efficiency?: number | null;
  } | null;
  judge_notes?: string | null;
  scoring_status?: string | null;
};

export type ContestChat = {
  role: string;
  content: string;
  ts: string;
  agent_id?: string;
};

export type ContestTask = {
  kind?: string;
  target_count?: number;
  sites?: string[];
  location?: string;
};

export type Contest = {
  id: string;
  workspace_id: string;
  prompt: string;
  provider?: SearchProviderId | string | null;
  status: string;
  phase?: string | null;
  task?: ContestTask | null;
  created_at: string;
  completed_at?: string | null;
  agents: { id: string; name: string; family: string; color: string; tagline?: string }[];
  runs: AgentRun[];
  chat: ContestChat[];
  winner_id?: string | null;
  judge?: {
    winner_id?: string | null;
    scores?: Record<string, { score?: number; notes?: string; delta?: number }>;
    rationale?: string;
    method?: string;
  } | null;
};

export type AgentRecords = {
  contest_id: string;
  agent_id: string;
  agent_name: string;
  is_winner: boolean;
  record_count: number;
  columns: string[];
  records: Record<string, string>[];
  preview: Record<string, string>[];
};

export type LabMonitor = {
  contests: {
    id: string;
    prompt: string;
    status: string;
    phase?: string | null;
    winner_id?: string | null;
    task?: ContestTask | null;
    created_at?: string | null;
    completed_at?: string | null;
  }[];
  memories: {
    agent_id: string;
    agent_name: string;
    runs: number;
    wins: number;
    losses: number;
    avg_score: number;
    best_score: number;
    total_records: number;
    downloads: number;
    strategy_bias: Record<string, unknown>;
  }[];
  lessons: {
    agent_id: string;
    source: string;
    lesson: string;
    weight: number;
    created_at?: string | null;
  }[];
  events: {
    contest_id: string;
    agent_id?: string | null;
    event_type: string;
    message: string;
    ts?: string | null;
    data?: Record<string, unknown>;
  }[];
};
