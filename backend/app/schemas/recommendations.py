from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RecommendationCreate(BaseModel):
    analysis_ids: list[uuid.UUID] = Field(min_length=1)


class RecommendationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    ideal_version: str
    realistic_version: str
    action_plan: str
    based_on_jd_ids: list[uuid.UUID]
    created_at: datetime

