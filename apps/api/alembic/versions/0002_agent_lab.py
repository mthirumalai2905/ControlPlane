"""agent lab persistence: contests, feedback, memory

Revision ID: 0002_agent_lab
Revises: 0001_initial
Create Date: 2026-07-26
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_agent_lab"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_contests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("status", sa.String(32), server_default="running"),
        sa.Column("phase", sa.String(64)),
        sa.Column("task", postgresql.JSONB(), server_default="{}"),
        sa.Column("winner_id", sa.String(128)),
        sa.Column("judge", postgresql.JSONB(), server_default="{}"),
        sa.Column("agents", postgresql.JSONB(), server_default="[]"),
        sa.Column("chat", postgresql.JSONB(), server_default="[]"),
        sa.Column("payload", postgresql.JSONB(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_agent_contests_workspace_id", "agent_contests", ["workspace_id"])
    op.create_index("ix_agent_contests_status", "agent_contests", ["status"])

    op.create_table(
        "agent_contest_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "contest_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("agent_contests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("agent_id", sa.String(128), nullable=False),
        sa.Column("agent_name", sa.String(255), server_default=""),
        sa.Column("family", sa.String(64), server_default=""),
        sa.Column("color", sa.String(32), server_default=""),
        sa.Column("status", sa.String(32), server_default="queued"),
        sa.Column("query", sa.Text(), server_default=""),
        sa.Column("answer", sa.Text(), server_default=""),
        sa.Column("browser_pages", postgresql.JSONB(), server_default="[]"),
        sa.Column("records", postgresql.JSONB(), server_default="[]"),
        sa.Column("record_columns", postgresql.JSONB(), server_default="[]"),
        sa.Column("record_count", sa.Integer(), server_default="0"),
        sa.Column("duration_ms", sa.Integer(), server_default="0"),
        sa.Column("score", sa.Float()),
        sa.Column("score_breakdown", postgresql.JSONB(), server_default="{}"),
        sa.Column("judge_notes", sa.Text()),
        sa.Column("scoring_status", sa.String(32), server_default="waiting"),
        sa.Column("error", sa.Text()),
        sa.Column("feedback_applied", postgresql.JSONB(), server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("contest_id", "agent_id", name="uq_contest_agent"),
    )
    op.create_index("ix_agent_contest_runs_agent_id", "agent_contest_runs", ["agent_id"])

    op.create_table(
        "agent_contest_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "contest_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("agent_contests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("agent_id", sa.String(128)),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("message", sa.Text(), server_default=""),
        sa.Column("data", postgresql.JSONB(), server_default="{}"),
        sa.Column("ts", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_agent_contest_events_contest_id", "agent_contest_events", ["contest_id"])
    op.create_index("ix_agent_contest_events_agent_id", "agent_contest_events", ["agent_id"])
    op.create_index("ix_agent_contest_events_ts", "agent_contest_events", ["ts"])

    op.create_table(
        "agent_memories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("agent_id", sa.String(128), nullable=False),
        sa.Column("agent_name", sa.String(255), server_default=""),
        sa.Column("runs", sa.Integer(), server_default="0"),
        sa.Column("wins", sa.Integer(), server_default="0"),
        sa.Column("losses", sa.Integer(), server_default="0"),
        sa.Column("avg_score", sa.Float(), server_default="0"),
        sa.Column("best_score", sa.Float(), server_default="0"),
        sa.Column("total_records", sa.Integer(), server_default="0"),
        sa.Column("downloads", sa.Integer(), server_default="0"),
        sa.Column("strategy_bias", postgresql.JSONB(), server_default="{}"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("workspace_id", "agent_id", name="uq_workspace_agent_memory"),
    )
    op.create_index("ix_agent_memories_workspace_id", "agent_memories", ["workspace_id"])

    op.create_table(
        "agent_lessons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("agent_id", sa.String(128), nullable=False),
        sa.Column("contest_id", postgresql.UUID(as_uuid=True)),
        sa.Column("source", sa.String(64), server_default="judge"),
        sa.Column("lesson", sa.Text(), nullable=False),
        sa.Column("weight", sa.Float(), server_default="1"),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_agent_lessons_workspace_id", "agent_lessons", ["workspace_id"])
    op.create_index("ix_agent_lessons_agent_id", "agent_lessons", ["agent_id"])


def downgrade() -> None:
    op.drop_table("agent_lessons")
    op.drop_table("agent_memories")
    op.drop_table("agent_contest_events")
    op.drop_table("agent_contest_runs")
    op.drop_table("agent_contests")
