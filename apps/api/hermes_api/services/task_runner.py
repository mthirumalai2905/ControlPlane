"""Structured task runner: scrape/extract listing datasets via Tavily + Hermes."""

from __future__ import annotations

import csv
import io
import json
import re
from typing import Any
from urllib.parse import urlparse

from hermes_api.services.agent_roster import AgentProfile
from hermes_api.services import hermes_judge
from hermes_api.services.search_provider import normalize_provider, web_search

PROPERTY_COLUMNS = [
    "address",
    "city",
    "state",
    "zip",
    "price",
    "beds",
    "baths",
    "sqft",
    "property_type",
    "url",
    "source",
    "notes",
]

SITE_DOMAINS = {
    "redfin": ["redfin.com"],
    "streeteasy": ["streeteasy.com"],
    "zillow": ["zillow.com"],
    "realtor": ["realtor.com"],
}


def detect_task(prompt: str) -> dict[str, Any]:
    text = prompt.lower()
    count = 50
    m = re.search(r"\b(\d{1,3})\b", text)
    if m:
        count = max(5, min(int(m.group(1)), 100))

    sites: list[str] = []
    for name in SITE_DOMAINS:
        if name in text or name.replace(" ", "") in text:
            sites.append(name)
    if "street easy" in text or "streeteasy" in text:
        if "streeteasy" not in sites:
            sites.append("streeteasy")

    scrape_words = (
        "scrap",
        "scrape",
        "crawl",
        "extract",
        "listings",
        "properties",
        "property",
        "homes",
        "apartments",
        "for sale",
        "for rent",
        "csv",
        "dataset",
        "pull",
        "fetch listings",
    )
    is_scrape = any(w in text for w in scrape_words) or bool(sites)

    location = None
    loc = re.search(
        r"\bin\s+([A-Za-z .'-]{2,40}?)(?:\s+(?:from|on|via|using|for|and|with|,|\.|$))",
        prompt,
        flags=re.I,
    )
    if loc:
        location = loc.group(1).strip(" .,-")

    if not sites and is_scrape:
        sites = ["redfin", "streeteasy"]

    return {
        "kind": "property_scrape" if is_scrape else "research",
        "target_count": count,
        "sites": sites,
        "location": location or "",
        "raw_prompt": prompt,
    }


def _domains_for(sites: list[str]) -> list[str]:
    out: list[str] = []
    for s in sites:
        out.extend(SITE_DOMAINS.get(s, []))
    # unique preserve order
    seen = set()
    uniq = []
    for d in out:
        if d not in seen:
            seen.add(d)
            uniq.append(d)
    return uniq


def _source_from_url(url: str) -> str:
    host = urlparse(url).netloc.lower()
    for name, domains in SITE_DOMAINS.items():
        if any(d in host for d in domains):
            return name
    return host or "web"


def _heuristic_extract(pages: list[dict[str, Any]]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    price_re = re.compile(r"\$\s?[\d,]+(?:\.\d+)?")
    beds_re = re.compile(r"(\d+(?:\.\d+)?)\s*(?:bd|bed)", re.I)
    baths_re = re.compile(r"(\d+(?:\.\d+)?)\s*(?:ba|bath)", re.I)
    sqft_re = re.compile(r"([\d,]+)\s*(?:sq\.?\s*ft|sqft)", re.I)

    for p in pages:
        title = p.get("title") or ""
        content = p.get("content") or p.get("snippet") or ""
        blob = f"{title}\n{content}"
        price = price_re.search(blob)
        beds = beds_re.search(blob)
        baths = baths_re.search(blob)
        sqft = sqft_re.search(blob)
        address = title.split("|")[0].split("-")[0].strip()[:120] or title[:120]
        if not (price or beds or "home" in blob.lower() or "apt" in blob.lower() or "listing" in blob.lower()):
            # still keep listing-like URLs
            if not any(s in (p.get("url") or "") for s in ("redfin", "streeteasy", "zillow", "realtor")):
                continue
        rows.append(
            {
                "address": address,
                "city": "",
                "state": "",
                "zip": "",
                "price": price.group(0) if price else "",
                "beds": beds.group(1) if beds else "",
                "baths": baths.group(1) if baths else "",
                "sqft": sqft.group(1).replace(",", "") if sqft else "",
                "property_type": "",
                "url": p.get("url") or "",
                "source": _source_from_url(p.get("url") or ""),
                "notes": (content[:160] if content else ""),
            }
        )
    return rows


async def _llm_extract(prompt: str, pages: list[dict[str, Any]], need: int) -> list[dict[str, str]]:
    if not hermes_judge.llm_configured() or not pages:
        return _heuristic_extract(pages)

    payload_pages = [
        {
            "title": p.get("title"),
            "url": p.get("url"),
            "content": (p.get("content") or p.get("snippet") or "")[:500],
        }
        for p in pages[:25]
    ]
    system = (
        "Extract real-estate listing records from web snippets. "
        "Return ONLY JSON: {\"records\":[...]} where each record has keys: "
        f"{', '.join(PROPERTY_COLUMNS)}. "
        f"Extract up to {need} distinct listings. Use empty string when unknown. "
        "Do not invent URLs. Prefer concrete addresses and prices."
    )
    user = json.dumps({"task": prompt, "pages": payload_pages}, indent=2)
    try:
        # reuse hermes_judge chat
        content = await hermes_judge._chat(system, user, temperature=0.2)  # noqa: SLF001
        data = hermes_judge._extract_json(content)  # noqa: SLF001
        records = data.get("records") or []
        out: list[dict[str, str]] = []
        for r in records:
            if not isinstance(r, dict):
                continue
            row = {k: str(r.get(k) or "").strip() for k in PROPERTY_COLUMNS}
            if not row["url"] and not row["address"] and not row["price"]:
                continue
            if not row["source"] and row["url"]:
                row["source"] = _source_from_url(row["url"])
            out.append(row)
        return out or _heuristic_extract(pages)
    except Exception:
        return _heuristic_extract(pages)


def _dedupe(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for r in rows:
        key = (r.get("url") or "").rstrip("/").lower() or f"{r.get('address','').lower()}|{r.get('price','')}"
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def _queries_for(agent: AgentProfile, task: dict[str, Any]) -> list[str]:
    loc = task.get("location") or ""
    sites = task.get("sites") or ["redfin"]
    base = task.get("raw_prompt") or ""
    variants = [
        f"{base}",
        f"homes for sale {loc} site:{sites[0]}.com" if loc else f"homes for sale listings {sites[0]}",
        f"apartments for rent {loc}" if loc else "apartments for rent listings",
        f"{loc} real estate listings price bedrooms" if loc else "real estate listings price bedrooms",
        f"{loc} condo townhouse for sale" if loc else "condo townhouse for sale",
    ]
    if agent.style == "broad":
        variants += [
            f"{loc} open houses this week" if loc else "open houses listings",
            f"{loc} new listings {sites[0]}" if loc else f"new listings {sites[0]}",
        ]
    if agent.style == "analytical":
        variants += [
            f"{loc} property details beds baths sqft" if loc else "property details beds baths sqft price",
        ]
    if agent.style == "fast":
        variants = variants[:3]
    # unique
    out = []
    seen = set()
    for q in variants:
        q = q.strip()
        if q and q not in seen:
            seen.add(q)
            out.append(q)
    return out


async def run_property_scrape(
    agent: AgentProfile,
    prompt: str,
    api_key: str,
    task: dict[str, Any] | None = None,
    feedback_tips: list[str] | None = None,
    provider: str | None = None,
) -> dict[str, Any]:
    task = task or detect_task(prompt)
    provider = normalize_provider(provider)
    target = int(task.get("target_count") or 50)
    domains = _domains_for(task.get("sites") or [])
    queries = _queries_for(agent, task)
    tips = [t for t in (feedback_tips or []) if t and not t.startswith("bias:")]
    if tips:
        # Fold top lessons into an extra query variant
        queries.insert(0, f"{prompt}. Guidance: {tips[0][:180]}")

    browser_pages: list[dict[str, Any]] = []
    all_raw: list[dict[str, Any]] = []
    answers: list[str] = []

    # Agent styles change query breadth / depth
    max_results = 12 if agent.style == "broad" else 8 if agent.style != "fast" else 6
    depth = "advanced" if agent.style == "analytical" else agent.search_depth
    # Cap query fan-out for credits (Firecrawl can be cheaper for scrape+search combo)
    query_budget = min(len(queries), 5 if agent.style == "broad" else 4 if agent.style != "fast" else 3)
    if provider == "firecrawl":
        query_budget = min(query_budget, 3)

    for q in queries[:query_budget]:
        search = await web_search(
            q,
            provider=provider,
            api_key=api_key,
            search_depth=depth,
            max_results=max_results,
            include_answer=True,
            include_domains=domains or None,
        )
        if search.get("answer"):
            answers.append(search["answer"])
        for r in search.get("results") or []:
            page = {
                "title": r.get("title") or "Untitled",
                "url": r.get("url") or "",
                "snippet": (r.get("content") or "")[:400],
                "content": r.get("content") or "",
                "score": r.get("score"),
            }
            all_raw.append(page)
            if page["url"] and not any(b["url"] == page["url"] for b in browser_pages):
                browser_pages.append(
                    {
                        "title": page["title"],
                        "url": page["url"],
                        "snippet": page["snippet"],
                        "score": page["score"],
                    }
                )

    # Extract in chunks until target
    records: list[dict[str, str]] = []
    chunk_size = 18
    for i in range(0, len(all_raw), chunk_size):
        if len(records) >= target:
            break
        need = target - len(records)
        chunk = all_raw[i : i + chunk_size]
        extracted = await _llm_extract(prompt, chunk, need=min(need + 5, 25))
        records = _dedupe(records + extracted)

    records = records[:target]
    answer = (
        f"[{agent.name}] Collected {len(records)}/{target} property records "
        f"via {provider} from {', '.join(task.get('sites') or ['web'])}.\n"
        f"Sources opened: {len(browser_pages)}.\n"
        + (f"Notes: {answers[0][:400]}" if answers else "")
    )

    return {
        "query": queries[0] if queries else prompt,
        "answer": answer,
        "browser_pages": browser_pages,
        "tavily_answer": answers[0] if answers else "",
        "records": records,
        "record_columns": PROPERTY_COLUMNS,
        "task": task,
        "provider": provider,
        "status": "completed" if records else "completed",
        "error": None if records else "No structured listings extracted",
    }


def records_to_csv(records: list[dict[str, str]], columns: list[str] | None = None) -> str:
    cols = columns or PROPERTY_COLUMNS
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    writer.writeheader()
    for row in records:
        writer.writerow({k: row.get(k, "") for k in cols})
    return buf.getvalue()
