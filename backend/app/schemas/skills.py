from __future__ import annotations

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


class UserSkillRead(BaseModel):
    id: int
    skill: SkillRead
    level: int


class RadarPoint(BaseModel):
    category: str
    score: int

