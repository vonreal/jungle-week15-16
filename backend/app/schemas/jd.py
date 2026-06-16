from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JDCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    company: str | None = None
    source_url: str | None = None
    raw_text: str | None = None
    input_type: str = Field(pattern="^(link|text|image)$")


class JDRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    company: str | None
    source_url: str | None
    raw_text: str
    input_type: str
    created_at: datetime


class JDRequirementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    jd_id: uuid.UUID
    skill_name: str
    importance: str


class ExperienceClassificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    experience_id: uuid.UUID
    experience_content: str
    classification: str
    reason: str | None


class JDAnalysisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    jd_id: uuid.UUID
    user_id: uuid.UUID
    jd_title: str
    jd_company: str | None
    gap_summary: str
    created_at: datetime
    requirements: list[JDRequirementRead] = []
    classifications: list[ExperienceClassificationRead] = []
