"""Deterministic Documentation / catalog → ServerManifest (§4.3 step 1)."""

from __future__ import annotations

from hermes_types import EnvVarSpec, HealthCheckSpec, ServerManifest

from hermes_api.models import RegistryEntry


def manifest_from_registry(entry: RegistryEntry, *, allow_path: str | None = None) -> ServerManifest:
    methods = entry.install_methods or {}
    meta = methods.get("_meta") or {}
    auth_type = meta.get("auth_type") or "none"
    required_raw = meta.get("required_env") or []
    env_vars = [
        EnvVarSpec(
            name=e["name"],
            purpose=e.get("purpose", ""),
            secret=bool(e.get("secret", False)),
            required=True,
            default=e.get("default"),
        )
        for e in required_raw
    ]

    if "npm" in methods or "npx" in methods:
        pkg = methods.get("npm") or ""
        install_method = "npm"
        install_command = f"npm install -g {pkg}" if pkg else "npm install"
        start_command = methods.get("npx") or f"npx -y {pkg}"
    elif "uvx" in methods or "python" in methods:
        install_method = "uv"
        pkg = methods.get("python") or methods.get("uvx", "")
        install_command = methods.get("uvx") or f"uvx {pkg}"
        start_command = install_command
    elif "docker" in methods:
        install_method = "docker"
        image = methods["docker"]
        install_command = f"docker pull {image}"
        start_command = f"docker run {image}"
    else:
        install_method = "npm"
        install_command = "npm install"
        start_command = "node index.js"

    # Filesystem default path injection
    if entry.slug == "filesystem" and allow_path:
        start_command = f"npx -y @modelcontextprotocol/server-filesystem {allow_path}"
        if not any(e.name == "HERMES_ALLOW_PATH" for e in env_vars):
            env_vars.append(
                EnvVarSpec(
                    name="HERMES_ALLOW_PATH",
                    purpose="Directory exposed to the filesystem MCP",
                    secret=False,
                    default=allow_path,
                )
            )

    confidence = {
        "install_method": 0.95,
        "install_command": 0.9,
        "start_command": 0.85,
        "auth_type": 0.95 if auth_type else 0.5,
        "required_env_vars": 0.9 if env_vars else 0.7,
    }

    return ServerManifest(
        install_method=install_method,  # type: ignore[arg-type]
        install_command=install_command,
        start_command=start_command,
        required_env_vars=env_vars,
        auth_type=auth_type,  # type: ignore[arg-type]
        default_port=None,
        health_check=HealthCheckSpec(kind="process_alive", timeout_seconds=20),
        docker_image=methods.get("docker"),
        confidence=confidence,
    )
