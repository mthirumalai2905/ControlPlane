from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from hermes_api.db import get_db
from hermes_api.models import HermesTask, Workspace
from hermes_api.schemas import (
    ChatRequest,
    HermesTaskOut,
    SecretCreate,
    SecretMetaOut,
    WorkspaceCreate,
    WorkspaceOut,
)
from hermes_api.services.secrets import list_secret_metadata, store_secret

router = APIRouter(tags=["workspaces", "tasks", "secrets"])


@router.post("/workspaces", response_model=WorkspaceOut)
async def create_workspace(body: WorkspaceCreate, db: AsyncSession = Depends(get_db)):
    ws = Workspace(name=body.name)
    db.add(ws)
    await db.flush()
    return ws


@router.get("/workspaces", response_model=list[WorkspaceOut])
async def list_workspaces(db: AsyncSession = Depends(get_db)):
    return list(await db.scalars(select(Workspace).order_by(Workspace.created_at)))


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(workspace_id: UUID, db: AsyncSession = Depends(get_db)):
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    return ws


@router.post("/chat", response_model=HermesTaskOut)
async def chat(body: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Hermes agent loop — match intent to registry and install / list servers."""
    from hermes_api.services.hermes_agent import handle_chat_intent

    ws = await db.get(Workspace, body.workspace_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    result = await handle_chat_intent(db, workspace_id=body.workspace_id, message=body.message)
    task = await db.scalar(
        select(HermesTask)
        .where(HermesTask.id == result.task.id)
        .options(selectinload(HermesTask.steps))
    )
    return task


@router.get("/tasks/{task_id}", response_model=HermesTaskOut)
async def get_task(task_id: UUID, db: AsyncSession = Depends(get_db)):
    task = await db.scalar(
        select(HermesTask)
        .where(HermesTask.id == task_id)
        .options(selectinload(HermesTask.steps))
    )
    if not task:
        raise HTTPException(404, "Task not found")
    return task


@router.get("/tasks", response_model=list[HermesTaskOut])
async def list_tasks(workspace_id: UUID, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(HermesTask)
        .where(HermesTask.workspace_id == workspace_id)
        .options(selectinload(HermesTask.steps))
        .order_by(HermesTask.created_at.desc())
        .limit(50)
    )
    return list(await db.scalars(stmt))


@router.post("/secrets", response_model=SecretMetaOut)
async def create_secret(body: SecretCreate, db: AsyncSession = Depends(get_db)):
    secret = await store_secret(
        db,
        workspace_id=body.workspace_id,
        installed_server_id=body.installed_server_id,
        key_name=body.key_name,
        value=body.value,
        secret_type=body.secret_type,
        refreshable=body.refreshable,
    )
    return secret


@router.get("/secrets", response_model=list[SecretMetaOut])
async def list_secrets(workspace_id: UUID, db: AsyncSession = Depends(get_db)):
    return await list_secret_metadata(db, workspace_id)
