from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    nickname: str = Field(min_length=1, max_length=80)
    target_job: str | None = None
    target_company: str | None = None
    is_public: bool = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class AccountDelete(BaseModel):
    current_password: str


class UserUpdate(BaseModel):
    nickname: str | None = Field(default=None, min_length=1, max_length=80)
    target_job: str | None = Field(default=None, max_length=120)
    target_company: str | None = Field(default=None, max_length=120)
    is_public: bool | None = None

    @field_validator("nickname")
    @classmethod
    def strip_nickname(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("닉네임을 입력해주세요.")
        return stripped

    @field_validator("target_job", "target_company")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return value.strip() or None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    nickname: str
    target_job: str | None
    target_company: str | None
    is_public: bool
    created_at: datetime
    updated_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
