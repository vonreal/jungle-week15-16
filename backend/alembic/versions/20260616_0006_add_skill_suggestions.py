"""add skill suggestions

Revision ID: 20260616_0006
Revises: 20260616_0005
Create Date: 2026-06-16 16:20:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260616_0006"
down_revision = "20260616_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "skill_suggestions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user_documents.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=30), server_default="document", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending','accepted','ignored')",
            name="ck_skill_suggestions_status",
        ),
    )
    op.create_index("ix_skill_suggestions_user_status", "skill_suggestions", ["user_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_skill_suggestions_user_status", table_name="skill_suggestions")
    op.drop_table("skill_suggestions")
