from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class PostStatRequirementIn(BaseModel):
    skill_id: int
    min_level: int = Field(ge=1, le=4)


class PostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    content: str = Field(min_length=1)
    analysis_id: uuid.UUID | None = None
    recommendation_id: uuid.UUID | None = None
    is_public: bool = True
    tags: list[str] = []
    stat_requirements: list[PostStatRequirementIn] = []


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    content: str | None = Field(default=None, min_length=1)
    is_public: bool | None = None
    tags: list[str] | None = None
    stat_requirements: list[PostStatRequirementIn] | None = None


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    post_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    created_at: datetime
    updated_at: datetime


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    content: str
    analysis_id: uuid.UUID | None
    recommendation_id: uuid.UUID | None
    is_public: bool
    view_count: int
    created_at: datetime
    updated_at: datetime
    tags: list[TagRead] = []


class PostPage(BaseModel):
    page: int
    size: int
    total: int
    items: list[PostRead]

