from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CareerBuddy"
    environment: str = "local"
    api_v1_prefix: str = "/api/v1"
    database_url: str = Field(alias="DATABASE_URL")
    secret_key: str = Field(alias="SECRET_KEY")
    access_token_expire_minutes: int = 60 * 24 * 30
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    llm_model: str = "gpt-4.1-mini"

    aws_host: str | None = None
    aws_user: str | None = None
    aws_app_dir: str = "/opt/careerbuddy"

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
