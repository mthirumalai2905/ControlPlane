"""Persist contests to Postgres + agent feedback / memory loop."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from hermes_api.db import AsyncSessionLocal
from hermes_api.models import AgentContest, AgentContestEvent, AgentContestRun, AgentLesson, AgentMemory


def _uuid(val: str | uuid.UUID) -> uuid.UUID:
    return val if isinstance(val, uuid.UUID) else uuid.UUID(str(val))


async def upsert_contest(contest: dict[str, Any]) -> None:
    """Write full contest snapshot + runs into Postgres (Docker-backed DB)."""
    cid = _uuid(contest["id"])
    wid = _uuid(contest["workspace_id"])
    async with AsyncSessionLocal() as db:
        row = await db.get(AgentContest, cid)
        completed_at = None
        if contest.get("completed_at"):
            try:
                completed_at = datetime.fromisoformat(str(contest["completed_at"]).replace("Z", "+00:00"))
            except Exception:
                completed_at = datetime.now(timezone.utc)

        payload = {k: v for k, v in contest.items() if not str(k).startswith("_")}
        if row is None:
            row = AgentContest(
                id=cid,
                workspace_id=wid,
                prompt=contest.get("prompt") or "",
            )
            db.add(row)

        row.prompt = contest.get("prompt") or row.prompt
        row.status = contest.get("status") or row.status
        row.phase = contest.get("phase")
        row.task = contest.get("task") or {}
        row.winner_id = contest.get("winner_id")
        row.judge = contest.get("judge") or {}
        row.agents = contest.get("agents") or []
        row.chat = contest.get("chat") or []
        row.payload = payload
        row.completed_at = completed_at
        row.updated_at = datetime.now(timezone.utc)

        for run in contest.get("runs") or []:
            agent_id = run.get("agent_id")
            if not agent_id:
                continue
            existing = await db.scalar(
                select(AgentContestRun).where(
                    AgentContestRun.contest_id == cid,
                    AgentContestRun.agent_id == agent_id,
                )
            )
            if existing is None:
                existing = AgentContestRun(contest_id=cid, agent_id=agent_id)
                db.add(existing)
            existing.agent_name = run.get("agent_name") or ""
            existing.family = run.get("family") or ""
            existing.color = run.get("color") or ""
            existing.status = run.get("status") or "queued"
            existing.query = run.get("query") or ""
            existing.answer = run.get("answer") or ""
            existing.browser_pages = run.get("browser_pages") or []
            existing.records = run.get("records") or []
            existing.record_columns = run.get("record_columns") or []
            existing.record_count = int(run.get("record_count") or len(existing.records or []))
            existing.duration_ms = int(run.get("duration_ms") or 0)
            existing.score = run.get("score")
            existing.score_breakdown = run.get("score_breakdown") or {}
            existing.judge_notes = run.get("judge_notes")
            existing.scoring_status = run.get("scoring_status") or "waiting"
            existing.error = run.get("error")
            existing.feedback_applied = run.get("feedback_applied") or []
            existing.updated_at = datetime.now(timezone.utc)

        await db.commit()


async def append_event(
    *,
    contest_id: str,
    event_type: str,
    message: str = "",
    agent_id: str | None = None,
    data: dict[str, Any] | None = None,
) -> None:
    async with AsyncSessionLocal() as db:
        db.add(
            AgentContestEvent(
                contest_id=_uuid(contest_id),
                agent_id=agent_id,
                event_type=event_type,
                message=message,
                data=data or {},
            )
        )
        await db.commit()


async def load_lessons(workspace_id: uuid.UUID, agent_id: str, limit: int = 5) -> list[str]:
    async with AsyncSessionLocal() as db:
        rows = list(
            await db.scalars(
                select(AgentLesson)
                .where(
                    AgentLesson.workspace_id == workspace_id,
                    AgentLesson.agent_id == agent_id,
                    AgentLesson.active.is_(True),
                )
                .order_by(AgentLesson.weight.desc(), AgentLesson.created_at.desc())
                .limit(limit)
            )
        )
        return [r.lesson for r in rows]


async def load_memory(workspace_id: uuid.UUID, agent_id: str) -> dict[str, Any] | None:
    async with AsyncSessionLocal() as db:
        row = await db.scalar(
            select(AgentMemory).where(
                AgentMemory.workspace_id == workspace_id,
                AgentMemory.agent_id == agent_id,
            )
        )
        if not row:
            return None
        return {
            "agent_id": row.agent_id,
            "runs": row.runs,
            "wins": row.wins,
            "losses": row.losses,
            "avg_score": row.avg_score,
            "best_score": row.best_score,
            "total_records": row.total_records,
            "downloads": row.downloads,
            "strategy_bias": row.strategy_bias or {},
        }


def _lesson_from_notes(notes: str | None, score: float | None) -> str | None:
    if not notes:
        return None
    text = notes.strip()
    if len(text) < 20:
        return None
    prefix = "Improve next run: "
    if score is not None and score < 70:
        prefix = "Critical fix: "
    # keep short actionable slice
    return prefix + text[:280]


async def apply_contest_feedback(contest: dict[str, Any]) -> None:
    """Update memories + lessons after a contest completes (feedback loop)."""
    if contest.get("status") != "completed":
        return
    wid = _uuid(contest["workspace_id"])
    cid = _uuid(contest["id"])
    winner = contest.get("winner_id")

    async with AsyncSessionLocal() as db:
        for run in contest.get("runs") or []:
            agent_id = run.get("agent_id")
            if not agent_id:
                continue
            mem = await db.scalar(
                select(AgentMemory).where(
                    AgentMemory.workspace_id == wid,
                    AgentMemory.agent_id == agent_id,
                )
            )
            if mem is None:
                mem = AgentMemory(
                    workspace_id=wid,
                    agent_id=agent_id,
                    agent_name=run.get("agent_name") or agent_id,
                )
                db.add(mem)

            score = run.get("score")
            prev_runs = mem.runs or 0
            mem.runs = prev_runs + 1
            mem.agent_name = run.get("agent_name") or mem.agent_name
            if score is not None:
                mem.avg_score = ((mem.avg_score * prev_runs) + float(score)) / max(mem.runs, 1)
                mem.best_score = max(mem.best_score or 0.0, float(score))
            mem.total_records = (mem.total_records or 0) + int(run.get("record_count") or 0)
            if winner and agent_id == winner:
                mem.wins = (mem.wins or 0) + 1
                bias = dict(mem.strategy_bias or {})
                bias["prefer_broader_queries"] = bool(bias.get("prefer_broader_queries")) or (
                    (run.get("record_count") or 0) >= 10
                )
                bias["last_win_contest"] = str(cid)
                mem.strategy_bias = bias
            else:
                mem.losses = (mem.losses or 0) + 1
                bias = dict(mem.strategy_bias or {})
                bias["tighten_extraction"] = True
                mem.strategy_bias = bias

            lesson = _lesson_from_notes(run.get("judge_notes"), score if score is None else float(score))
            if lesson:
                db.add(
                    AgentLesson(
                        workspace_id=wid,
                        agent_id=agent_id,
                        contest_id=cid,
                        source="judge",
                        lesson=lesson,
                        weight=1.2 if (score is not None and float(score) < 70) else 1.0,
                    )
                )

            await append_event_session(
                db,
                contest_id=cid,
                event_type="feedback_recorded",
                agent_id=agent_id,
                message=f"Memory updated for {run.get('agent_name')}",
                data={"score": score, "winner": agent_id == winner},
            )

        await db.commit()


async def append_event_session(
    db: AsyncSession,
    *,
    contest_id: uuid.UUID,
    event_type: str,
    message: str = "",
    agent_id: str | None = None,
    data: dict[str, Any] | None = None,
) -> None:
    db.add(
        AgentContestEvent(
            contest_id=contest_id,
            agent_id=agent_id,
            event_type=event_type,
            message=message,
            data=data or {},
        )
    )


async def record_download(workspace_id: str, contest_id: str, agent_id: str) -> None:
    async with AsyncSessionLocal() as db:
        mem = await db.scalar(
            select(AgentMemory).where(
                AgentMemory.workspace_id == _uuid(workspace_id),
                AgentMemory.agent_id == agent_id,
            )
        )
        if mem:
            mem.downloads = (mem.downloads or 0) + 1
            db.add(
                AgentLesson(
                    workspace_id=_uuid(workspace_id),
                    agent_id=agent_id,
                    contest_id=_uuid(contest_id),
                    source="human",
                    lesson="Human downloaded this agent's CSV. Prefer similar extraction completeness next time.",
                    weight=1.5,
                )
            )
        await append_event_session(
            db,
            contest_id=_uuid(contest_id),
            event_type="csv_downloaded",
            agent_id=agent_id,
            message=f"CSV downloaded for {agent_id}",
        )
        await db.commit()


async def monitor_snapshot(workspace_id: str, limit: int = 20) -> dict[str, Any]:
    wid = _uuid(workspace_id)
    async with AsyncSessionLocal() as db:
        contests = list(
            await db.scalars(
                select(AgentContest)
                .where(AgentContest.workspace_id == wid)
                .order_by(AgentContest.created_at.desc())
                .limit(limit)
            )
        )
        memories = list(
            await db.scalars(select(AgentMemory).where(AgentMemory.workspace_id == wid))
        )
        lessons = list(
            await db.scalars(
                select(AgentLesson)
                .where(AgentLesson.workspace_id == wid, AgentLesson.active.is_(True))
                .order_by(AgentLesson.created_at.desc())
                .limit(50)
            )
        )
        events: list[AgentContestEvent] = []
        if contests:
            events = list(
                await db.scalars(
                    select(AgentContestEvent)
                    .where(AgentContestEvent.contest_id.in_([c.id for c in contests[:5]]))
                    .order_by(AgentContestEvent.ts.desc())
                    .limit(100)
                )
            )

        return {
            "contests": [
                {
                    "id": str(c.id),
                    "prompt": c.prompt,
                    "status": c.status,
                    "phase": c.phase,
                    "winner_id": c.winner_id,
                    "task": c.task,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                    "completed_at": c.completed_at.isoformat() if c.completed_at else None,
                }
                for c in contests
            ],
            "memories": [
                {
                    "agent_id": m.agent_id,
                    "agent_name": m.agent_name,
                    "runs": m.runs,
                    "wins": m.wins,
                    "losses": m.losses,
                    "avg_score": round(m.avg_score or 0, 2),
                    "best_score": round(m.best_score or 0, 2),
                    "total_records": m.total_records,
                    "downloads": m.downloads,
                    "strategy_bias": m.strategy_bias or {},
                }
                for m in memories
            ],
            "lessons": [
                {
                    "agent_id": l.agent_id,
                    "source": l.source,
                    "lesson": l.lesson,
                    "weight": l.weight,
                    "created_at": l.created_at.isoformat() if l.created_at else None,
                }
                for l in lessons
            ],
            "events": [
                {
                    "contest_id": str(e.contest_id),
                    "agent_id": e.agent_id,
                    "event_type": e.event_type,
                    "message": e.message,
                    "ts": e.ts.isoformat() if e.ts else None,
                    "data": e.data or {},
                }
                for e in events
            ],
        }
