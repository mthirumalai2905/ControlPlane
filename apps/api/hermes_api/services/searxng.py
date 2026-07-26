"""SearXNG metasearch client (normalized to Tavily-like results).

Uses the public Search API: GET/POST /search?q=...&format=json
Docs: https://docs.searxng.org/dev/search_api.html

Many public instances disable JSON. Prefer a self-hosted instance
(docker compose service `searxng`) with formats including json.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import urljoin

import httpx

from hermes_api.config import get_settings


def _base_url(url: str | None = None) -> str:
    raw = (url or get_settings().searxng_base_url or "").strip().rstrip("/")
    if not raw:
        raise ValueError(
            "SEARXNG_BASE_URL is not configured. "
            "Start the free SearXNG container or set SEARXNG_BASE_URL."
        )
    return raw


async def searxng_search(
    query: str,
    *,
    base_url: str | None = None,
    max_results: int = 5,
    include_answer: bool = True,
    include_domains: list[str] | None = None,
    categories: str = "general",
) -> dict[str, Any]:
    root = _base_url(base_url)
    q = query
    if include_domains:
        site_bits = " OR ".join(f"site:{d}" for d in include_domains[:3])
        q = f"({q}) ({site_bits})"

    params = {
        "q": q,
        "format": "json",
        "categories": categories,
        "pageno": 1,
        "language": "en",
    }

    endpoint = urljoin(root + "/", "search")
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        res = await client.get(
            endpoint,
            params=params,
            headers={"Accept": "application/json", "User-Agent": "HermesControlPlane/0.1"},
        )
        if res.status_code == 403:
            raise ValueError(
                "SearXNG refused JSON format (403). Enable formats.json on the instance "
                "or use the bundled searxng docker service."
            )
        res.raise_for_status()
        body = res.json()

    results: list[dict[str, Any]] = []
    for item in body.get("results") or []:
        if not isinstance(item, dict):
            continue
        results.append(
            {
                "title": str(item.get("title") or "Untitled"),
                "url": str(item.get("url") or ""),
                "content": str(item.get("content") or item.get("title") or "")[:4000],
                "score": item.get("score"),
            }
        )
        if len(results) >= max(1, int(max_results)):
            break

    answer = ""
    if include_answer:
        answers = body.get("answers") or []
        if answers:
            # answers can be strings or {answer: ...}
            first = answers[0]
            if isinstance(first, dict):
                answer = str(first.get("answer") or first.get("content") or "")[:800]
            else:
                answer = str(first)[:800]
        elif results:
            answer = " | ".join(
                f"{r['title']}: {(r.get('content') or '')[:140]}" for r in results[:3]
            )

    return {
        "query": query,
        "answer": answer,
        "results": results,
        "raw": {
            "provider": "searxng",
            "number_of_results": body.get("number_of_results"),
            "engine": root,
        },
    }
