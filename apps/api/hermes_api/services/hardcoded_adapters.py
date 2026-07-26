"""Hardcoded filesystem MCP adapter — Phase 0 walking skeleton only.

A hardcoded adapter is a last resort (§1.2); Phase 1 replaces this with the
Documentation Reader + general Installation Engine.
"""

from __future__ import annotations

from hermes_types import EnvVarSpec, HealthCheckSpec, ServerManifest

# Official reference: https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem
FILESYSTEM_SLUG = "filesystem"
FILESYSTEM_IMAGE = "mcp/filesystem:latest"


def filesystem_manifest(*, allow_path: str = "/data") -> ServerManifest:
    return ServerManifest(
        install_method="docker",
        install_command=f"docker pull {FILESYSTEM_IMAGE}",
        start_command=f"docker run -v {allow_path}:{allow_path} {FILESYSTEM_IMAGE} {allow_path}",
        required_env_vars=[
            EnvVarSpec(
                name="HERMES_ALLOW_PATH",
                purpose="Host directory exposed to the filesystem MCP server",
                secret=False,
                required=True,
                default=allow_path,
            )
        ],
        auth_type="none",
        default_port=None,
        health_check=HealthCheckSpec(kind="process_alive", timeout_seconds=15),
        docker_image=FILESYSTEM_IMAGE,
        docker_compose_fragment=None,
        confidence={
            "install_method": 1.0,
            "install_command": 1.0,
            "start_command": 1.0,
            "auth_type": 1.0,
            "health_check": 0.9,
        },
    )


HARDCODED_ADAPTERS = {
    "filesystem": filesystem_manifest,
}
