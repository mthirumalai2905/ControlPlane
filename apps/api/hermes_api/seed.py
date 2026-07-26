"""Seed Default workspace + full MCP catalog."""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from hermes_api.catalog import CATALOG
from hermes_api.db import AsyncSessionLocal
from hermes_api.models import RegistryEntry, Workspace


def _entry_payload(item: dict) -> dict:
    methods = {k: v for k, v in item["install_methods"].items()}
    methods["package_url"] = item.get("package_url")
    methods["source_subdir"] = item["install_methods"].get("source_subdir")
    methods["_meta"] = {
        "auth_type": item.get("auth_type", "none"),
        "required_env": item.get("required_env", []),
        "tools_hint": item.get("tools_hint", []),
        "start_args_template": item.get("start_args_template", []),
        "package_url": item.get("package_url"),
    }
    return {
        "name": item["name"],
        "slug": item["slug"],
        "description": item["description"],
        "repo_url": item.get("repo_url"),
        "author": item.get("author"),
        "classification": item.get("classification", "community"),
        "latest_version": item.get("latest_version", "latest"),
        "install_methods": methods,
        "tags": item.get("tags", []),
        "hardcoded_adapter": None,
    }


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        ws = await db.scalar(select(Workspace).where(Workspace.name == "Default"))
        if not ws:
            ws = Workspace(name="Default", trust_defaults={"install": "confirm_every"})
            db.add(ws)
            print("Created workspace: Default")
        else:
            print(f"Workspace exists: {ws.id}")

        for item in CATALOG:
            payload = _entry_payload(item)
            entry = await db.scalar(select(RegistryEntry).where(RegistryEntry.slug == payload["slug"]))
            if not entry:
                entry = RegistryEntry(**payload)
                db.add(entry)
                print(f"  + {payload['slug']}")
            else:
                for k, v in payload.items():
                    setattr(entry, k, v)
                print(f"  ~ {payload['slug']}")

        await db.commit()
        await db.refresh(ws)
        print(f"\nWorkspace ID: {ws.id}")
        print(f"Catalog size: {len(CATALOG)}")
        print("Open http://localhost:3000/registry to connect MCP servers.")


if __name__ == "__main__":
    asyncio.run(seed())
