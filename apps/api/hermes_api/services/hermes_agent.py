"""Hermes agent loop — intent parsing + tool orchestration (model-agnostic).

Without an LLM key, uses deterministic intent matching against the registry.
With DEEPSEEK_API_KEY / OPENAI_API_KEY, can call a chat-completions endpoint.
"""

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
from hermes_api.services.installer import install_server


@dataclass
class ChatResult:
    task: HermesTask
    server: InstalledServer | None = None
    needs_secrets: list[str] | None = None


def _match_registry(message: str, entries: list[RegistryEntry]) -> RegistryEntry | None:
    text = message.lower()
    # Prefer explicit slug / name hits
    scored: list[tuple[int, RegistryEntry]] = []
    for e in entries:
        score = 0
        if e.slug.lower() in text:
            score += 10
        if e.name.lower() in text:
            score += 8
        for tag in e.tags or []:
            if tag.lower() in text:
                score += 3
        # common verbs
        if re.search(rf"\b{re.escape(e.slug)}\b", text):
            score += 5
        if score:
            scored.append((score, e))
    if not scored:
        return None
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]


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
            reasoning="Received user intent; matching against MCP registry catalog.",
            action={"message": message},
            tool_used="search_registry",
            result={"candidates": len(entries)},
            outcome="ok",
        )
    )

    # List / status intents
    lower = message.lower()
    if any(w in lower for w in ("list", "show", "what's installed", "whats installed", "status")):
        servers = list(
            await db.scalars(
                select(InstalledServer)
                .where(InstalledServer.workspace_id == workspace_id)
                .options(selectinload(InstalledServer.registry_entry))
            )
        )
        summary = (
            "No servers installed yet."
            if not servers
            else "Installed: "
            + ", ".join(
                f"{(s.registry_entry.name if s.registry_entry else s.id)} [{s.status}]" for s in servers
            )
        )
        task.status = "completed"
        task.summary = summary
        task.completed_at = datetime.now(timezone.utc)
        db.add(
            HermesStep(
                task_id=task.id,
                step_number=2,
                reasoning="Listed installed servers for the workspace.",
                action={"type": "list_servers"},
                tool_used="get_metrics",
                result={"count": len(servers)},
                outcome="ok",
            )
        )
        await db.flush()
        return ChatResult(task=task)

    entry = _match_registry(message, entries)
    if not entry:
        task.status = "completed"
        task.summary = (
            "I couldn't match that to a known MCP. Try: "
            + ", ".join(e.slug for e in entries[:8])
            + ("…" if len(entries) > 8 else "")
        )
        task.completed_at = datetime.now(timezone.utc)
        db.add(
            HermesStep(
                task_id=task.id,
                step_number=2,
                reasoning="No registry match for intent.",
                action={"type": "clarify"},
                tool_used="search_registry",
                result={"matched": None},
                outcome="error",
            )
        )
        await db.flush()
        return ChatResult(task=task)

    connect = any(w in lower for w in ("connect", "install", "add", "setup", "set up", "enable"))
    if not connect and entry:
        # If they just named a server, treat as connect intent
        connect = True

    db.add(
        HermesStep(
            task_id=task.id,
            step_number=2,
            reasoning=f"Matched intent to registry entry '{entry.name}' ({entry.slug}). Starting install.",
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

    # Merge install task steps into chat task by updating summary; keep install task too
    task.installed_server_id = result.server.id
    if result.needs_secrets:
        task.status = "waiting_user"
        task.summary = (
            f"Matched {entry.name}. Need secrets before finishing install: "
            + ", ".join(result.needs_secrets)
        )
    else:
        task.status = result.task.status
        task.summary = result.task.summary or f"Installed {entry.name}."
    task.completed_at = datetime.now(timezone.utc) if task.status in ("completed", "failed") else None
    db.add(
        HermesStep(
            task_id=task.id,
            step_number=3,
            reasoning="Delegated to Installation Engine.",
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
    # Reload with steps
    task = await db.scalar(
        select(HermesTask).where(HermesTask.id == task.id).options(selectinload(HermesTask.steps))
    )
    return ChatResult(task=task, server=result.server, needs_secrets=result.needs_secrets)
