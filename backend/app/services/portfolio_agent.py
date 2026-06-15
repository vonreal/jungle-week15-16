from __future__ import annotations

from collections import Counter

try:
    from langgraph.graph import END, StateGraph
except Exception:  # pragma: no cover - dependency may be absent in static checks
    END = "__end__"
    StateGraph = None

from app.services.llm import LLMClient


class PortfolioAgentService:
    def __init__(self) -> None:
        self.llm = LLMClient()

    async def generate(self, requirement_names: list[str], user_skill_names: list[str]) -> dict[str, str]:
        if StateGraph is None:
            return await self._fallback(requirement_names, user_skill_names)

        async def common_requirements(state: dict) -> dict:
            counter = Counter(state["requirements"])
            return {**state, "common": [name for name, _ in counter.most_common(8)]}

        async def ideal_portfolio(state: dict) -> dict:
            prompt = f"다음 요구사항을 모두 만족하는 이상적 포트폴리오를 한국어로 작성하세요: {state['common']}"
            return {**state, "ideal": await self.llm.complete(prompt)}

        async def realistic_portfolio(state: dict) -> dict:
            prompt = (
                "사용자의 현재 스탯으로 만들 수 있는 현실적 포트폴리오 버전을 작성하세요.\n"
                f"요구사항: {state['common']}\n현재 스탯: {state['user_skills']}"
            )
            return {**state, "realistic": await self.llm.complete(prompt)}

        async def action_plan(state: dict) -> dict:
            missing = [item for item in state["common"] if item not in state["user_skills"]]
            prompt = f"다음 부족 역량을 6주 액션 플랜으로 작성하세요: {missing}"
            return {**state, "action": await self.llm.complete(prompt)}

        graph = StateGraph(dict)
        graph.add_node("common", common_requirements)
        graph.add_node("ideal", ideal_portfolio)
        graph.add_node("realistic", realistic_portfolio)
        graph.add_node("action", action_plan)
        graph.set_entry_point("common")
        graph.add_edge("common", "ideal")
        graph.add_edge("ideal", "realistic")
        graph.add_edge("realistic", "action")
        graph.add_edge("action", END)
        result = await graph.compile().ainvoke(
            {"requirements": requirement_names, "user_skills": user_skill_names}
        )
        return {
            "ideal_version": result["ideal"],
            "realistic_version": result["realistic"],
            "action_plan": result["action"],
        }

    async def _fallback(self, requirement_names: list[str], user_skill_names: list[str]) -> dict[str, str]:
        common = [name for name, _ in Counter(requirement_names).most_common(8)]
        missing = [item for item in common if item not in user_skill_names]
        return {
            "ideal_version": " / ".join(common) or "JD 공통 요구사항을 먼저 축적하세요.",
            "realistic_version": "현재 보유 스탯: " + (", ".join(user_skill_names) or "스탯 입력 필요"),
            "action_plan": "우선 보완: " + (", ".join(missing) or "현재 스탯을 포트폴리오 산출물로 정리"),
        }

