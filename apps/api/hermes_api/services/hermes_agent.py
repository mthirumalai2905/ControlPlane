"""Control Plane agent loop — AI commands for install / repair / restart / update / list."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from hermes_api.models import HermesStep, HermesTask, InstalledServer, RegistryEntry
from hermes_api.services.execution_sandbox import ExecutionSandbox
from hermes_api.services.healer import repair_connector, update_connector
from hermes_api.services.installer import install_server


@dataclass
class ChatResult:
    task: HermesTask
    server: InstalledServer | None = None
    needs_secrets: list[str] | None = None


def _match_registry(message: str, entries: list[RegistryEntry]) -> RegistryEntry | None:
    text = message.lower()
    scored: list[tuple[int, RegistryEntry]] = []
    aliases = {
        "browser": "puppeteer",
        "browser automation": "puppeteer",
        "postgres": "postgres",
        "postgresql": "postgres",
        "fs": "filesystem",
        "files": "filesystem",
    }
    for alias, slug in aliases.items():
        if alias in text:
            for e in entries:
                if e.slug == slug:
                    return e

    for e in entries:
        score = 0
        if e.slug.lower() in text:
            score += 10
        if e.name.lower() in text:
            score += 8
        for tag in e.tags or []:
            if tag.lower() in text:
                score += 3
        if re.search(rf"\b{re.escape(e.slug)}\b", text):
            score += 5
        if score:
            scored.append((score, e))
    if not scored:
        return None
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]


async def _find_installed(
    db: AsyncSession, workspace_id: UUID, entry: RegistryEntry | None
) -> InstalledServer | None:
    if not entry:
        return None
    return await db.scalar(
        select(InstalledServer)
        .where(
            InstalledServer.workspace_id == workspace_id,
            InstalledServer.registry_entry_id == entry.id,
        )
        .options(selectinload(InstalledServer.registry_entry))
    )


async def handle_chat_intent(
    db: AsyncSession,
    *,
    workspace_id: UUID,
    message: str,
) -> ChatResult:
    entries = list(await db.scalars(select(RegistryEntry)))
    task = HermesTask(
        workspace_id=workspace_id,
        intent=message,
        status="running",
        trust_level_used="confirm_every",
    )
    db.add(task)
    await db.flush()

    db.add(
        HermesStep(
            task_id=task.id,
            step_number=1,
            reasoning="Received user intent; matching against connector marketplace.",
            action={"message": message},
            tool_used="search_registry",
            result={"candidates": len(entries)},
            outcome="ok",
        )
    )

    lower = message.lower().strip()

    # Unhealthy / failed connectors
    if "unhealthy" in lower or "failed connector" in lower or "needs attention" in lower:
        servers = list(
            await db.scalars(
                select(InstalledServer)
                .where(InstalledServer.workspace_id == workspace_id)
                .options(selectinload(InstalledServer.registry_entry))
            )
        )
        bad = [s for s in servers if s.status in ("unhealthy", "failed", "degraded", "pending")]
        task.status = "completed"
        task.summary = (
            "All connectors healthy."
            if not bad
            else "Needs attention: "
            + ", ".join(f"{(s.registry_entry.name if s.registry_entry else s.id)} [{s.status}]" for s in bad)
        )
        task.completed_at = datetime.now(timezone.utc)
        db.add(
            HermesStep(
                task_id=task.id,
                step_number=2,
                reasoning="Filtered installed connectors by unhealthy statuses.",
                action={"type": "list_unhealthy"},
                tool_used="get_metrics",
                result={"count": len(bad)},
                outcome="ok",
            )
        )
        await db.flush()
        return ChatResult(task=task)

    # List installed
    if any(
        w in lower
        for w in (
            "list installed",
            "list connectors",
            "show installed",
            "what's installed",
            "whats installed",
            "show connectors",
        )
    ) or lower in ("list", "status", "show all"):
        servers = list(
            await db.scalars(
                select(InstalledServer)
                .where(InstalledServer.workspace_id == workspace_id)
                .options(selectinload(InstalledServer.registry_entry))
            )
        )
        task.status = "completed"
        task.summary = (
            "No connectors installed yet. Try: Install GitHub"
            if not servers
            else "Installed connectors: "
            + ", ".join(
                f"{(s.registry_entry.name if s.registry_entry else s.id)} [{s.status}]" for s in servers
            )
        )
        task.completed_at = datetime.now(timezone.utc)
        db.add(
            HermesStep(
                task_id=task.id,
                step_number=2,
                reasoning="Listed installed connectors for the workspace.",
                action={"type": "list_servers"},
                tool_used="get_metrics",
                result={"count": len(servers)},
                outcome="ok",
            )
        )
        await db.flush()
        return ChatResult(task=task)

    entry = _match_registry(message, entries)
    is_repair = any(w in lower for w in ("repair", "fix", "heal", "reconnect"))
    is_restart = "restart" in lower
    is_update = "update" in lower or "upgrade" in lower
    is_install = any(w in lower for w in ("install", "connect", "add", "setup", "set up", "enable"))

    if (is_repair or is_restart or is_update) and not entry:
        task.status = "completed"
        task.summary = "Which connector? Example: Repair Slack · Restart Browser · Update GitHub"
        task.completed_at = datetime.now(timezone.utc)
        await db.flush()
        return ChatResult(task=task)

    if is_repair and entry:
        installed = await _find_installed(db, workspace_id, entry)
        if not installed:
            task.status = "completed"
            task.summary = f"{entry.name} is not installed. Say: Install {entry.name}"
            task.completed_at = datetime.now(timezone.utc)
            await db.flush()
            return ChatResult(task=task)
        server, repair_task = await repair_connector(db, server_id=installed.id)
        task.installed_server_id = server.id
        task.status = repair_task.status
        task.summary = repair_task.summary
        task.completed_at = datetime.now(timezone.utc)
        db.add(
            HermesStep(
                task_id=task.id,
                step_number=2,
                reasoning=f"Ran self-healing repair for {entry.name}.",
                action={"repair_task_id": str(repair_task.id)},
                tool_used="start_container",
                result={"status": server.status},
                outcome="ok",
            )
        )
        await db.flush()
        task = await db.scalar(
            select(HermesTask).where(HermesTask.id == task.id).options(selectinload(HermesTask.steps))
        )
        return ChatResult(task=task, server=server)

    if is_update and entry:
        installed = await _find_installed(db, workspace_id, entry)
        if not installed:
            task.status = "completed"
            task.summary = f"{entry.name} is not installed. Say: Install {entry.name}"
            task.completed_at = datetime.now(timezone.utc)
            await db.flush()
            return ChatResult(task=task)
        server, update_task = await update_connector(db, server_id=installed.id)
        task.installed_server_id = server.id
        task.status = update_task.status
        task.summary = update_task.summary
        task.completed_at = datetime.now(timezone.utc)
        db.add(
            HermesStep(
                task_id=task.id,
                step_number=2,
                reasoning=f"Updated connector {entry.name}.",
                action={"update_task_id": str(update_task.id)},
                tool_used="run_install_command",
                result={"status": server.status},
                outcome="ok",
            )
        )
        await db.flush()
        task = await db.scalar(
            select(HermesTask).where(HermesTask.id == task.id).options(selectinload(HermesTask.steps))
        )
        return ChatResult(task=task, server=server)

    if is_restart and entry:
        installed = await _find_installed(db, workspace_id, entry)
        if not installed:
            task.status = "completed"
            task.summary = f"{entry.name} is not installed."
            task.completed_at = datetime.now(timezone.utc)
            await db.flush()
            return ChatResult(task=task)
        sandbox = ExecutionSandbox()
        if installed.container_id and not str(installed.container_id).startswith("pid:"):
            sandbox.stop_container(installed.container_id)
        result = await install_server(
            db, workspace_id=workspace_id, registry_entry=entry, sandbox=sandbox
        )
        task.installed_server_id = result.server.id
        task.status = "completed"
        task.summary = f"Restarted {entry.name} — status {result.server.status}."
        task.completed_at = datetime.now(timezone.utc)
        await db.flush()
        return ChatResult(task=task, server=result.server)

    if not entry:
        task.status = "completed"
        task.summary = (
            "Try: Install GitHub · Install PostgreSQL · Repair Slack · "
            "Show unhealthy connectors · List installed connectors"
        )
        task.completed_at = datetime.now(timezone.utc)
        db.add(
            HermesStep(
                task_id=task.id,
                step_number=2,
                reasoning="No marketplace match for intent.",
                action={"type": "clarify"},
                tool_used="search_registry",
                result={"matched": None},
                outcome="error",
            )
        )
        await db.flush()
        return ChatResult(task=task)

    # Default: install / connect
    if not is_install:
        is_install = True

    db.add(
        HermesStep(
            task_id=task.id,
            step_number=2,
            reasoning=f"Matched marketplace connector '{entry.name}' ({entry.slug}). Starting one-click install.",
            action={"registry_entry_id": str(entry.id), "slug": entry.slug},
            tool_used="search_registry",
            result={"slug": entry.slug, "classification": entry.classification},
            outcome="ok",
        )
    )
    await db.flush()

    result = await install_server(
        db,
        workspace_id=workspace_id,
        registry_entry=entry,
        sandbox=ExecutionSandbox(),
    )

    task.installed_server_id = result.server.id
    if result.needs_secrets:
        task.status = "waiting_user"
        task.summary = (
            f"Matched {entry.name}. Authenticate to finish: " + ", ".join(result.needs_secrets)
        )
    else:
        task.status = result.task.status
        task.summary = result.task.summary or f"Installed {entry.name}."
    task.completed_at = datetime.now(timezone.utc) if task.status in ("completed", "failed") else None
    db.add(
        HermesStep(
            task_id=task.id,
            step_number=3,
            reasoning="Delegated to Installation Engine (config → download → start → validate).",
            action={"install_task_id": str(result.task.id)},
            tool_used="run_install_command",
            result={
                "server_id": str(result.server.id),
                "status": result.server.status,
                "needs_secrets": result.needs_secrets,
            },
            outcome="waiting" if result.needs_secrets else "ok",
        )
    )
    await db.flush()
    task = await db.scalar(
        select(HermesTask).where(HermesTask.id == task.id).options(selectinload(HermesTask.steps))
    )
    return ChatResult(task=task, server=result.server, needs_secrets=result.needs_secrets)
