from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.models import JDAnalysis, JDRequirement, PortfolioRecommendation, Skill, UserSkill
from app.schemas.recommendations import RecommendationCreate, RecommendationRead
from app.services.portfolio_agent import PortfolioAgentService

router = APIRouter()


@router.post("", response_model=RecommendationRead, status_code=status.HTTP_201_CREATED)
async def create_recommendation(
    payload: RecommendationCreate,
    session: SessionDep,
    current_user: CurrentUser,
) -> PortfolioRecommendation:
    analyses_result = await session.execute(
        select(JDAnalysis).where(
            JDAnalysis.id.in_(payload.analysis_ids),
            JDAnalysis.user_id == current_user.id,
        )
    )
    analyses = analyses_result.scalars().all()
    if len(analyses) != len(payload.analysis_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="분석 결과를 찾을 수 없습니다.")

    jd_ids = [analysis.jd_id for analysis in analyses]
    requirements_result = await session.execute(
        select(JDRequirement.skill_name).where(JDRequirement.jd_id.in_(jd_ids))
    )
    user_skills_result = await session.execute(
        select(Skill.name)
        .join(UserSkill, UserSkill.skill_id == Skill.id)
        .where(UserSkill.user_id == current_user.id)
    )

    generated = await PortfolioAgentService().generate(
        list(requirements_result.scalars().all()),
        list(user_skills_result.scalars().all()),
    )
    recommendation = PortfolioRecommendation(
        user_id=current_user.id,
        based_on_jd_ids=jd_ids,
        **generated,
    )
    session.add(recommendation)
    await session.commit()
    await session.refresh(recommendation)
    return recommendation


@router.get("", response_model=list[RecommendationRead])
async def list_recommendations(
    session: SessionDep,
    current_user: CurrentUser,
) -> list[PortfolioRecommendation]:
    result = await session.execute(
        select(PortfolioRecommendation)
        .where(PortfolioRecommendation.user_id == current_user.id)
        .order_by(PortfolioRecommendation.created_at.desc())
    )
    return list(result.scalars().all())
