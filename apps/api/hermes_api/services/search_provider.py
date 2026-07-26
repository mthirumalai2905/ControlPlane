"""Unified web search provider: tavily | firecrawl | searxng."""

from __future__ import annotations

from typing import Any, Literal

from hermes_api.config import get_settings
from hermes_api.services.firecrawl import firecrawl_search
from hermes_api.services.searxng import searxng_search
from hermes_api.services.tavily import tavily_search

Provider = Literal["tavily", "firecrawl", "searxng"]

_ALIASES = {
    "tavily": "tavily",
    "firecrawl": "firecrawl",
    "searxng": "searxng",
    "searx": "searxng",
}


def normalize_provider(value: str | None) -> Provider:
    v = (value or get_settings().search_provider or "tavily").strip().lower()
    return _ALIASES.get(v, "tavily")  # type: ignore[return-value]


async def web_search(
    query: str,
    *,
    provider: str | None = None,
    api_key: str | None = None,
    search_depth: str = "basic",
    max_results: int = 5,
    include_answer: bool = True,
    include_domains: list[str] | None = None,
) -> dict[str, Any]:
    """api_key is the provider credential (API key) or SearXNG base URL."""
    prov = normalize_provider(provider)
    if prov == "firecrawl":
        data = await firecrawl_search(
            query,
            api_key=api_key,
            max_results=max_results,
            include_answer=include_answer,
            include_domains=include_domains,
        )
    elif prov == "searxng":
        data = await searxng_search(
            query,
            base_url=api_key,
            max_results=max_results,
            include_answer=include_answer,
            include_domains=include_domains,
        )
    else:
        data = await tavily_search(
            query,
            api_key=api_key,
            search_depth=search_depth,
            max_results=max_results,
            include_answer=include_answer,
            include_domains=include_domains,
        )
    data["provider"] = prov
    return data
