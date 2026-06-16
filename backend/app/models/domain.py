from __future__ import annotations

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nickname: Mapped[str] = mapped_column(String(80), nullable=False)
    target_job: Mapped[str | None] = mapped_column(String(120))
    target_company: Mapped[str | None] = mapped_column(String(120))
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    skills: Mapped[list[UserSkill]] = relationship(back_populates="user", cascade="all, delete-orphan")
    posts: Mapped[list[Post]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Skill(Base):
    __tablename__ = "skills"
    __table_args__ = (UniqueConstraint("category", "name", name="uq_skills_category_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    user_skills: Mapped[list[UserSkill]] = relationship(back_populates="skill")


class UserSkill(TimestampMixin, Base):
    __tablename__ = "user_skills"
    __table_args__ = (
        UniqueConstraint("user_id", "skill_id", name="uq_user_skills_user_skill"),
        CheckConstraint("level BETWEEN 1 AND 4", name="ck_user_skills_level"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"))
    level: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    user: Mapped[User] = relationship(back_populates="skills")
    skill: Mapped[Skill] = relationship(back_populates="user_skills")


class UserDocument(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "user_documents"
    __table_args__ = (
        CheckConstraint("type IN ('resume','portfolio','benchmark')", name="ck_user_documents_type"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str | None] = mapped_column(Text)
    raw_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    experiences: Mapped[list[UserExperience]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
    )


class UserExperience(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "user_experiences"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user_documents.id", ondelete="SET NULL"),
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    document: Mapped[UserDocument | None] = relationship(back_populates="experiences")


class JobDescription(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "job_descriptions"
    __table_args__ = (
        CheckConstraint("input_type IN ('link','text','image')", name="ck_job_descriptions_input_type"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    company: Mapped[str | None] = mapped_column(String(160))
    source_url: Mapped[str | None] = mapped_column(Text)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    input_type: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    analyses: Mapped[list[JDAnalysis]] = relationship(back_populates="jd", cascade="all, delete-orphan")
    requirements: Mapped[list[JDRequirement]] = relationship(
        back_populates="jd",
        cascade="all, delete-orphan",
    )


class JDAnalysis(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "jd_analyses"

    jd_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("job_descriptions.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    gap_summary: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    jd: Mapped[JobDescription] = relationship(back_populates="analyses")
    classifications: Mapped[list[ExperienceClassification]] = relationship(
        back_populates="analysis",
        cascade="all, delete-orphan",
    )


class JDRequirement(Base):
    __tablename__ = "jd_requirements"
    __table_args__ = (
        CheckConstraint("importance IN ('required','preferred')", name="ck_jd_requirements_importance"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    jd_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("job_descriptions.id", ondelete="CASCADE"))
    skill_name: Mapped[str] = mapped_column(String(120), nullable=False)
    importance: Mapped[str] = mapped_column(String(20), nullable=False)

    jd: Mapped[JobDescription] = relationship(back_populates="requirements")


class ExperienceClassification(Base):
    __tablename__ = "experience_classifications"
    __table_args__ = (
        CheckConstraint(
            "classification IN ('unrelated','essential','core')",
            name="ck_experience_classifications_classification",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("jd_analyses.id", ondelete="CASCADE"))
    experience_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user_experiences.id", ondelete="CASCADE"),
    )
    classification: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)

    analysis: Mapped[JDAnalysis] = relationship(back_populates="classifications")
    experience: Mapped[UserExperience] = relationship()


class PortfolioRecommendation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "portfolio_recommendations"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    ideal_version: Mapped[str] = mapped_column(Text, nullable=False)
    realistic_version: Mapped[str] = mapped_column(Text, nullable=False)
    action_plan: Mapped[str] = mapped_column(Text, nullable=False)
    based_on_jd_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Post(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "posts"
    __table_args__ = (
        CheckConstraint("recruit_status IN ('open','closed')", name="ck_posts_recruit_status"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(180), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("jd_analyses.id", ondelete="SET NULL"),
    )
    recommendation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("portfolio_recommendations.id", ondelete="SET NULL"),
    )
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    is_draft: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    recruit_status: Mapped[str] = mapped_column(String(20), default="open", server_default="open", nullable=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    user: Mapped[User] = relationship(back_populates="posts")
    comments: Mapped[list[Comment]] = relationship(back_populates="post", cascade="all, delete-orphan")
    applications: Mapped[list[PostApplication]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
    )
    views: Mapped[list[PostView]] = relationship(back_populates="post", cascade="all, delete-orphan")
    tags: Mapped[list[Tag]] = relationship(secondary="post_tags", back_populates="posts")
    stat_requirements: Mapped[list[PostStatRequirement]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
    )

    @property
    def author_nickname(self) -> str:
        return self.user.nickname if self.user is not None else "CareerBuddy 사용자"


class PostStatRequirement(Base):
    __tablename__ = "post_stat_requirements"
    __table_args__ = (
        CheckConstraint("min_level BETWEEN 1 AND 4", name="ck_post_stat_requirements_min_level"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"))
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"))
    min_level: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    post: Mapped[Post] = relationship(back_populates="stat_requirements")
    skill: Mapped[Skill] = relationship()


class Comment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "comments"

    post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text, nullable=False)

    post: Mapped[Post] = relationship(back_populates="comments")
    user: Mapped[User] = relationship()

    @property
    def user_nickname(self) -> str:
        return self.user.nickname if self.user is not None else "CareerBuddy 사용자"


class PostView(Base):
    __tablename__ = "post_views"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_post_views_post_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    post: Mapped[Post] = relationship(back_populates="views")
    user: Mapped[User] = relationship()


class PostApplication(Base):
    __tablename__ = "post_applications"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_applications_post_user"),
        CheckConstraint(
            "status IN ('pending','approved','rejected')",
            name="ck_post_applications_status",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    post: Mapped[Post] = relationship(back_populates="applications")
    user: Mapped[User] = relationship()


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)

    posts: Mapped[list[Post]] = relationship(secondary="post_tags", back_populates="tags")


class PostTag(Base):
    __tablename__ = "post_tags"

    post_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class DocumentEmbedding(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "document_embeddings"
    __table_args__ = (
        CheckConstraint("source_type IN ('jd','resume','portfolio')", name="ck_document_embeddings_source_type"),
    )

    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
