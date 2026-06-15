"""Add per-user post view tracking."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260615_0002"
down_revision = "20260614_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "post_views",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "post_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("posts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("post_id", "user_id", name="uq_post_views_post_user"),
    )
    op.create_index("ix_post_views_post_id", "post_views", ["post_id"])
    op.create_index("ix_post_views_user_id", "post_views", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_post_views_user_id", table_name="post_views")
    op.drop_index("ix_post_views_post_id", table_name="post_views")
    op.drop_table("post_views")
