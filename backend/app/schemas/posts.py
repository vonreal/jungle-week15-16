from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class PostStatRequirementIn(BaseModel):
    skill_id: int
    min_level: int = Field(ge=1, le=4)


class PostCreate(BaseModel):
    title: str = Field(default="", max_length=180)
    content: str = ""
    analysis_id: uuid.UUID | None = None
    recommendation_id: uuid.UUID | None = None
    is_public: bool = True
    is_draft: bool = False
    recruit_status: str = Field(default="open", pattern="^(open|closed)$")
    tags: list[str] = []
    stat_requirements: list[PostStatRequirementIn] = []

    @model_validator(mode="after")
    def validate_publish_content(self) -> "PostCreate":
        self.title = self.title.strip()
        self.content = self.content.strip()
        if not self.is_draft and (not self.title or not self.content):
            raise ValueError("게시글 제목과 내용을 입력해주세요.")
        if self.is_draft and not self.title:
            self.title = "제목 없는 임시글"
        return self


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=180)
    content: str | None = None
    is_public: bool | None = None
    is_draft: bool | None = None
    recruit_status: str | None = Field(default=None, pattern="^(open|closed)$")
    tags: list[str] | None = None
    stat_requirements: list[PostStatRequirementIn] | None = None


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1)


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    post_id: uuid.UUID
    user_id: uuid.UUID
    user_nickname: str
    content: str
    created_at: datetime
    updated_at: datetime


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    author_nickname: str
    title: str
    content: str
    analysis_id: uuid.UUID | None
    recommendation_id: uuid.UUID | None
    is_public: bool
    is_draft: bool
    recruit_status: str
    view_count: int
    created_at: datetime
    updated_at: datetime
    tags: list[TagRead] = []


class PostApplicationRead(BaseModel):
    id: int
    post_id: uuid.UUID
    user_id: uuid.UUID
    user_nickname: str
    status: str
    created_at: datetime


class PostApplicationStatus(BaseModel):
    is_applied: bool
    status: str | None = None
    count: int
    pending_count: int = 0
    approved_count: int = 0


class PostApplicationUpdate(BaseModel):
    status: str = Field(pattern="^(pending|approved|rejected)$")


class MyPostApplicationRead(PostApplicationRead):
    post: PostRead


class PostPage(BaseModel):
    page: int
    size: int
    total: int
    items: list[PostRead]
