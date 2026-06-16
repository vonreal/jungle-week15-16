from __future__ import annotations

import re

from app.services.llm import LLMClient

CORE_KEYWORDS = [
    "Flutter",
    "GitLab",
    "WebSocket",
    "WebRTC",
    "iOS",
    "Android",
    "모바일 앱 아키텍처",
    "앱 성능 최적화",
    "자동화 테스트",
    "Spring Boot",
    "Spring",
    "FastAPI",
    "React",
    "Java",
    "Kotlin",
    "Python",
    "JavaScript",
    "TypeScript",
    "백엔드 아키텍처",
    "LLM/GenAI",
    "AI 인프라",
    "Inference 최적화",
    "MLOps",
    "vLLM",
    "TensorRT",
    "Triton Inference Server",
    "PyTorch",
    "TensorFlow",
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
    "Flutter": ["flutter", "플러터"],
    "GitLab": ["gitlab", "깃랩"],
    "WebSocket": ["websocket", "web socket", "웹소켓"],
    "WebRTC": ["webrtc", "web rtc"],
    "iOS": ["ios"],
    "Android": ["android", "안드로이드"],
    "모바일 앱 아키텍처": ["앱 아키텍처", "모바일 앱 구조", "앱 구조", "확장성과 유지보수"],
    "앱 성능 최적화": ["앱 성능", "모바일 앱 성능", "모바일 앱 최적화"],
    "자동화 테스트": ["자동화 테스트", "테스트 작성", "테스트 자동화"],
    "Spring Boot": ["spring boot", "스프링 부트"],
    "Spring": ["spring", "스프링"],
    "FastAPI": ["fastapi", "fast api"],
    "React": ["react", "리액트"],
    "Java": ["java", "자바"],
    "Kotlin": ["kotlin", "코틀린"],
    "Python": ["python", "파이썬"],
    "JavaScript": ["javascript", "java script", "자바스크립트"],
    "TypeScript": ["typescript", "type script", "타입스크립트"],
    "백엔드 아키텍처": ["백엔드 아키텍처", "백엔드 설계", "시스템 아키텍처", "서비스 시스템 개발"],
    "LLM/GenAI": ["llm", "genai", "생성형 ai", "지능형 채팅", "챗봇", "agent"],
    "AI 인프라": ["ai 인프라", "ai 모델", "모델 서빙", "로컬 모델", "클라우드 모델"],
    "Inference 최적화": ["inference", "추론", "서빙 시스템", "응답 속도", "성능 개선", "성능 최적화"],
    "MLOps": ["mlops", "kubeflow", "mlflow"],
    "vLLM": ["vllm"],
    "TensorRT": ["tensorrt"],
    "Triton Inference Server": ["triton inference server", "triton"],
    "PyTorch": ["pytorch"],
    "TensorFlow": ["tensorflow"],
    "PostgreSQL": ["postgresql", "postgres", "포스트그레스"],
    "MySQL": ["mysql", "마이sql"],
    "Redis": ["redis", "레디스"],
    "Kafka": ["kafka", "카프카"],
    "Docker": ["docker", "도커"],
    "Kubernetes": ["kubernetes", "쿠버네티스", "k8s"],
    "AWS": ["aws", "amazon web services"],
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
        requirement_text = self._requirement_scope(raw_text)
        lower = requirement_text.lower()
        for keyword in CORE_KEYWORDS:
            if self._keyword_matches(lower, keyword):
                importance = "required" if self._looks_required(requirement_text, keyword) else "preferred"
                found.append({"skill_name": keyword, "importance": importance})

        if found:
            return found

        words = re.findall(r"[A-Za-z][A-Za-z0-9+/#.-]{1,}", requirement_text)
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
        hits = self.matched_requirements(experience, requirements)
        if len(hits) >= 2:
            return "core", f"핵심 요구사항 {', '.join(hits[:3])}와 직접 연결됩니다."
        if len(hits) == 1:
            return "essential", f"{hits[0]} 요구사항을 뒷받침하는 경험입니다."
        return "unrelated", "현재 JD 핵심 키워드와 직접적인 연결이 약합니다."

    def matched_requirements(self, experience: str, requirements: list[str]) -> list[str]:
        normalized = experience.lower()
        return [req for req in requirements if self._keyword_matches(normalized, req)]

    def _looks_required(self, text: str, keyword: str) -> bool:
        lower = text.lower()
        aliases = REQUIREMENT_ALIASES.get(keyword, [keyword.lower()])
        indexes = [lower.find(alias) for alias in aliases if lower.find(alias) >= 0]
        idx = min(indexes) if indexes else lower.find(keyword.lower())
        before = text[:idx]
        last_required_section = max(
            before.rfind(token)
            for token in ["필요 역량", "필요역량", "자격 요건", "자격요건", "지원 자격", "지원자격"]
        )
        last_preferred_section = max(
            before.rfind(token)
            for token in ["우대 사항", "우대사항", "사용 중인 기술스택", "사용 중인 기술 스택"]
        )
        if last_required_section >= 0 or last_preferred_section >= 0:
            return last_required_section > last_preferred_section

        window = text[max(0, idx - 80) : idx + len(keyword) + 80]
        return any(token in window for token in ["필수", "자격", "required", "must", "주요 업무"])

    def _keyword_matches(self, normalized_text: str, keyword: str) -> bool:
        aliases = REQUIREMENT_ALIASES.get(keyword, [keyword.lower()])
        return any(alias in normalized_text for alias in aliases)

    def _requirement_scope(self, raw_text: str) -> str:
        start_match = re.search(
            r"(담당\s*업무|주요\s*업무|필요\s*역량|자격\s*요건|지원\s*자격|사용\s*중인\s*기술\s*스택)",
            raw_text,
        )
        if not start_match:
            return raw_text

        scoped = raw_text[start_match.start() :]
        end_match = re.search(r"(전형\s*절차|혜택\s*및\s*복지|채용\s*전형|복지|기타\s*사항)", scoped)
        if end_match:
            scoped = scoped[: end_match.start()]
        return scoped
