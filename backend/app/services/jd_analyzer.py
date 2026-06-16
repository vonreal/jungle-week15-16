from __future__ import annotations

import re

from app.services.llm import LLMClient

CORE_KEYWORDS = [
    "Spring Boot",
    "Spring",
    "FastAPI",
    "React",
    "Java",
    "Python",
    "JavaScript",
    "TypeScript",
    "PostgreSQL",
    "MySQL",
    "Redis",
    "Kafka",
    "Docker",
    "Kubernetes",
    "AWS",
    "CI/CD",
    "GitHub Actions",
    "JPA",
    "RAG",
    "LangChain",
    "LangGraph",
]

REQUIREMENT_ALIASES = {
    "Spring Boot": ["spring boot", "스프링 부트"],
    "Spring": ["spring", "스프링"],
    "FastAPI": ["fastapi", "fast api"],
    "React": ["react", "리액트"],
    "Java": ["java", "자바"],
    "Python": ["python", "파이썬"],
    "JavaScript": ["javascript", "java script", "자바스크립트"],
    "TypeScript": ["typescript", "type script", "타입스크립트"],
    "PostgreSQL": ["postgresql", "postgres", "포스트그레스"],
    "MySQL": ["mysql", "마이sql"],
    "Redis": ["redis", "레디스"],
    "Kafka": ["kafka", "카프카"],
    "Docker": ["docker", "도커", "container", "컨테이너"],
    "Kubernetes": ["kubernetes", "쿠버네티스", "k8s"],
    "AWS": ["aws", "amazon web services", "클라우드"],
    "CI/CD": ["ci/cd", "cicd", "ci cd", "배포 자동화", "자동 배포"],
    "GitHub Actions": ["github actions", "깃허브 액션", "github action"],
    "JPA": ["jpa"],
    "RAG": ["rag", "검색 증강", "검색증강"],
    "LangChain": ["langchain", "랭체인"],
    "LangGraph": ["langgraph", "랭그래프"],
}


class JDAnalyzerService:
    def __init__(self) -> None:
        self.llm = LLMClient()

    def extract_requirements(self, raw_text: str) -> list[dict[str, str]]:
        found = []
        lower = raw_text.lower()
        for keyword in CORE_KEYWORDS:
            if self._keyword_matches(lower, keyword):
                importance = "required" if self._looks_required(raw_text, keyword) else "preferred"
                found.append({"skill_name": keyword, "importance": importance})

        if found:
            return found

        words = re.findall(r"[A-Za-z][A-Za-z0-9+/#.-]{1,}", raw_text)
        return [{"skill_name": word, "importance": "preferred"} for word in dict.fromkeys(words[:8])]

    async def summarize_gap(
        self,
        jd_text: str,
        user_skills: list[tuple[str, int]],
        similar_chunks: list[str],
    ) -> str:
        prompt = (
            "개발자 채용공고와 사용자 스탯을 비교해 갭을 한국어로 요약하세요.\n"
            f"JD:\n{jd_text[:2500]}\n\n"
            f"사용자 스탯: {user_skills}\n\n"
            f"유사 과거 분석: {similar_chunks[:3]}"
        )
        return await self.llm.complete(prompt)

    def classify_experience(self, experience: str, requirements: list[str]) -> tuple[str, str]:
        normalized = experience.lower()
        hits = [req for req in requirements if self._keyword_matches(normalized, req)]
        if len(hits) >= 2:
            return "core", f"핵심 요구사항 {', '.join(hits[:3])}와 직접 연결됩니다."
        if len(hits) == 1:
            return "essential", f"{hits[0]} 요구사항을 뒷받침하는 경험입니다."
        return "unrelated", "현재 JD 핵심 키워드와 직접적인 연결이 약합니다."

    def _looks_required(self, text: str, keyword: str) -> bool:
        lower = text.lower()
        aliases = REQUIREMENT_ALIASES.get(keyword, [keyword.lower()])
        indexes = [lower.find(alias) for alias in aliases if lower.find(alias) >= 0]
        idx = min(indexes) if indexes else lower.find(keyword.lower())
        window = text[max(0, idx - 80) : idx + len(keyword) + 80]
        return any(token in window for token in ["필수", "자격", "required", "must", "주요 업무"])

    def _keyword_matches(self, normalized_text: str, keyword: str) -> bool:
        aliases = REQUIREMENT_ALIASES.get(keyword, [keyword.lower()])
        return any(alias in normalized_text for alias in aliases)
