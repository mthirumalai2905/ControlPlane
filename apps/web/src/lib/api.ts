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
    throw new Error(text || res.statusText);
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
    remove: (id: string) => request<void>(`/servers/${id}`, { method: "DELETE" }),
    logs: (id: string) => request<{ logs: string }>(`/servers/${id}/logs`),
    tools: (id: string) =>
      request<{ tools: { name: string; verified: boolean }[] }>(`/servers/${id}/tools`),
    clientConfig: (id: string) => request<Record<string, unknown>>(`/servers/${id}/client-config`),
    downloadUrl: (id: string) => `${API_URL}/api/v1/servers/${id}/download`,
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
};
