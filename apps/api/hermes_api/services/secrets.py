"""Minimal secrets store for Phase 0 — Fernet local key (replace with KMS in Phase 3+)."""

from __future__ import annotations

import base64
import hashlib
import os
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from hermes_api.models import AuditLog, Secret


def _fernet():
    from cryptography.fernet import Fernet

    raw = os.environ.get("HERMES_SECRETS_KEY")
    if raw:
        key = raw.encode() if not raw.endswith("=") else raw.encode()
        # Accept either raw Fernet key or derive from passphrase
        try:
            return Fernet(key)
        except Exception:
            digest = hashlib.sha256(raw.encode()).digest()
            return Fernet(base64.urlsafe_b64encode(digest))
    # Dev-only default — NEVER use in production
    digest = hashlib.sha256(b"hermes-dev-only-insecure-key").digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_value(plaintext: str) -> bytes:
    return _fernet().encrypt(plaintext.encode("utf-8"))


def decrypt_value(token: bytes) -> str:
    return _fernet().decrypt(token).decode("utf-8")


async def store_secret(
    db: AsyncSession,
    *,
    workspace_id: UUID,
    key_name: str,
    value: str,
    installed_server_id: UUID | None = None,
    secret_type: str = "api_key",
    refreshable: bool = False,
    actor_id: UUID | None = None,
) -> Secret:
    secret = Secret(
        workspace_id=workspace_id,
        installed_server_id=installed_server_id,
        key_name=key_name,
        encrypted_value=encrypt_value(value),
        secret_type=secret_type,
        refreshable=refreshable,
    )
    db.add(secret)
    db.add(
        AuditLog(
            actor_id=actor_id,
            workspace_id=workspace_id,
            action="secret.create",
            target_type="secret",
            target_id=key_name,
            metadata_={"installed_server_id": str(installed_server_id) if installed_server_id else None},
        )
    )
    await db.flush()
    return secret


async def list_secret_metadata(db: AsyncSession, workspace_id: UUID) -> list[Secret]:
    result = await db.scalars(select(Secret).where(Secret.workspace_id == workspace_id))
    return list(result)
