"""add recruitment and application status

Revision ID: 20260616_0005
Revises: 20260615_0004
Create Date: 2026-06-16 10:40:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260616_0005"
down_revision = "20260615_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "posts",
        sa.Column("recruit_status", sa.String(length=20), server_default="open", nullable=False),
    )
    op.create_check_constraint(
        "ck_posts_recruit_status",
        "posts",
        "recruit_status IN ('open','closed')",
    )
    op.add_column(
        "post_applications",
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
    )
    op.create_check_constraint(
        "ck_post_applications_status",
        "post_applications",
        "status IN ('pending','approved','rejected')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_post_applications_status", "post_applications", type_="check")
    op.drop_column("post_applications", "status")
    op.drop_constraint("ck_posts_recruit_status", "posts", type_="check")
    op.drop_column("posts", "recruit_status")
