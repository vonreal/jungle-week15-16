from __future__ import annotations

from pydantic import BaseModel, Field


class Page(BaseModel):
    page: int = Field(ge=1)
    size: int = Field(ge=1, le=100)
    total: int
    items: list

