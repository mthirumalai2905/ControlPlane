"""Agent marketplace + contest arena APIs."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from hermes_api.db import get_db
from hermes_api.services import contest_engine, hermes_judge
from hermes_api.services.search_provider import normalize_provider

router = APIRouter(tags=["agents", "contests"])


class ContestCreate(BaseModel):
    workspace_id: UUID
    prompt: str = Field(min_length=3, max_length=4000)
    agent_count: int = Field(default=2, ge=2, le=4)
    agent_ids: list[str] | None = None
    provider: Literal["tavily", "firecrawl", "searxng"] | None = None


class ArenaChat(BaseModel):
    workspace_id: UUID
    message: str = Field(min_length=1, max_length=4000)


class ConnectProviderBody(BaseModel):
    workspace_id: UUID
    api_key: str | None = None


@router.get("/agents/roster")
async def agents_roster():
    return {"agents": contest_engine.roster()}


@router.get("/agents/status")
async def agents_status(workspace_id: UUID, db: AsyncSession = Depends(get_db)):
    from hermes_api.config import get_settings

    tavily = await contest_engine.tavily_connected(db, workspace_id)
    firecrawl = await contest_engine.firecrawl_connected(db, workspace_id)
    searxng = await contest_engine.searxng_connected(db, workspace_id)
    default_provider = normalize_provider(get_settings().search_provider)

    order: list[str] = []
    for p in ("searxng", default_provider, "tavily", "firecrawl"):
        if p not in order:
            order.append(p)
    connected = {"tavily": tavily, "firecrawl": firecrawl, "searxng": searxng}
    selected = next((p for p in order if connected.get(p)), "tavily")

    return {
        "tavily_connected": tavily,
        "firecrawl_connected": firecrawl,
        "searxng_connected": searxng,
        "search_provider": selected,
        "providers": {
            "searxng": {"connected": searxng, "label": "SearXNG (free)", "tier": "free"},
            "tavily": {"connected": tavily, "label": "Tavily", "tier": "paid"},
            "firecrawl": {"connected": firecrawl, "label": "Firecrawl", "tier": "paid"},
        },
        "connector_slug": selected,
        "arena_ready": tavily or firecrawl or searxng,
        "llm_judge_ready": hermes_judge.llm_configured(),
        "agents": contest_engine.roster(),
    }


async def _connect_api_provider(
    db: AsyncSession,
    *,
    workspace_id: UUID,
    slug: str,
    secret_name: str,
    settings_attr: str,
    api_key: str | None,
    default_value: str | None = None,
) -> dict:
    from sqlalchemy import select

    from hermes_api.config import get_settings
    from hermes_api.models import RegistryEntry
    from hermes_api.services.execution_sandbox import ExecutionSandbox
    from hermes_api.services.installer import install_server

    entry = await db.scalar(select(RegistryEntry).where(RegistryEntry.slug == slug))
    if not entry:
        raise HTTPException(404, f"{slug} not in registry. Run: python -m hermes_api.seed")

    key = (
        api_key
        or getattr(get_settings(), settings_attr, "")
        or default_value
        or ""
    ).strip()
    if not key:
        raise HTTPException(400, f"{secret_name} required")

    result = await install_server(
        db,
        workspace_id=workspace_id,
        registry_entry=entry,
        sandbox=ExecutionSandbox(),
        provided_secrets={secret_name: key},
    )
    await db.commit()
    return {
        "ok": True,
        "server_id": str(result.server.id),
        "status": result.server.status,
        "provider": slug,
        "redirect": "/arena",
    }


@router.post("/agents/connect-tavily")
async def connect_tavily(body: ConnectProviderBody, db: AsyncSession = Depends(get_db)):
    """Install Tavily connector using provided key or TAVILY_API_KEY from env."""
    return await _connect_api_provider(
        db,
        workspace_id=body.workspace_id,
        slug="tavily",
        secret_name="TAVILY_API_KEY",
        settings_attr="tavily_api_key",
        api_key=body.api_key,
    )


@router.post("/agents/connect-firecrawl")
async def connect_firecrawl(body: ConnectProviderBody, db: AsyncSession = Depends(get_db)):
    """Install Firecrawl connector using provided key or FIRECRAWL_API_KEY from env."""
    return await _connect_api_provider(
        db,
        workspace_id=body.workspace_id,
        slug="firecrawl",
        secret_name="FIRECRAWL_API_KEY",
        settings_attr="firecrawl_api_key",
        api_key=body.api_key,
    )


@router.post("/agents/connect-searxng")
async def connect_searxng(body: ConnectProviderBody, db: AsyncSession = Depends(get_db)):
    """Install free SearXNG connector (instance URL, default http://localhost:8080)."""
    return await _connect_api_provider(
        db,
        workspace_id=body.workspace_id,
        slug="searxng",
        secret_name="SEARXNG_BASE_URL",
        settings_attr="searxng_base_url",
        api_key=body.api_key,
        default_value="http://localhost:8080",
    )


_running_tasks: set[str] = set()


async def _bg_run(contest_id: str) -> None:
    if contest_id in _running_tasks:
        return
    _running_tasks.add(contest_id)
    try:
        await contest_engine.run_contest(contest_id)
    except Exception:
        raw = contest_engine._load(contest_id)  # noqa: SLF001
        if raw and raw.get("status") != "completed":
            raw["status"] = "failed"
            raw["phase"] = "error"
            raw.setdefault("chat", []).append(
                {
                    "role": "hermes",
                    "content": "Contest runner crashed. Check API logs.",
                    "ts": datetime.now(timezone.utc).isoformat(),
                }
            )
            contest_engine._persist(raw)  # noqa: SLF001
    finally:
        _running_tasks.discard(contest_id)


@router.post("/contests")
async def create_contest(
    body: ContestCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    try:
        provider = normalize_provider(body.provider)
        key = await contest_engine.resolve_search_key(db, body.workspace_id, provider)
        contest = await contest_engine.start_contest(
            workspace_id=body.workspace_id,
            prompt=body.prompt,
            agent_count=body.agent_count,
            agent_ids=body.agent_ids,
            search_key=key,
            provider=provider,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(502, f"Contest failed: {exc}") from exc

    background_tasks.add_task(_bg_run, contest["id"])
    return contest


@router.get("/contests")
async def list_contests(workspace_id: UUID):
    return {"contests": contest_engine.list_contests(str(workspace_id))}


@router.get("/contests/{contest_id}")
async def get_contest(contest_id: str, workspace_id: UUID | None = None):
    contest = contest_engine.get_contest(contest_id)
    if not contest:
        raise HTTPException(404, "Contest not found")
    if workspace_id and contest.get("workspace_id") != str(workspace_id):
        raise HTTPException(404, "Contest not found")
    return contest


@router.get("/contests/{contest_id}/agents/{agent_id}/records")
async def agent_records(contest_id: str, agent_id: str):
    try:
        return contest_engine.get_agent_records(contest_id, agent_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc


@router.get("/contests/{contest_id}/agents/{agent_id}/export.csv")
async def agent_export_csv(contest_id: str, agent_id: str):
    from fastapi.responses import Response

    from hermes_api.services import lab_persistence

    try:
        filename, csv_text = contest_engine.export_agent_csv(contest_id, agent_id)
        contest = contest_engine.get_contest(contest_id)
        if contest:
            await lab_persistence.record_download(contest["workspace_id"], contest_id, agent_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/lab/monitor")
async def lab_monitor(workspace_id: UUID):
    from hermes_api.services import lab_persistence

    try:
        return await lab_persistence.monitor_snapshot(str(workspace_id))
    except Exception as exc:
        raise HTTPException(502, f"Monitor unavailable: {exc}") from exc


@router.post("/contests/{contest_id}/chat")
async def contest_chat(contest_id: str, body: ArenaChat, db: AsyncSession = Depends(get_db)):
    try:
        contest = await contest_engine.append_chat(
            db,
            contest_id=contest_id,
            workspace_id=body.workspace_id,
            message=body.message,
        )
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc
    return contest
