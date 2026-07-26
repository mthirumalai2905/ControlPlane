"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-26
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("trust_defaults", postgresql.JSONB(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id")),
        sa.Column("role", sa.String(64), server_default="owner"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "registry_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False, unique=True),
        sa.Column("description", sa.Text(), server_default=""),
        sa.Column("repo_url", sa.String(1024)),
        sa.Column("author", sa.String(255)),
        sa.Column("classification", sa.String(32), server_default="community"),
        sa.Column("latest_version", sa.String(64)),
        sa.Column("install_methods", postgresql.JSONB(), server_default="{}"),
        sa.Column("tags", postgresql.ARRAY(sa.String()), server_default="{}"),
        sa.Column("readme_embedding", postgresql.JSONB()),
        sa.Column("hardcoded_adapter", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "installed_servers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column(
            "registry_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("registry_entries.id"),
            nullable=False,
        ),
        sa.Column("status", sa.String(32), server_default="pending"),
        sa.Column("version_installed", sa.String(64)),
        sa.Column("install_path", sa.String(1024)),
        sa.Column("container_id", sa.String(128)),
        sa.Column("endpoint", sa.String(512)),
        sa.Column("manifest", postgresql.JSONB(), server_default="{}"),
        sa.Column("config_dir_path", sa.String(1024)),
        sa.Column("health_score", sa.Float(), server_default="0"),
        sa.Column("last_healthy_at", sa.DateTime(timezone=True)),
        sa.Column("status_reason", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("workspace_id", "registry_entry_id", name="uq_workspace_registry"),
    )
    op.create_table(
        "secrets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column(
            "installed_server_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("installed_servers.id"),
        ),
        sa.Column("key_name", sa.String(255), nullable=False),
        sa.Column("encrypted_value", sa.LargeBinary(), nullable=False),
        sa.Column("kms_key_id", sa.String(255)),
        sa.Column("secret_type", sa.String(64), server_default="api_key"),
        sa.Column("refreshable", sa.Boolean(), server_default="false"),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("rotated_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "hermes_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column(
            "installed_server_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("installed_servers.id"),
        ),
        sa.Column("intent", sa.Text(), nullable=False),
        sa.Column("status", sa.String(32), server_default="pending"),
        sa.Column("trust_level_used", sa.String(32), server_default="confirm_every"),
        sa.Column("summary", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "hermes_steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hermes_tasks.id"), nullable=False),
        sa.Column("step_number", sa.Integer(), nullable=False),
        sa.Column("reasoning", sa.Text(), server_default=""),
        sa.Column("action", postgresql.JSONB(), server_default="{}"),
        sa.Column("tool_used", sa.String(128)),
        sa.Column("result", postgresql.JSONB(), server_default="{}"),
        sa.Column("duration_ms", sa.Integer()),
        sa.Column("outcome", sa.String(32), server_default="ok"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "installed_server_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("installed_servers.id"),
            nullable=False,
        ),
        sa.Column("symptom", sa.Text(), nullable=False),
        sa.Column("diagnosis", sa.String(128)),
        sa.Column("state", sa.String(32), server_default="detected"),
        sa.Column("remediation_applied", sa.Text()),
        sa.Column("resolved", sa.Boolean(), server_default="false"),
        sa.Column("escalated", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "metrics_raw",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "installed_server_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("installed_servers.id"),
            nullable=False,
        ),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("cpu_pct", sa.Float(), server_default="0"),
        sa.Column("mem_mb", sa.Float(), server_default="0"),
        sa.Column("p50_ms", sa.Float(), server_default="0"),
        sa.Column("p95_ms", sa.Float(), server_default="0"),
        sa.Column("p99_ms", sa.Float(), server_default="0"),
        sa.Column("req_count", sa.Integer(), server_default="0"),
        sa.Column("error_count", sa.Integer(), server_default="0"),
        sa.Column("reconnect_count", sa.Integer(), server_default="0"),
    )
    op.create_table(
        "logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("installed_server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("installed_servers.id")),
        sa.Column("hermes_task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("hermes_tasks.id")),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("level", sa.String(16), server_default="info"),
        sa.Column("source_module", sa.String(128), server_default="api"),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("correlation_id", sa.String(64)),
    )
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True)),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id")),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("target_type", sa.String(64)),
        sa.Column("target_id", sa.String(128)),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("metadata", postgresql.JSONB(), server_default="{}"),
    )
    op.create_index("ix_registry_entries_name", "registry_entries", ["name"])
    op.create_index("ix_installed_servers_status", "installed_servers", ["status"])
    op.create_index("ix_hermes_steps_task_id", "hermes_steps", ["task_id"])
    op.create_index("ix_metrics_raw_server_ts", "metrics_raw", ["installed_server_id", "ts"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("logs")
    op.drop_table("metrics_raw")
    op.drop_table("incidents")
    op.drop_table("hermes_steps")
    op.drop_table("hermes_tasks")
    op.drop_table("secrets")
    op.drop_table("installed_servers")
    op.drop_table("registry_entries")
    op.drop_table("users")
    op.drop_table("workspaces")
