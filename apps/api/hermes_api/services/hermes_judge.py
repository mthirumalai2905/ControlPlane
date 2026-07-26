"""Hermes LLM judge: live per-agent scoring + final comparative verdict."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

from hermes_api.config import get_settings


def _extract_json(text: str) -> dict[str, Any]:
    match = re.search(r"\{[\s\S]*\}", text)
    raw = match.group(0) if match else text
    return json.loads(raw)


async def _chat(system: str, user: str, *, temperature: float = 0.35) -> str:
    settings = get_settings()
    if not settings.deepseek_api_key:
        raise RuntimeError("DEEPSEEK_API_KEY missing; Hermes judge needs an LLM.")

    async with httpx.AsyncClient(timeout=75.0) as client:
        res = await client.post(
            f"{settings.llm_base_url.rstrip('/')}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.deepseek_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": temperature,
            },
        )
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]


def llm_configured() -> bool:
    return bool(get_settings().deepseek_api_key)


async def score_agent_live(
    *,
    prompt: str,
    run: dict[str, Any],
    peer_summaries: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Score one finished agent immediately with Hermes (DeepSeek)."""
    if run.get("status") != "completed":
        return {
            "score": 0.0,
            "notes": "Agent failed before producing an answer.",
            "breakdown": {
                "relevance": 0,
                "grounding": 0,
                "clarity": 0,
                "usefulness": 0,
                "efficiency": 0,
            },
            "method": "hermes_llm",
        }

    pages = run.get("browser_pages") or []
    sources = [
        {
            "title": p.get("title"),
            "url": p.get("url"),
            "snippet": (p.get("snippet") or "")[:220],
            "tavily_score": p.get("score"),
        }
        for p in pages[:6]
    ]

    system = (
        "You are Hermes, the Control Plane contest judge. "
        "Score ONE agent on a continuous 0-100 scale (one decimal allowed). "
        "Be strict and evidence-based. Do NOT use round placeholders like 70/80/90 unless earned. "
        "For scrape/dataset tasks, weight record count toward the requested target, field completeness, "
        "source quality, and dedupe cleanliness heavily. "
        "Return ONLY JSON with this shape:\n"
        "{"
        '"score": 73.4,'
        '"breakdown": {"relevance": 0-100, "grounding": 0-100, "clarity": 0-100, '
        '"usefulness": 0-100, "efficiency": 0-100},'
        '"notes": "2-3 concrete sentences citing strengths/weaknesses"'
        "}"
    )
    user = json.dumps(
        {
            "task": prompt,
            "agent": {
                "id": run.get("agent_id"),
                "name": run.get("agent_name"),
                "family": run.get("family"),
                "query": run.get("query"),
                "duration_ms": run.get("duration_ms"),
                "answer": (run.get("answer") or "")[:3200],
                "tavily_answer": (run.get("tavily_answer") or "")[:1200],
                "sources": sources,
                "record_count": run.get("record_count") or len(run.get("records") or []),
                "sample_records": (run.get("records") or [])[:5],
            },
            "peers_so_far": peer_summaries or [],
            "rubric": {
                "relevance": "Did it complete the asked task (including target volume for scrapes)?",
                "grounding": "Are records/answers backed by opened sources/URLs?",
                "clarity": "Is output coherent and well structured?",
                "usefulness": "Would an operator trust and download this dataset?",
                "efficiency": "Quality relative to time and source count (not speed alone)",
            },
        },
        indent=2,
    )

    content = await _chat(system, user, temperature=0.4)
    data = _extract_json(content)
    breakdown = data.get("breakdown") or {}
    score = float(data.get("score"))
    # Prefer average of breakdown if present for stability
    vals = [
        float(breakdown[k])
        for k in ("relevance", "grounding", "clarity", "usefulness", "efficiency")
        if breakdown.get(k) is not None
    ]
    if vals:
        blended = sum(vals) / len(vals)
        # Keep LLM headline score but pull toward rubric mean
        score = round((score * 0.55) + (blended * 0.45), 1)
    else:
        score = round(score, 1)
    score = max(0.0, min(100.0, score))

    return {
        "score": score,
        "notes": data.get("notes") or "Scored by Hermes.",
        "breakdown": {
            "relevance": breakdown.get("relevance"),
            "grounding": breakdown.get("grounding"),
            "clarity": breakdown.get("clarity"),
            "usefulness": breakdown.get("usefulness"),
            "efficiency": breakdown.get("efficiency"),
        },
        "method": "hermes_llm",
    }


async def comparative_verdict(
    *,
    prompt: str,
    runs: list[dict[str, Any]],
) -> dict[str, Any]:
    """Final Hermes comparative judgment; may nudge live scores after seeing everyone."""
    completed = [r for r in runs if r.get("status") == "completed"]
    if not completed:
        return {
            "winner_id": None,
            "scores": {},
            "rationale": "All agents failed.",
            "method": "hermes_llm",
        }

    payload = []
    for r in completed:
        payload.append(
            {
                "id": r["agent_id"],
                "name": r["agent_name"],
                "live_score": r.get("score"),
                "live_notes": r.get("judge_notes"),
                "breakdown": r.get("score_breakdown"),
                "duration_ms": r.get("duration_ms"),
                "sources": len(r.get("browser_pages") or []),
                "record_count": r.get("record_count") or len(r.get("records") or []),
                "answer": (r.get("answer") or "")[:2200],
            }
        )

    system = (
        "You are Hermes, final contest adjudicator. "
        "Compare agents head-to-head. You may adjust live scores slightly (±8) after relative review. "
        "Pick exactly one winner_id. Scores must stay continuous (one decimal), not canned tiers. "
        "Return ONLY JSON:\n"
        "{"
        '"winner_id":"<agent_id>",'
        '"scores":{"<agent_id>":{"score":71.2,"notes":"...","delta":1.5}},'
        '"rationale":"one paragraph explaining the ranking"'
        "}"
    )
    user = json.dumps({"task": prompt, "agents": payload}, indent=2)
    content = await _chat(system, user, temperature=0.25)
    data = _extract_json(content)
    scores = data.get("scores") or {}
    # Normalize score fields
    normalized: dict[str, dict[str, Any]] = {}
    for aid, detail in scores.items():
        if not isinstance(detail, dict):
            continue
        try:
            s = round(float(detail.get("score")), 1)
        except (TypeError, ValueError):
            continue
        normalized[aid] = {
            "score": max(0.0, min(100.0, s)),
            "notes": detail.get("notes") or "",
            "delta": detail.get("delta"),
        }

    winner_id = data.get("winner_id")
    if winner_id not in {r["agent_id"] for r in completed}:
        # Fall back to highest final/live score
        ranked = sorted(
            completed,
            key=lambda r: float((normalized.get(r["agent_id"]) or {}).get("score") or r.get("score") or 0),
            reverse=True,
        )
        winner_id = ranked[0]["agent_id"] if ranked else None

    return {
        "winner_id": winner_id,
        "scores": normalized,
        "rationale": data.get("rationale") or "Hermes comparative verdict.",
        "method": "hermes_llm",
    }
