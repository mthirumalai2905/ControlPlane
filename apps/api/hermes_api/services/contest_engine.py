"""Hermes contest engine: spawn agents, Tavily research, live Hermes LLM scoring."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from hermes_api.config import get_settings
from hermes_api.models import InstalledServer, RegistryEntry
from hermes_api.services.agent_roster import AgentProfile, get_agents, list_agents
from hermes_api.services import hermes_judge
from hermes_api.services import lab_persistence
from hermes_api.services.search_provider import normalize_provider, web_search
from hermes_api.services.task_runner import detect_task, records_to_csv, run_property_scrape

logger = logging.getLogger(__name__)

_STORE: dict[str, dict[str, Any]] = {}
_LOCKS: dict[str, asyncio.Lock] = {}


def _contests_dir() -> Path:
    root = Path(get_settings().hermes_home).expanduser() / "contests"
    root.mkdir(parents=True, exist_ok=True)
    return root


async def _safe_upsert(contest: dict[str, Any]) -> None:
    try:
        await lab_persistence.upsert_contest(contest)
    except Exception:
        logger.exception("Failed to persist contest %s to Postgres", contest.get("id"))


def _persist(contest: dict[str, Any]) -> None:
    _STORE[contest["id"]] = contest
    path = _contests_dir() / f"{contest['id']}.json"
    path.write_text(json.dumps(contest, indent=2, default=str), encoding="utf-8")
    snapshot = json.loads(json.dumps(contest, default=str))
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_safe_upsert(snapshot))
    except RuntimeError:
        try:
            asyncio.run(_safe_upsert(snapshot))
        except Exception:
            logger.exception("Sync persist failed for contest %s", contest.get("id"))


def _load(contest_id: str) -> dict[str, Any] | None:
    if contest_id in _STORE:
        return _STORE[contest_id]
    path = _contests_dir() / f"{contest_id}.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    _STORE[contest_id] = data
    return data


def _list_for_workspace(workspace_id: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for path in _contests_dir().glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if data.get("workspace_id") == workspace_id:
            out.append(data)
            _STORE[data["id"]] = data
    out.sort(key=lambda c: c.get("created_at") or "", reverse=True)
    return out


def _lock(contest_id: str) -> asyncio.Lock:
    if contest_id not in _LOCKS:
        _LOCKS[contest_id] = asyncio.Lock()
    return _LOCKS[contest_id]


def _chat_msg(role: str, content: str, **extra: Any) -> dict[str, Any]:
    return {
        "role": role,
        "content": content,
        "ts": datetime.now(timezone.utc).isoformat(),
        **extra,
    }


_PROVIDER_SECRET = {
    "tavily": ("TAVILY_API_KEY", "tavily_api_key"),
    "firecrawl": ("FIRECRAWL_API_KEY", "firecrawl_api_key"),
    "searxng": ("SEARXNG_BASE_URL", "searxng_base_url"),
}

_PROVIDER_LABEL = {
    "tavily": ("Tavily", "TAVILY_API_KEY"),
    "firecrawl": ("Firecrawl", "FIRECRAWL_API_KEY"),
    "searxng": ("SearXNG", "SEARXNG_BASE_URL"),
}


async def resolve_search_key(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    provider: str | None = None,
) -> str:
    prov = normalize_provider(provider)
    secret_name, settings_attr = _PROVIDER_SECRET[prov]
    settings = get_settings()
    env_key = (getattr(settings, settings_attr, None) or "").strip()
    if env_key:
        return env_key

    from hermes_api.models import Secret
    from hermes_api.services.secrets import decrypt_value

    entry = await db.scalar(select(RegistryEntry).where(RegistryEntry.slug == prov))
    if not entry:
        return ""
    server = await db.scalar(
        select(InstalledServer).where(
            InstalledServer.workspace_id == workspace_id,
            InstalledServer.registry_entry_id == entry.id,
        )
    )
    if not server:
        return ""
    secret = await db.scalar(
        select(Secret).where(
            Secret.installed_server_id == server.id,
            Secret.key_name == secret_name,
        )
    )
    if not secret:
        return ""
    try:
        return decrypt_value(secret.encrypted_value)
    except Exception:
        return ""


async def resolve_tavily_key(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    """Backward-compatible alias."""
    return await resolve_search_key(db, workspace_id, "tavily")


async def provider_connected(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    provider: str,
) -> bool:
    prov = normalize_provider(provider)
    _, settings_attr = _PROVIDER_SECRET[prov]
    if (getattr(get_settings(), settings_attr, None) or "").strip():
        return True
    entry = await db.scalar(select(RegistryEntry).where(RegistryEntry.slug == prov))
    if not entry:
        return False
    server = await db.scalar(
        select(InstalledServer)
        .where(
            InstalledServer.workspace_id == workspace_id,
            InstalledServer.registry_entry_id == entry.id,
        )
        .options(selectinload(InstalledServer.registry_entry))
    )
    return bool(server and server.status in ("healthy", "running", "degraded", "pending", "configuring"))


async def tavily_connected(db: AsyncSession, workspace_id: uuid.UUID) -> bool:
    return await provider_connected(db, workspace_id, "tavily")


async def firecrawl_connected(db: AsyncSession, workspace_id: uuid.UUID) -> bool:
    return await provider_connected(db, workspace_id, "firecrawl")


async def searxng_connected(db: AsyncSession, workspace_id: uuid.UUID) -> bool:
    return await provider_connected(db, workspace_id, "searxng")


async def any_search_connected(db: AsyncSession, workspace_id: uuid.UUID) -> bool:
    return (
        await tavily_connected(db, workspace_id)
        or await firecrawl_connected(db, workspace_id)
        or await searxng_connected(db, workspace_id)
    )


def _compose_answer(agent: AgentProfile, search: dict[str, Any]) -> str:
    answer = (search.get("answer") or "").strip()
    snippets = []
    for r in (search.get("results") or [])[:4]:
        title = r.get("title") or "source"
        content = (r.get("content") or "")[:280]
        snippets.append(f"- {title}: {content}")
    body = "\n".join(snippets)
    if agent.style == "analytical":
        return f"[{agent.name} analysis]\n{answer or 'Synthesizing sources.'}\n\nEvidence:\n{body}"
    if agent.style == "broad":
        return (
            f"[{agent.name} survey]\n"
            f"{answer or 'Aggregated coverage across sources.'}\n\n"
            f"Sources scanned:\n{body}"
        )
    if agent.style == "fast":
        return f"[{agent.name}]\n{answer or (snippets[0] if snippets else 'No results.')}"
    return f"[{agent.name}]\n{answer or 'Research complete.'}\n\n{body}"


async def _run_agent(
    agent: AgentProfile,
    prompt: str,
    api_key: str,
    task: dict[str, Any] | None = None,
    workspace_id: uuid.UUID | None = None,
    provider: str | None = None,
) -> dict[str, Any]:
    t0 = time.perf_counter()
    task = task or detect_task(prompt)
    provider = normalize_provider(provider)
    browser_pages: list[dict[str, Any]] = []
    records: list[dict[str, str]] = []
    record_columns: list[str] = []
    feedback_applied: list[str] = []
    query = f"{agent.query_prefix}{prompt}".strip()

    # Feedback loop: pull prior lessons + memory bias
    if workspace_id is not None:
        try:
            lessons = await lab_persistence.load_lessons(workspace_id, agent.id, limit=4)
            memory = await lab_persistence.load_memory(workspace_id, agent.id)
            if lessons:
                feedback_applied.extend(lessons)
                tip = " | ".join(lessons[:2])
                query = f"{query}. Apply prior feedback: {tip}"
            if memory and (memory.get("strategy_bias") or {}):
                bias = memory["strategy_bias"]
                if bias.get("tighten_extraction"):
                    query += ". Prefer precise addresses, prices, beds, baths, and listing URLs."
                    feedback_applied.append("bias:tighten_extraction")
                if bias.get("prefer_broader_queries"):
                    query += ". Expand coverage across neighborhoods and listing types."
                    feedback_applied.append("bias:prefer_broader_queries")
        except Exception:
            logger.exception("Failed loading feedback for %s", agent.id)

    try:
        if task.get("kind") == "property_scrape":
            scraped = await run_property_scrape(
                agent,
                prompt,
                api_key,
                task=task,
                feedback_tips=feedback_applied,
                provider=provider,
            )
            query = scraped.get("query") or query
            answer = scraped.get("answer") or ""
            browser_pages = scraped.get("browser_pages") or []
            records = scraped.get("records") or []
            record_columns = scraped.get("record_columns") or []
            tavily_answer = scraped.get("tavily_answer") or ""
            status = "completed"
            error = scraped.get("error")
        else:
            search = await web_search(
                query,
                provider=provider,
                api_key=api_key,
                search_depth=agent.search_depth,
                max_results=agent.max_results,
                include_answer=True,
            )
            for r in search.get("results") or []:
                browser_pages.append(
                    {
                        "title": r.get("title") or "Untitled",
                        "url": r.get("url") or "",
                        "snippet": (r.get("content") or "")[:400],
                        "score": r.get("score"),
                    }
                )
            answer = _compose_answer(agent, search)
            tavily_answer = search.get("answer") or ""
            status = "completed"
            error = None
    except Exception as exc:
        answer = f"[{agent.name}] failed: {exc}"
        tavily_answer = ""
        status = "failed"
        error = str(exc)

    return {
        "agent_id": agent.id,
        "agent_name": agent.name,
        "family": agent.family,
        "color": agent.color,
        "status": status,
        "error": error,
        "query": query,
        "answer": answer,
        "browser_pages": browser_pages,
        "tavily_answer": tavily_answer,
        "provider": provider,
        "records": records,
        "record_columns": record_columns,
        "record_count": len(records),
        "duration_ms": int((time.perf_counter() - t0) * 1000),
        "score": None,
        "score_breakdown": None,
        "judge_notes": None,
        "scoring_status": "pending",
        "feedback_applied": feedback_applied,
    }


async def start_contest(
    *,
    workspace_id: uuid.UUID,
    prompt: str,
    agent_count: int = 2,
    agent_ids: list[str] | None = None,
    search_key: str,
    provider: str | None = None,
    tavily_key: str | None = None,
) -> dict[str, Any]:
    prov = normalize_provider(provider)
    key = (search_key or tavily_key or "").strip()
    if not key:
        label, env_name = _PROVIDER_LABEL.get(prov, ("Search provider", "SEARCH_PROVIDER"))
        raise ValueError(f"Connect {label} first (or set {env_name}).")
    if not hermes_judge.llm_configured():
        raise ValueError("Set DEEPSEEK_API_KEY so Hermes can score agents with a live LLM.")

    agents = get_agents(agent_ids, agent_count)
    contest_id = str(uuid.uuid4())
    task = detect_task(prompt)
    contest: dict[str, Any] = {
        "id": contest_id,
        "workspace_id": str(workspace_id),
        "prompt": prompt,
        "provider": prov,
        "task": task,
        "status": "running",
        "phase": "spawning",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "agents": [
            {
                "id": a.id,
                "name": a.name,
                "family": a.family,
                "color": a.color,
                "tagline": a.tagline,
            }
            for a in agents
        ],
        "runs": [
            {
                "agent_id": a.id,
                "agent_name": a.name,
                "family": a.family,
                "color": a.color,
                "status": "queued",
                "query": "",
                "answer": "",
                "browser_pages": [],
                "records": [],
                "record_columns": [],
                "record_count": 0,
                "duration_ms": 0,
                "score": None,
                "score_breakdown": None,
                "judge_notes": None,
                "scoring_status": "waiting",
            }
            for a in agents
        ],
        "chat": [
            _chat_msg(
                "hermes",
                (
                    f"Harness online · provider {prov}. Task type: {task.get('kind')}. "
                    + (
                        f"Target {task.get('target_count')} listings from {', '.join(task.get('sites') or [])}. "
                        if task.get("kind") == "property_scrape"
                        else ""
                    )
                    + f"Spawning {len(agents)} agents with live Hermes scoring."
                ),
            )
        ],
        "winner_id": None,
        "judge": None,
        "_search_key": key,
        "_provider": prov,
    }
    _persist(contest)
    return {k: v for k, v in contest.items() if not k.startswith("_")}


async def run_contest(contest_id: str) -> dict[str, Any]:
    async with _lock(contest_id):
        contest = _load(contest_id)
        if not contest:
            raise ValueError("Contest not found")
        if contest.get("status") == "completed":
            return {k: v for k, v in contest.items() if not k.startswith("_")}

        provider = normalize_provider(contest.get("provider") or contest.get("_provider"))
        settings = get_settings()
        if provider == "firecrawl":
            fallback = settings.firecrawl_api_key
        elif provider == "searxng":
            fallback = settings.searxng_base_url
        else:
            fallback = settings.tavily_api_key
        api_key = contest.get("_search_key") or contest.get("_tavily_key") or fallback
        contest["provider"] = provider
        prompt = contest["prompt"]
        task = contest.get("task") or detect_task(prompt)
        contest["task"] = task
        workspace_id = uuid.UUID(str(contest["workspace_id"]))
        agents = get_agents([a["id"] for a in contest.get("agents") or []], None)
        runs: list[dict[str, Any]] = list(contest.get("runs") or [])

        contest["phase"] = "research" if task.get("kind") != "property_scrape" else "scraping"
        contest["chat"].append(
            _chat_msg(
                "hermes",
                (
                    f"Scrape phase started via {provider}. Aiming for {task.get('target_count')} records."
                    if task.get("kind") == "property_scrape"
                    else f"Research phase started via {provider}."
                ),
            )
        )
        _persist(contest)
        try:
            await lab_persistence.append_event(
                contest_id=contest_id,
                event_type="phase_start",
                message=contest["phase"] or "start",
                data={"task": task, "provider": provider},
            )
        except Exception:
            logger.exception("event log failed")

        for idx, agent in enumerate(agents):
            # mark running
            if idx < len(runs):
                runs[idx]["status"] = "running"
                runs[idx]["scoring_status"] = "waiting"
            contest["runs"] = runs
            contest["chat"].append(
                _chat_msg(
                    "hermes",
                    f"Dispatching {agent.name} ({agent.style}) via {provider}"
                    + (" scrape pipeline." if task.get("kind") == "property_scrape" else ".")
                    + " Prior feedback will be applied if available.",
                )
            )
            _persist(contest)

            run = await _run_agent(
                agent,
                prompt,
                api_key,
                task=task,
                workspace_id=workspace_id,
                provider=provider,
            )
            if idx < len(runs):
                runs[idx] = {**runs[idx], **run}
            else:
                runs.append(run)
            contest["runs"] = runs
            record_note = (
                f" · {run.get('record_count', 0)} records"
                if task.get("kind") == "property_scrape"
                else ""
            )
            fb_note = (
                f" · feedback x{len(run.get('feedback_applied') or [])}"
                if run.get("feedback_applied")
                else ""
            )
            contest["chat"].append(
                _chat_msg(
                    "agent",
                    f"{agent.name} finished in {run['duration_ms']}ms ({run['status']}){record_note}{fb_note}.",
                    agent_id=agent.id,
                )
            )
            _persist(contest)
            try:
                await lab_persistence.append_event(
                    contest_id=contest_id,
                    event_type="agent_finished",
                    agent_id=agent.id,
                    message=f"{agent.name} finished",
                    data={
                        "record_count": run.get("record_count"),
                        "duration_ms": run.get("duration_ms"),
                        "feedback_applied": run.get("feedback_applied") or [],
                    },
                )
            except Exception:
                logger.exception("event log failed")

            # Live Hermes score
            contest["phase"] = "scoring"
            if idx < len(runs):
                runs[idx]["scoring_status"] = "scoring"
            contest["runs"] = runs
            contest["chat"].append(
                _chat_msg("hermes", f"Hermes is scoring {agent.name} with the live LLM judge…")
            )
            _persist(contest)

            peers = [
                {
                    "id": r["agent_id"],
                    "name": r["agent_name"],
                    "score": r.get("score"),
                    "notes": r.get("judge_notes"),
                }
                for r in runs
                if r.get("score") is not None and r["agent_id"] != agent.id
            ]
            try:
                scored = await hermes_judge.score_agent_live(
                    prompt=prompt,
                    run=runs[idx],
                    peer_summaries=peers,
                )
                runs[idx]["score"] = scored["score"]
                runs[idx]["score_breakdown"] = scored.get("breakdown")
                runs[idx]["judge_notes"] = scored.get("notes")
                runs[idx]["scoring_status"] = "scored"
                contest["chat"].append(
                    _chat_msg(
                        "hermes",
                        f"Live score for {agent.name}: {scored['score']}/100. {scored.get('notes') or ''}",
                    )
                )
            except Exception as exc:
                logger.exception("Live scoring failed for %s", agent.id)
                runs[idx]["scoring_status"] = "error"
                runs[idx]["judge_notes"] = f"Scoring failed: {exc}"
                contest["chat"].append(
                    _chat_msg("hermes", f"Could not score {agent.name} yet: {exc}")
                )
            contest["runs"] = runs
            _persist(contest)

        # Final comparative verdict
        contest["phase"] = "verdict"
        contest["chat"].append(
            _chat_msg("hermes", "Running final comparative verdict across all agents…")
        )
        _persist(contest)

        try:
            judge = await hermes_judge.comparative_verdict(prompt=prompt, runs=runs)
            for r in runs:
                detail = (judge.get("scores") or {}).get(r["agent_id"]) or {}
                if detail.get("score") is not None:
                    r["score"] = detail["score"]
                if detail.get("notes"):
                    r["judge_notes"] = detail["notes"]
                r["scoring_status"] = "final"
            winner_id = judge.get("winner_id")
            winner_name = next((r["agent_name"] for r in runs if r["agent_id"] == winner_id), None)
            contest["judge"] = judge
            contest["winner_id"] = winner_id
            contest["chat"].append(
                _chat_msg(
                    "hermes",
                    f"Contest complete. Winner: {winner_name or 'none'}. {judge.get('rationale') or ''}",
                )
            )
        except Exception as exc:
            logger.exception("Comparative verdict failed")
            # Keep live scores; pick highest
            ranked = sorted(
                [r for r in runs if r.get("score") is not None],
                key=lambda r: float(r.get("score") or 0),
                reverse=True,
            )
            winner_id = ranked[0]["agent_id"] if ranked else None
            winner_name = ranked[0]["agent_name"] if ranked else None
            contest["winner_id"] = winner_id
            contest["judge"] = {
                "winner_id": winner_id,
                "scores": {
                    r["agent_id"]: {"score": r.get("score"), "notes": r.get("judge_notes")}
                    for r in runs
                    if r.get("score") is not None
                },
                "rationale": f"Final comparative pass failed ({exc}). Ranking by live Hermes scores.",
                "method": "hermes_llm_live_only",
            }
            contest["chat"].append(
                _chat_msg(
                    "hermes",
                    f"Comparative pass failed; using live scores. Leader: {winner_name or 'none'}.",
                )
            )

        contest["runs"] = runs
        contest["status"] = "completed"
        contest["phase"] = "done"
        contest["completed_at"] = datetime.now(timezone.utc).isoformat()
        contest.pop("_tavily_key", None)
        contest.pop("_search_key", None)
        contest.pop("_provider", None)
        _persist(contest)
        try:
            await lab_persistence.apply_contest_feedback(contest)
            await lab_persistence.append_event(
                contest_id=contest_id,
                event_type="contest_completed",
                message=f"Winner: {contest.get('winner_id')}",
                data={"winner_id": contest.get("winner_id"), "judge": contest.get("judge")},
            )
            contest["chat"].append(
                _chat_msg(
                    "hermes",
                    "Feedback loop updated agent memories and lessons in Postgres for the next contest.",
                )
            )
            _persist(contest)
        except Exception:
            logger.exception("Failed applying contest feedback")
        return {k: v for k, v in contest.items() if not k.startswith("_")}


async def create_and_run_contest(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    prompt: str,
    agent_count: int = 2,
    agent_ids: list[str] | None = None,
    provider: str | None = None,
) -> dict[str, Any]:
    """ Backward-compatible blocking run (used by chat commands). """
    prov = normalize_provider(provider)
    key = await resolve_search_key(db, workspace_id, prov)
    contest = await start_contest(
        workspace_id=workspace_id,
        prompt=prompt,
        agent_count=agent_count,
        agent_ids=agent_ids,
        search_key=key,
        provider=prov,
    )
    return await run_contest(contest["id"])


async def append_chat(
    db: AsyncSession,
    *,
    contest_id: str,
    workspace_id: uuid.UUID,
    message: str,
) -> dict[str, Any]:
    contest = _load(contest_id)
    if not contest or contest.get("workspace_id") != str(workspace_id):
        raise ValueError("Contest not found")

    contest["chat"].append(_chat_msg("user", message))
    _persist(contest)

    lower = message.lower().strip()
    if lower.startswith("run ") or lower.startswith("research ") or lower.startswith("scrape ") or "contest" in lower:
        prompt = re.sub(r"^(run|research|scrape|contest)\s*:?\s*", "", message, flags=re.I).strip()
        count_match = re.search(r"(\d+)\s+agents?", lower)
        count = int(count_match.group(1)) if count_match else max(2, len(contest.get("agents") or []))
        if prompt:
            prov = normalize_provider(contest.get("provider"))
            key = await resolve_search_key(db, workspace_id, prov)
            fresh = await start_contest(
                workspace_id=workspace_id,
                prompt=prompt,
                agent_count=count,
                agent_ids=None,
                search_key=key,
                provider=prov,
            )
            asyncio.create_task(run_contest(fresh["id"]))
            return fresh

    if "winner" in lower or "who won" in lower:
        wid = contest.get("winner_id")
        name = next((r["agent_name"] for r in contest.get("runs") or [] if r["agent_id"] == wid), None)
        reply = f"Winner: {name}." if name else "No winner yet. Start a contest first."
    elif "status" in lower:
        reply = (
            f"Contest status: {contest.get('status')} · phase: {contest.get('phase')} · "
            f"provider: {contest.get('provider') or 'tavily'}. "
            f"Agents: {len(contest.get('agents') or [])}."
        )
    else:
        reply = (
            "I'm the Hermes harness. Try: scrape 50 Redfin and StreetEasy listings in Brooklyn, "
            "research <question>, run 3 agents: <question>, or ask who won."
        )

    contest["chat"].append(_chat_msg("hermes", reply))
    _persist(contest)
    return {k: v for k, v in contest.items() if not k.startswith("_")}


def get_contest(contest_id: str) -> dict[str, Any] | None:
    data = _load(contest_id)
    if not data:
        return None
    return {k: v for k, v in data.items() if not k.startswith("_")}


def get_agent_records(contest_id: str, agent_id: str) -> dict[str, Any]:
    contest = _load(contest_id)
    if not contest:
        raise ValueError("Contest not found")
    run = next((r for r in contest.get("runs") or [] if r.get("agent_id") == agent_id), None)
    if not run:
        raise ValueError("Agent run not found")
    records = run.get("records") or []
    columns = run.get("record_columns") or (list(records[0].keys()) if records else [])
    return {
        "contest_id": contest_id,
        "agent_id": agent_id,
        "agent_name": run.get("agent_name"),
        "is_winner": contest.get("winner_id") == agent_id,
        "record_count": len(records),
        "columns": columns,
        "records": records,
        "preview": records[:25],
    }


def export_agent_csv(contest_id: str, agent_id: str) -> tuple[str, str]:
    data = get_agent_records(contest_id, agent_id)
    csv_text = records_to_csv(data["records"], data["columns"])
    safe_name = re.sub(r"[^a-zA-Z0-9_-]+", "-", str(data.get("agent_name") or agent_id)).strip("-").lower()
    filename = f"{safe_name}-{contest_id[:8]}.csv"
    return filename, csv_text


def list_contests(workspace_id: str) -> list[dict[str, Any]]:
    return [{k: v for k, v in c.items() if not k.startswith("_")} for c in _list_for_workspace(workspace_id)]


def roster() -> list[dict]:
    return list_agents()
