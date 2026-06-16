from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SkillRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    name: str
    description: str | None = None


class UserSkillUpsert(BaseModel):
    skill_id: int
    level: int = Field(ge=1, le=4)


class UserSkillCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=40)
    level: int = Field(ge=1, le=4)
    description: str | None = None


class SkillSuggestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: uuid.UUID
    document_id: uuid.UUID | None
    category: str
    name: str
    description: str | None
    source: str
    status: str
    created_at: datetime


class SkillSuggestionAccept(BaseModel):
    level: int = Field(ge=1, le=4)


class UserSkillRead(BaseModel):
    id: int
    skill: SkillRead
    level: int


class RadarPoint(BaseModel):
    category: str
    score: int
