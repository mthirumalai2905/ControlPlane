"""Tavily Search client for agent research contests."""

from __future__ import annotations

from typing import Any

import httpx

from hermes_api.config import get_settings


async def tavily_search(
    query: str,
    *,
    api_key: str | None = None,
    search_depth: str = "basic",
    max_results: int = 5,
    include_answer: bool = True,
    include_domains: list[str] | None = None,
) -> dict[str, Any]:
    key = (api_key or get_settings().tavily_api_key or "").strip()
    if not key:
        raise ValueError("TAVILY_API_KEY is not configured")

    payload: dict[str, Any] = {
        "query": query,
        "search_depth": search_depth,
        "max_results": max(1, min(int(max_results), 20)),
        "include_answer": include_answer,
    }
    if include_domains:
        payload["include_domains"] = include_domains

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            "https://api.tavily.com/search",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {key}",
            },
            json=payload,
        )
        res.raise_for_status()
        data = res.json()

    results = []
    for item in data.get("results") or []:
        results.append(
            {
                "title": item.get("title") or "",
                "url": item.get("url") or "",
                "content": item.get("content") or "",
                "score": item.get("score"),
            }
        )
    return {
        "query": query,
        "answer": data.get("answer") or "",
        "results": results,
        "raw": {"response_time": data.get("response_time")},
    }
