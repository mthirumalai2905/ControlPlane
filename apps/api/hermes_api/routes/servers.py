from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from hermes_api.db import get_db
from hermes_api.models import InstalledServer, RegistryEntry
from hermes_api.schemas import InstallServerRequest, InstalledServerOut, RegistryEntryOut
from hermes_api.services.execution_sandbox import ExecutionSandbox
from hermes_api.services.installer import install_server
from hermes_api.services.package_export import (
    build_client_config,
    registry_download_info,
    zip_server_package,
)

router = APIRouter(tags=["registry", "servers"])


@router.get("/registry", response_model=list[RegistryEntryOut])
async def list_registry(
    search: str | None = None,
    tag: str | None = None,
    classification: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RegistryEntry)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                RegistryEntry.name.ilike(pattern),
                RegistryEntry.description.ilike(pattern),
                RegistryEntry.slug.ilike(pattern),
            )
        )
    if classification:
        stmt = stmt.where(RegistryEntry.classification == classification)
    if tag:
        stmt = stmt.where(RegistryEntry.tags.any(tag))
    stmt = stmt.order_by(RegistryEntry.name)
    return list(await db.scalars(stmt))


@router.get("/registry/{entry_id}", response_model=RegistryEntryOut)
async def get_registry_entry(entry_id: UUID, db: AsyncSession = Depends(get_db)):
    entry = await db.get(RegistryEntry, entry_id)
    if not entry:
        raise HTTPException(404, "Registry entry not found")
    return entry


@router.get("/registry/{entry_id}/download-info")
async def registry_entry_download_info(entry_id: UUID, db: AsyncSession = Depends(get_db)):
    entry = await db.get(RegistryEntry, entry_id)
    if not entry:
        raise HTTPException(404, "Registry entry not found")
    return registry_download_info(entry)


@router.post("/servers/install")
async def install_server_endpoint(body: InstallServerRequest, db: AsyncSession = Depends(get_db)):
    if not body.registry_entry_id and not body.registry_entry_slug:
        raise HTTPException(400, "Provide registry_entry_id or registry_entry_slug")

    if body.registry_entry_id:
        entry = await db.get(RegistryEntry, body.registry_entry_id)
    else:
        entry = await db.scalar(
            select(RegistryEntry).where(RegistryEntry.slug == body.registry_entry_slug)
        )
    if not entry:
        raise HTTPException(404, "Registry entry not found")

    try:
        result = await install_server(
            db,
            workspace_id=body.workspace_id,
            registry_entry=entry,
            sandbox=ExecutionSandbox(),
            provided_secrets=body.secrets,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    server = await db.scalar(
        select(InstalledServer)
        .where(InstalledServer.id == result.server.id)
        .options(selectinload(InstalledServer.registry_entry))
    )
    payload = InstalledServerOut.model_validate(server).model_dump()
    payload["needs_secrets"] = result.needs_secrets
    payload["task_id"] = str(result.task.id)
    return payload


@router.get("/servers", response_model=list[InstalledServerOut])
async def list_servers(
    workspace_id: UUID = Query(...),
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(InstalledServer)
        .where(InstalledServer.workspace_id == workspace_id)
        .options(selectinload(InstalledServer.registry_entry))
        .order_by(InstalledServer.created_at.desc())
    )
    if status:
        stmt = stmt.where(InstalledServer.status == status)
    return list(await db.scalars(stmt))


@router.get("/servers/{server_id}", response_model=InstalledServerOut)
async def get_server(server_id: UUID, db: AsyncSession = Depends(get_db)):
    server = await db.scalar(
        select(InstalledServer)
        .where(InstalledServer.id == server_id)
        .options(selectinload(InstalledServer.registry_entry))
    )
    if not server:
        raise HTTPException(404, "Server not found")
    return server


@router.post("/servers/{server_id}/restart", response_model=InstalledServerOut)
async def restart_server(server_id: UUID, db: AsyncSession = Depends(get_db)):
    server = await db.get(InstalledServer, server_id)
    if not server:
        raise HTTPException(404, "Server not found")
    sandbox = ExecutionSandbox()
    if server.container_id and not server.container_id.startswith("pid:"):
        sandbox.stop_container(server.container_id)
    entry = await db.get(RegistryEntry, server.registry_entry_id)
    result = await install_server(
        db, workspace_id=server.workspace_id, registry_entry=entry, sandbox=sandbox
    )
    server = await db.scalar(
        select(InstalledServer)
        .where(InstalledServer.id == result.server.id)
        .options(selectinload(InstalledServer.registry_entry))
    )
    return server


@router.delete("/servers/{server_id}", status_code=204)
async def delete_server(server_id: UUID, db: AsyncSession = Depends(get_db)):
    server = await db.get(InstalledServer, server_id)
    if not server:
        raise HTTPException(404, "Server not found")
    if server.container_id and not server.container_id.startswith("pid:"):
        ExecutionSandbox().stop_container(server.container_id)
    await db.delete(server)


@router.get("/servers/{server_id}/logs")
async def server_logs(server_id: UUID, tail: int = 200, db: AsyncSession = Depends(get_db)):
    server = await db.get(InstalledServer, server_id)
    if not server:
        raise HTTPException(404, "Server not found")
    if not server.container_id:
        return {"logs": "[hermes] no runtime"}
    if server.container_id.startswith("pid:"):
        from pathlib import Path

        log_file = Path(server.config_dir_path or "") / "logs" / "server.log"
        if log_file.exists():
            lines = log_file.read_text(encoding="utf-8", errors="replace").splitlines()[-tail:]
            return {"logs": "\n".join(lines)}
        return {"logs": f"[hermes] local process {server.container_id}"}
    return {"logs": ExecutionSandbox().get_logs(server.container_id, tail=tail)}


@router.get("/servers/{server_id}/metrics")
async def server_metrics(server_id: UUID, range: str = "1h", db: AsyncSession = Depends(get_db)):
    server = await db.get(InstalledServer, server_id)
    if not server:
        raise HTTPException(404, "Server not found")
    return {"server_id": str(server_id), "range": range, "points": []}


@router.get("/servers/{server_id}/tools")
async def server_tools(server_id: UUID, db: AsyncSession = Depends(get_db)):
    server = await db.get(InstalledServer, server_id)
    if not server:
        raise HTTPException(404, "Server not found")
    tools = (server.manifest or {}).get("tools") or []
    return {
        "server_id": str(server_id),
        "tools": [{"name": t, "verified": False} for t in tools],
    }


@router.get("/servers/{server_id}/client-config")
async def server_client_config(server_id: UUID, db: AsyncSession = Depends(get_db)):
    server = await db.scalar(
        select(InstalledServer)
        .where(InstalledServer.id == server_id)
        .options(selectinload(InstalledServer.registry_entry))
    )
    if not server or not server.registry_entry:
        raise HTTPException(404, "Server not found")
    return build_client_config(server, server.registry_entry)


@router.get("/servers/{server_id}/download")
async def download_server_package(server_id: UUID, db: AsyncSession = Depends(get_db)):
    server = await db.scalar(
        select(InstalledServer)
        .where(InstalledServer.id == server_id)
        .options(selectinload(InstalledServer.registry_entry))
    )
    if not server or not server.registry_entry:
        raise HTTPException(404, "Server not found")
    data = zip_server_package(server, server.registry_entry)
    filename = f"hermes-{server.registry_entry.slug}-{str(server.id)[:8]}.zip"
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
