from datetime import datetime
from uuid import UUID

from hermes_types import ServerManifest
from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Workspaces ---


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class WorkspaceOut(ORMModel):
    id: UUID
    name: str
    created_at: datetime


# --- Registry ---


class RegistryEntryOut(ORMModel):
    id: UUID
    name: str
    slug: str
    description: str
    repo_url: str | None
    author: str | None
    classification: str
    latest_version: str | None
    install_methods: dict
    tags: list[str]
    hardcoded_adapter: str | None


# --- Servers ---


class InstallServerRequest(BaseModel):
    workspace_id: UUID
    registry_entry_id: UUID | None = None
    registry_entry_slug: str | None = None
    secrets: dict[str, str] | None = None


class InstalledServerOut(ORMModel):
    id: UUID
    workspace_id: UUID
    registry_entry_id: UUID
    status: str
    version_installed: str | None
    install_path: str | None
    container_id: str | None
    endpoint: str | None
    manifest: dict
    config_dir_path: str | None
    health_score: float
    last_healthy_at: datetime | None
    status_reason: str | None
    created_at: datetime
    updated_at: datetime
    registry_entry: RegistryEntryOut | None = None


class InstallServerResponse(InstalledServerOut):
    needs_secrets: list[str] | None = None
    task_id: UUID | None = None


# --- Tasks / Activity ---


class HermesStepOut(ORMModel):
    id: UUID
    task_id: UUID
    step_number: int
    reasoning: str
    action: dict
    tool_used: str | None
    result: dict
    duration_ms: int | None
    outcome: str
    created_at: datetime


class HermesTaskOut(ORMModel):
    id: UUID
    workspace_id: UUID
    installed_server_id: UUID | None
    intent: str
    status: str
    trust_level_used: str
    summary: str | None
    created_at: datetime
    completed_at: datetime | None
    steps: list[HermesStepOut] = []


class ChatRequest(BaseModel):
    workspace_id: UUID
    message: str


# --- Secrets (metadata only on read) ---


class SecretCreate(BaseModel):
    workspace_id: UUID
    installed_server_id: UUID | None = None
    key_name: str
    value: str
    secret_type: str = "api_key"
    refreshable: bool = False


class SecretMetaOut(ORMModel):
    id: UUID
    workspace_id: UUID
    installed_server_id: UUID | None
    key_name: str
    secret_type: str
    refreshable: bool
    expires_at: datetime | None
    created_at: datetime
    rotated_at: datetime | None


# --- Incidents ---


class IncidentOut(ORMModel):
    id: UUID
    installed_server_id: UUID
    symptom: str
    diagnosis: str | None
    state: str
    remediation_applied: str | None
    resolved: bool
    escalated: bool
    created_at: datetime
    resolved_at: datetime | None


# --- Metrics ---


class MetricPoint(BaseModel):
    ts: datetime
    cpu_pct: float
    mem_mb: float
    p50_ms: float
    p95_ms: float
    p99_ms: float
    req_count: int
    error_count: int
    reconnect_count: int


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.2.0"
    phase: str = "1+"


class ManifestPreview(BaseModel):
    manifest: ServerManifest
