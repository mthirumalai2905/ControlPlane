"""Agent roster for Hermes contest harness (Phase 0)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AgentProfile:
    id: str
    name: str
    family: str
    tagline: str
    style: str
    search_depth: str
    max_results: int
    query_prefix: str
    color: str


AGENT_ROSTER: list[AgentProfile] = [
    AgentProfile(
        id="hermes-scout",
        name="Hermes Scout",
        family="hermes",
        tagline="Balanced research harness native",
        style="balanced",
        search_depth="basic",
        max_results=5,
        query_prefix="",
        color="#2f5d3a",
    ),
    AgentProfile(
        id="llama-researcher",
        name="Llama Researcher",
        family="llama",
        tagline="Broad coverage, many sources",
        style="broad",
        search_depth="basic",
        max_results=8,
        query_prefix="comprehensive overview: ",
        color="#c4895e",
    ),
    AgentProfile(
        id="kimi-analyst",
        name="Kimi Analyst",
        family="kimi",
        tagline="Deep analytical pass",
        style="analytical",
        search_depth="advanced",
        max_results=5,
        query_prefix="analyze key facts and tradeoffs: ",
        color="#4a6cff",
    ),
    AgentProfile(
        id="deepseek-racer",
        name="DeepSeek Racer",
        family="deepseek",
        tagline="Fast lean answer",
        style="fast",
        search_depth="basic",
        max_results=3,
        query_prefix="concise factual answer: ",
        color="#8b5cf6",
    ),
]


def list_agents() -> list[dict]:
    return [
        {
            "id": a.id,
            "name": a.name,
            "family": a.family,
            "tagline": a.tagline,
            "style": a.style,
            "color": a.color,
        }
        for a in AGENT_ROSTER
    ]


def get_agents(ids: list[str] | None = None, count: int | None = None) -> list[AgentProfile]:
    if ids:
        by_id = {a.id: a for a in AGENT_ROSTER}
        picked = [by_id[i] for i in ids if i in by_id]
        if picked:
            return picked
    n = count or 2
    n = max(2, min(n, len(AGENT_ROSTER)))
    return list(AGENT_ROSTER[:n])
