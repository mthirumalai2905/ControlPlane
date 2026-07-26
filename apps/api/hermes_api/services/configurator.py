"""Configuration Engine — pure function (§4.6)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from hermes_types import ServerManifest


@dataclass(frozen=True)
class GeneratedConfig:
    config_json: str
    env_file: str
    docker_compose: str
    directory_layout: list[str]


def generate_config(
    manifest: ServerManifest,
    *,
    server_id: str,
    secrets: dict[str, str] | None = None,
    workspace_settings: dict | None = None,
) -> GeneratedConfig:
    secrets = secrets or {}
    workspace_settings = workspace_settings or {}

    config = {
        "server_id": server_id,
        "install_method": manifest.install_method,
        "start_command": manifest.start_command,
        "auth_type": manifest.auth_type,
        "default_port": manifest.default_port,
        "health_check": manifest.health_check.model_dump(),
        "workspace": workspace_settings,
    }
    env_lines = []
    for spec in manifest.required_env_vars:
        value = secrets.get(spec.name, spec.default or "")
        if value:
            env_lines.append(f"{spec.name}={value}")
        elif not spec.secret:
            env_lines.append(f"# {spec.name}=  # {spec.purpose}")

    if manifest.docker_compose_fragment:
        compose = manifest.docker_compose_fragment
    else:
        image = manifest.docker_image or "mcp/placeholder:latest"
        port = manifest.default_port or 8080
        compose = (
            "services:\n"
            f"  mcp-{server_id[:8]}:\n"
            f"    image: {image}\n"
            f"    env_file: .env\n"
            f"    ports:\n"
            f"      - \"{port}:{port}\"\n"
            f"    restart: unless-stopped\n"
        )

    return GeneratedConfig(
        config_json=json.dumps(config, indent=2) + "\n",
        env_file="\n".join(env_lines) + ("\n" if env_lines else ""),
        docker_compose=compose,
        directory_layout=["config.json", ".env", "docker-compose.yml", "logs/"],
    )


def write_config(config_dir: Path, generated: GeneratedConfig) -> None:
    config_dir.mkdir(parents=True, exist_ok=True)
    (config_dir / "config.json").write_text(generated.config_json, encoding="utf-8")
    (config_dir / ".env").write_text(generated.env_file, encoding="utf-8")
    (config_dir / "docker-compose.yml").write_text(generated.docker_compose, encoding="utf-8")
    (config_dir / "logs").mkdir(exist_ok=True)
