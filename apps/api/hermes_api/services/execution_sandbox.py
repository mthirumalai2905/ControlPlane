"""Execution sandbox — the only component allowed to touch Docker/FS/terminal (§3.2, §9.2)."""

from __future__ import annotations

import logging
import shutil
from dataclasses import dataclass
from pathlib import Path

from hermes_api.config import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass
class ContainerResult:
    container_id: str
    name: str
    status: str
    endpoint: str | None = None


class ExecutionSandbox:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client = None

    @property
    def docker(self):
        if self._client is None:
            if not self.settings.docker_enabled:
                raise RuntimeError("Docker is disabled")
            import docker

            self._client = docker.from_env()
        return self._client

    def ensure_server_dir(self, server_id: str) -> Path:
        root = self.settings.servers_root / server_id
        (root / "logs").mkdir(parents=True, exist_ok=True)
        return root

    def write_text(self, path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def init_git_repo(self, directory: Path) -> None:
        """Version config dir for drift/rollback (§4.6). Best-effort if git missing."""
        git = shutil.which("git")
        if not git:
            logger.warning("git not found; skipping config versioning for %s", directory)
            return
        import subprocess

        if not (directory / ".git").exists():
            subprocess.run([git, "init"], cwd=directory, check=True, capture_output=True)
        subprocess.run([git, "add", "-A"], cwd=directory, check=False, capture_output=True)
        subprocess.run(
            [git, "-c", "user.email=hermes@local", "-c", "user.name=Hermes", "commit", "-m", "hermes config snapshot"],
            cwd=directory,
            check=False,
            capture_output=True,
        )

    def start_container(
        self,
        *,
        name: str,
        image: str,
        command: list[str] | None = None,
        environment: dict[str, str] | None = None,
        volumes: dict[str, dict[str, str]] | None = None,
        ports: dict[str, int] | None = None,
        network: str | None = None,
        labels: dict[str, str] | None = None,
    ) -> ContainerResult:
        """Start a long-running container for an installed MCP server."""
        self.docker.images.pull(image)
        # Remove stale container with same name (idempotent)
        try:
            existing = self.docker.containers.get(name)
            existing.remove(force=True)
        except Exception:
            pass

        container = self.docker.containers.run(
            image,
            command=command,
            name=name,
            detach=True,
            environment=environment or {},
            volumes=volumes or {},
            ports=ports or {},
            network=network,
            labels=labels or {"managed-by": "hermes"},
            restart_policy={"Name": "unless-stopped"},
        )
        container.reload()
        endpoint = None
        if ports:
            host_port = next(iter(ports.values()))
            endpoint = f"localhost:{host_port}"
        return ContainerResult(
            container_id=container.id,
            name=name,
            status=container.status,
            endpoint=endpoint,
        )

    def stop_container(self, container_id: str) -> None:
        try:
            c = self.docker.containers.get(container_id)
            c.stop(timeout=10)
            c.remove(force=True)
        except Exception as exc:
            logger.warning("stop_container(%s): %s", container_id, exc)

    def container_running(self, container_id: str) -> bool:
        try:
            c = self.docker.containers.get(container_id)
            c.reload()
            return c.status == "running"
        except Exception:
            return False

    def get_logs(self, container_id: str, tail: int = 200) -> str:
        try:
            c = self.docker.containers.get(container_id)
            raw = c.logs(tail=tail)
            return raw.decode("utf-8", errors="replace")
        except Exception as exc:
            return f"[hermes] failed to fetch logs: {exc}"

    def docker_available(self) -> bool:
        try:
            self.docker.ping()
            return True
        except Exception:
            return False
