from __future__ import annotations

from app.core.config import settings


class LLMClient:
    """Thin wrapper around the configured LLM with a deterministic local fallback."""

    def __init__(self) -> None:
        self.model = settings.llm_model
        self.api_key = settings.openai_api_key

    async def complete(self, prompt: str) -> str:
        if not self.api_key:
            return self._fallback(prompt)

        try:
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(model=self.model, api_key=self.api_key, temperature=0.2)
            response = await llm.ainvoke(prompt)
            return str(response.content)
        except Exception as exc:  # pragma: no cover - external provider behavior
            return f"OpenAI 호출 실패로 로컬 fallback을 사용했습니다: {exc}\n\n{self._fallback(prompt)}"

    def _fallback(self, prompt: str) -> str:
        return (
            "OPENAI_API_KEY가 설정되지 않아 규칙 기반 분석을 생성했습니다. "
            "Spring Boot, Docker, AWS, PostgreSQL, Redis 같은 반복 요구사항을 중심으로 "
            "갭을 우선순위화하세요.\n\n"
            f"요청 요약: {prompt[:500]}"
        )
