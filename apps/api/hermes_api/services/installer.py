"""Installation Engine — general path for catalog MCP servers (§4.4)."""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from hermes_types import ServerManifest, ServerStatus
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from hermes_api.models import HermesStep, HermesTask, InstalledServer, RegistryEntry, Secret
from hermes_api.services.configurator import generate_config, write_config
from hermes_api.services.docs_reader import manifest_from_registry
from hermes_api.services.execution_sandbox import ExecutionSandbox
from hermes_api.services.secrets import decrypt_value
from hermes_api.services.validator import validate_server

logger = logging.getLogger(__name__)


@dataclass
class InstallResult:
    server: InstalledServer
    task: HermesTask
    needs_secrets: list[str] | None = None


async def _append_step(
    db: AsyncSession,
    task: HermesTask,
    *,
    step_number: int,
    reasoning: str,
    action: dict,
    tool_used: str | None,
    result: dict,
    outcome: str = "ok",
    duration_ms: int | None = None,
) -> None:
    db.add(
        HermesStep(
            task_id=task.id,
            step_number=step_number,
            reasoning=reasoning,
            action=action,
            tool_used=tool_used,
            result=result,
            outcome=outcome,
            duration_ms=duration_ms,
        )
    )
    await db.flush()


async def _load_secrets(db: AsyncSession, server_id: uuid.UUID) -> dict[str, str]:
    rows = await db.scalars(select(Secret).where(Secret.installed_server_id == server_id))
    out: dict[str, str] = {}
    for s in rows:
        try:
            out[s.key_name] = decrypt_value(s.encrypted_value)
        except Exception:
            logger.warning("Failed to decrypt secret %s", s.key_name)
    return out


def _run(cmd: list[str], *, cwd: Path | None = None, timeout: int = 300) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=timeout,
        shell=False,
    )


def _download_npm_package(package: str, dest: Path) -> dict:
    """Download npm package tarball into dest/source without installing globally."""
    import tarfile

    dest.mkdir(parents=True, exist_ok=True)
    source = dest / "source"
    if source.exists():
        shutil.rmtree(source, ignore_errors=True)
    source.mkdir(parents=True)

    if not shutil.which("npm"):
        (source / "README.txt").write_text(
            f"npm not available. Install with: npx -y {package}\n",
            encoding="utf-8",
        )
        return {"method": "stub", "ok": True, "package": package, "note": "npm missing; client config still generated"}

    pack = _run(["npm", "pack", package, "--pack-destination", str(source)], timeout=180)
    if pack.returncode != 0:
        (source / "package.json").write_text(
            json.dumps(
                {
                    "name": f"hermes-wrapper-{package.replace('/', '-').replace('@', '')}",
                    "private": True,
                    "dependencies": {package: "latest"},
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        install = _run(["npm", "install", "--omit=dev"], cwd=source, timeout=300)
        return {
            "method": "npm_install",
            "ok": install.returncode == 0,
            "stdout": (install.stdout or "")[-2000:],
            "stderr": (install.stderr or "")[-2000:],
            "package": package,
        }

    tgz = next(source.glob("*.tgz"), None)
    if tgz:
        with tarfile.open(tgz, "r:gz") as tf:
            tf.extractall(source)
        pkg_dir = source / "package"
        if pkg_dir.exists():
            for child in pkg_dir.iterdir():
                target = source / child.name
                if target.exists():
                    if target.is_dir():
                        shutil.rmtree(target)
                    else:
                        target.unlink()
                shutil.move(str(child), str(target))
            shutil.rmtree(pkg_dir, ignore_errors=True)
            tgz.unlink(missing_ok=True)
        if (source / "package.json").exists():
            _run(["npm", "install", "--omit=dev"], cwd=source, timeout=300)

    return {
        "method": "npm_pack",
        "ok": True,
        "package": package,
        "files": len(list(source.rglob("*"))),
    }


def _which_node() -> str | None:
    return shutil.which("node")


def _start_via_docker_node(
    sandbox: ExecutionSandbox,
    *,
    name: str,
    server_id: str,
    workdir: Path,
    command: list[str],
    environment: dict[str, str],
    extra_volumes: dict[str, dict[str, str]] | None = None,
) -> dict:
    volumes = {
        str(workdir): {"bind": "/hermes", "mode": "rw"},
    }
    if extra_volumes:
        volumes.update(extra_volumes)
    # Use node image; run npx/node inside
    result = sandbox.start_container(
        name=name,
        image="node:22-alpine",
        command=command,
        environment=environment,
        volumes=volumes,
        labels={"managed-by": "hermes", "hermes.server_id": server_id},
    )
    return {
        "container_id": result.container_id,
        "status": result.status,
        "endpoint": result.endpoint,
        "runtime": "docker-node",
    }


async def install_server(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    registry_entry: RegistryEntry,
    sandbox: ExecutionSandbox | None = None,
    provided_secrets: dict[str, str] | None = None,
) -> InstallResult:
    sandbox = sandbox or ExecutionSandbox()
    provided_secrets = provided_secrets or {}

    existing = await db.scalar(
        select(InstalledServer).where(
            InstalledServer.workspace_id == workspace_id,
            InstalledServer.registry_entry_id == registry_entry.id,
        )
    )
    if existing and existing.status == ServerStatus.HEALTHY and existing.container_id:
        if sandbox.container_running(existing.container_id):
            task = HermesTask(
                workspace_id=workspace_id,
                installed_server_id=existing.id,
                intent=f"Install {registry_entry.slug} (idempotent no-op)",
                status="completed",
                trust_level_used="confirm_every",
                summary="Server already healthy; skipped reinstall.",
                completed_at=datetime.now(timezone.utc),
            )
            db.add(task)
            await db.flush()
            await _append_step(
                db,
                task,
                step_number=1,
                reasoning="Already healthy and container running.",
                action={"type": "noop"},
                tool_used=None,
                result={"server_id": str(existing.id)},
            )
            return InstallResult(server=existing, task=task)

    allow_path = str(sandbox.settings.servers_root.parent / "mcp-data" / registry_entry.slug)
    Path(allow_path).mkdir(parents=True, exist_ok=True)
    manifest: ServerManifest = manifest_from_registry(registry_entry, allow_path=allow_path)

    if existing:
        server = existing
        server.status = ServerStatus.INSTALLING
        server.manifest = manifest.model_dump()
        server.status_reason = None
    else:
        server = InstalledServer(
            workspace_id=workspace_id,
            registry_entry_id=registry_entry.id,
            status=ServerStatus.INSTALLING,
            version_installed=registry_entry.latest_version,
            manifest=manifest.model_dump(),
        )
        db.add(server)
        await db.flush()

    task = HermesTask(
        workspace_id=workspace_id,
        installed_server_id=server.id,
        intent=f"Install MCP server '{registry_entry.name}'",
        status="running",
        trust_level_used="confirm_every",
    )
    db.add(task)
    await db.flush()
    step = 0

    def nxt() -> int:
        nonlocal step
        step += 1
        return step

    t0 = time.perf_counter()
    await _append_step(
        db,
        task,
        step_number=nxt(),
        reasoning="Built ServerManifest from registry catalog (deterministic docs reader).",
        action={"slug": registry_entry.slug},
        tool_used="read_manifest",
        result={"manifest": manifest.model_dump()},
        duration_ms=int((time.perf_counter() - t0) * 1000),
    )

    # Secrets gate
    missing: list[str] = []
    stored = await _load_secrets(db, server.id)
    secrets = {**stored, **provided_secrets}
    for spec in manifest.required_env_vars:
        if spec.secret and not secrets.get(spec.name) and not spec.default:
            missing.append(spec.name)
        elif not spec.secret and spec.default and spec.name not in secrets:
            secrets[spec.name] = spec.default

    if missing:
        server.status = ServerStatus.PENDING
        server.status_reason = f"Waiting for secrets: {', '.join(missing)}"
        task.status = "waiting_user"
        task.summary = f"Provide secrets to continue: {', '.join(missing)}"
        await _append_step(
            db,
            task,
            step_number=nxt(),
            reasoning="Install paused — required credentials not yet stored.",
            action={"request_secrets": missing},
            tool_used="request_user_secret",
            result={"missing": missing},
            outcome="waiting",
        )
        return InstallResult(server=server, task=task, needs_secrets=missing)

    # Persist newly provided secrets
    if provided_secrets:
        from hermes_api.services.secrets import store_secret

        for k, v in provided_secrets.items():
            await store_secret(
                db,
                workspace_id=workspace_id,
                installed_server_id=server.id,
                key_name=k,
                value=v,
                secret_type="api_key",
            )

    # Configure
    server.status = ServerStatus.CONFIGURING
    t0 = time.perf_counter()
    config_dir = sandbox.ensure_server_dir(str(server.id))
    (config_dir / "data").mkdir(exist_ok=True)
    generated = generate_config(
        manifest, server_id=str(server.id), secrets=secrets, workspace_settings={"slug": registry_entry.slug}
    )
    write_config(config_dir, generated)
    # Write Claude/Cursor client snippet
    from hermes_api.services.package_export import build_client_config

    client_cfg = build_client_config(server, registry_entry)
    # Fill env with real secret refs (names only in file; values in .env)
    for k in secrets:
        if "env" in client_cfg["mcpServers"][registry_entry.slug]:
            client_cfg["mcpServers"][registry_entry.slug]["env"][k] = f"${{{k}}}"
    (config_dir / "mcp-client-config.json").write_text(json.dumps(client_cfg, indent=2), encoding="utf-8")
    sandbox.init_git_repo(config_dir)
    server.config_dir_path = str(config_dir)
    server.install_path = str(config_dir)
    await _append_step(
        db,
        task,
        step_number=nxt(),
        reasoning="Generated config.json, .env, docker-compose, and mcp-client-config.json.",
        action={"config_dir": str(config_dir)},
        tool_used="write_config_file",
        result={"layout": generated.directory_layout + ["mcp-client-config.json"]},
        duration_ms=int((time.perf_counter() - t0) * 1000),
    )

    # Download package
    t0 = time.perf_counter()
    methods = registry_entry.install_methods or {}
    npm_pkg = methods.get("npm")
    download_result: dict = {"skipped": True}
    if npm_pkg:
        try:
            download_result = _download_npm_package(npm_pkg, config_dir)
        except FileNotFoundError:
            download_result = {"ok": False, "error": "npm not found on PATH"}
        except Exception as exc:
            download_result = {"ok": False, "error": str(exc)}
    await _append_step(
        db,
        task,
        step_number=nxt(),
        reasoning="Downloaded MCP server package into the server source directory.",
        action={"package": npm_pkg},
        tool_used="run_install_command",
        result=download_result,
        outcome="ok" if download_result.get("ok", True) else "error",
        duration_ms=int((time.perf_counter() - t0) * 1000),
    )

    # Start runtime
    container_name = f"hermes-{registry_entry.slug}-{str(server.id)[:8]}"
    t0 = time.perf_counter()

    # API-only connectors (e.g. Tavily): secrets + config are enough
    if methods.get("api") and not npm_pkg:
        server.container_id = None
        server.endpoint = methods.get("api")
        server.status = ServerStatus.HEALTHY
        server.health_score = 100.0
        server.last_healthy_at = datetime.now(timezone.utc)
        server.status_reason = "API connector ready"
        task.status = "completed"
        task.summary = f"{registry_entry.name} API connector connected."
        task.completed_at = datetime.now(timezone.utc)
        await _append_step(
            db,
            task,
            step_number=nxt(),
            reasoning="API-only connector: stored credentials and marked healthy (no container).",
            action={"endpoint": server.endpoint},
            tool_used="start_container",
            result={"mode": "api", "ok": True},
            duration_ms=int((time.perf_counter() - t0) * 1000),
        )
        return InstallResult(server=server, task=task)

    if not sandbox.docker_available():
        # Local node process fallback (no docker)
        if _which_node() and npm_pkg:
            log_path = config_dir / "logs" / "server.log"
            env = {**dict(**{k: v for k, v in __import__("os").environ.items()}), **secrets}
            if registry_entry.slug == "filesystem":
                cmd = ["npx", "-y", npm_pkg, allow_path]
            else:
                cmd = ["npx", "-y", npm_pkg]
            proc = subprocess.Popen(
                cmd,
                cwd=config_dir,
                env=env,
                stdout=log_path.open("a", encoding="utf-8"),
                stderr=subprocess.STDOUT,
            )
            server.container_id = f"pid:{proc.pid}"
            server.endpoint = "stdio"
            await _append_step(
                db,
                task,
                step_number=nxt(),
                reasoning="Started MCP server as a local Node process (Docker unavailable).",
                action={"cmd": cmd, "pid": proc.pid},
                tool_used="start_container",
                result={"pid": proc.pid},
                duration_ms=int((time.perf_counter() - t0) * 1000),
            )
        else:
            server.status = ServerStatus.FAILED
            server.status_reason = "Docker and Node/npm unavailable"
            task.status = "failed"
            task.summary = server.status_reason
            await _append_step(
                db,
                task,
                step_number=nxt(),
                reasoning="Cannot start server without Docker or Node.",
                action={},
                tool_used="start_container",
                result={"error": "no_runtime"},
                outcome="error",
            )
            return InstallResult(server=server, task=task)
    else:
        try:
            if registry_entry.slug == "filesystem":
                command = ["npx", "-y", "@modelcontextprotocol/server-filesystem", "/data"]
                extra_vols = {allow_path: {"bind": "/data", "mode": "rw"}}
            elif npm_pkg:
                command = ["npx", "-y", npm_pkg]
                extra_vols = None
            else:
                command = ["sleep", "infinity"]
                extra_vols = None

            started = _start_via_docker_node(
                sandbox,
                name=container_name,
                server_id=str(server.id),
                workdir=config_dir,
                command=command,
                environment=secrets,
                extra_volumes=extra_vols,
            )
            server.container_id = started["container_id"]
            server.endpoint = started.get("endpoint") or "stdio"
            await _append_step(
                db,
                task,
                step_number=nxt(),
                reasoning="Started MCP server in a sandboxed Node Docker container.",
                action={"name": container_name, "command": command},
                tool_used="start_container",
                result=started,
                duration_ms=int((time.perf_counter() - t0) * 1000),
            )
        except Exception as exc:
            server.status = ServerStatus.FAILED
            server.status_reason = str(exc)
            task.status = "failed"
            task.summary = f"Start failed: {exc}"
            await _append_step(
                db,
                task,
                step_number=nxt(),
                reasoning="Container start failed.",
                action={"name": container_name},
                tool_used="start_container",
                result={"error": str(exc)},
                outcome="error",
            )
            return InstallResult(server=server, task=task)

    # Validate
    server.status = ServerStatus.VALIDATING
    t0 = time.perf_counter()
    tools_hint = (methods.get("_meta") or {}).get("tools_hint") or []
    validation = validate_server(sandbox, server, manifest, tools_hint=tools_hint)
    await _append_step(
        db,
        task,
        step_number=nxt(),
        reasoning="Validated process liveness and recorded advertised tools from catalog.",
        action={"tiers": ["process_alive", "tools_catalog"]},
        tool_used="run_mcp_inspector",
        result=validation.as_dict(),
        outcome="ok" if validation.passed else "error",
        duration_ms=int((time.perf_counter() - t0) * 1000),
    )

    if validation.passed:
        server.status = ServerStatus.HEALTHY
        server.health_score = validation.health_score
        server.last_healthy_at = datetime.now(timezone.utc)
        server.manifest = {**(server.manifest or {}), "tools": tools_hint, "validation": validation.as_dict()}
        task.status = "completed"
        task.summary = f"Installed '{registry_entry.name}'. Download package or copy client config from the server page."
    else:
        server.status = ServerStatus.DEGRADED if validation.partial else ServerStatus.UNHEALTHY
        server.status_reason = validation.reason
        server.health_score = validation.health_score
        task.status = "completed"
        task.summary = f"Finished with status {server.status}: {validation.reason}"

    task.completed_at = datetime.now(timezone.utc)
    await db.flush()
    return InstallResult(server=server, task=task)
