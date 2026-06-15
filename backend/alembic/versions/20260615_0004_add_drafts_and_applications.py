"""add drafts and post applications

Revision ID: 20260615_0004
Revises: 20260615_0003
Create Date: 2026-06-15 22:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260615_0004"
down_revision = "20260615_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "posts",
        sa.Column("is_draft", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.create_table(
        "post_applications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("post_id", "user_id", name="uq_post_applications_post_user"),
    )
    op.create_index("ix_post_applications_post_id", "post_applications", ["post_id"])
    op.create_index("ix_post_applications_user_id", "post_applications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_post_applications_user_id", table_name="post_applications")
    op.drop_index("ix_post_applications_post_id", table_name="post_applications")
    op.drop_table("post_applications")
    op.drop_column("posts", "is_draft")
