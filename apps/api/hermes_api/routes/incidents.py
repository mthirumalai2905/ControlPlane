from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from hermes_api.db import get_db
from hermes_api.models import Incident
from hermes_api.schemas import IncidentOut

router = APIRouter(tags=["incidents"])


@router.get("/incidents", response_model=list[IncidentOut])
async def list_incidents(
    workspace_id: UUID | None = None,
    resolved: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Incident).order_by(Incident.created_at.desc()).limit(100)
    if resolved is not None:
        stmt = stmt.where(Incident.resolved == resolved)
    # workspace filter via join deferred; Phase 0 returns all
    return list(await db.scalars(stmt))


@router.post("/incidents/{incident_id}/resolve", response_model=IncidentOut)
async def resolve_incident(incident_id: UUID, db: AsyncSession = Depends(get_db)):
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(404, "Incident not found")
    from datetime import datetime, timezone

    incident.resolved = True
    incident.state = "resolved"
    incident.resolved_at = datetime.now(timezone.utc)
    await db.flush()
    return incident
