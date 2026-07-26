from typing import Literal

from pydantic import BaseModel, Field


InstallMethod = Literal["docker", "npm", "uv", "pip", "cargo", "binary"]
AuthType = Literal["oauth", "api_key", "pat", "jwt", "basic", "cookie", "none"]


class EnvVarSpec(BaseModel):
    name: str
    purpose: str
    secret: bool = False
    required: bool = True
    default: str | None = None


class HealthCheckSpec(BaseModel):
    kind: Literal["http", "process_alive", "mcp_ping"] = "mcp_ping"
    http_path: str | None = None
    timeout_seconds: float = 10.0


class ServerManifest(BaseModel):
    """Extracted install/auth/runtime contract for an MCP server (§4.3)."""

    install_method: InstallMethod
    install_command: str
    start_command: str
    required_env_vars: list[EnvVarSpec] = Field(default_factory=list)
    auth_type: AuthType = "none"
    default_port: int | None = None
    health_check: HealthCheckSpec = Field(default_factory=HealthCheckSpec)
    docker_compose_fragment: str | None = None
    docker_image: str | None = None
    confidence: dict[str, float] = Field(default_factory=dict)
