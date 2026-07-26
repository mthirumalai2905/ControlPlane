"""Firecrawl Search / Scrape client (normalized to Tavily-like results)."""

from __future__ import annotations

from typing import Any

import httpx

from hermes_api.config import get_settings

BASE = "https://api.firecrawl.dev/v2"


def _key(api_key: str | None = None) -> str:
    key = (api_key or get_settings().firecrawl_api_key or "").strip()
    if not key:
        raise ValueError("FIRECRAWL_API_KEY is not configured")
    return key


def _headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def _normalize_items(data: Any) -> list[dict[str, Any]]:
    items: list[Any] = []
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        for k in ("web", "news", "results", "data"):
            if isinstance(data.get(k), list):
                items = data[k]
                break
        if not items and data.get("url"):
            items = [data]
    out: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        title = item.get("title") or (item.get("metadata") or {}).get("title") or ""
        url = item.get("url") or ""
        content = (
            item.get("description")
            or item.get("markdown")
            or item.get("content")
            or item.get("snippet")
            or ""
        )
        if isinstance(content, dict):
            content = content.get("markdown") or content.get("text") or str(content)
        out.append(
            {
                "title": str(title),
                "url": str(url),
                "content": str(content)[:4000],
                "score": item.get("score"),
            }
        )
    return out


async def firecrawl_search(
    query: str,
    *,
    api_key: str | None = None,
    max_results: int = 5,
    include_answer: bool = True,
    include_domains: list[str] | None = None,
) -> dict[str, Any]:
    key = _key(api_key)
    q = query
    if include_domains:
        # Firecrawl search supports site: operators in query
        site_bits = " OR ".join(f"site:{d}" for d in include_domains[:3])
        q = f"({q}) ({site_bits})"

    payload: dict[str, Any] = {
        "query": q,
        "limit": max(1, min(int(max_results), 20)),
    }
    # Pull light markdown to improve extraction without full crawl credit burn
    payload["scrapeOptions"] = {
        "formats": ["markdown"],
        "onlyMainContent": True,
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        res = await client.post(f"{BASE}/search", headers=_headers(key), json=payload)
        res.raise_for_status()
        body = res.json()

    data = body.get("data", body)
    results = _normalize_items(data)
    answer = ""
    if include_answer and results:
        # Lightweight synthetic answer from top snippets (saves an extra LLM call)
        answer = " | ".join(
            f"{r['title']}: {(r.get('content') or '')[:160]}" for r in results[:3] if r.get("title")
        )

    return {
        "query": query,
        "answer": answer,
        "results": results,
        "raw": {"provider": "firecrawl", "success": body.get("success", True)},
    }


async def firecrawl_scrape(url: str, *, api_key: str | None = None) -> dict[str, Any]:
    key = _key(api_key)
    payload = {"url": url, "formats": ["markdown"], "onlyMainContent": True}
    async with httpx.AsyncClient(timeout=90.0) as client:
        res = await client.post(f"{BASE}/scrape", headers=_headers(key), json=payload)
        res.raise_for_status()
        body = res.json()
    data = body.get("data") or {}
    md = data.get("markdown") or ""
    meta = data.get("metadata") or {}
    return {
        "title": meta.get("title") or url,
        "url": url,
        "content": md[:8000],
        "score": None,
    }
