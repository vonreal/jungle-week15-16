from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    file_name: str
    file_url: str | None
    raw_text: str | None
    created_at: datetime


class ExperienceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    document_id: uuid.UUID | None
    content: str
    created_at: datetime


class ExperienceUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class DocumentCreate(BaseModel):
    type: str
    file_name: str
    file_url: str | None = None
    raw_text: str | None = None
