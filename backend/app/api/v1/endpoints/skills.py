from __future__ import annotations

from fastapi import APIRouter, Query, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.models import Skill, UserSkill
from app.schemas.skills import RadarPoint, SkillRead, UserSkillCreate, UserSkillRead, UserSkillUpsert
from app.seeds.skills import INITIAL_SKILLS

router = APIRouter()


@router.post("/seed", response_model=list[SkillRead], status_code=status.HTTP_201_CREATED)
async def seed_skills(session: SessionDep) -> list[Skill]:
    for category, name, description in INITIAL_SKILLS:
        stmt = (
            insert(Skill)
            .values(category=category, name=name, description=description)
            .on_conflict_do_update(
                index_elements=["category", "name"],
                set_={"description": description},
            )
        )
        await session.execute(stmt)
    await session.commit()
    return await _list_skills(session)


@router.get("", response_model=list[SkillRead])
async def list_skills(
    session: SessionDep,
    category: str | None = Query(default=None),
) -> list[Skill]:
    return await _list_skills(session, category)


@router.get("/me", response_model=list[UserSkillRead])
async def my_skills(session: SessionDep, current_user: CurrentUser) -> list[dict]:
    result = await session.execute(
        select(UserSkill)
        .where(UserSkill.user_id == current_user.id)
        .options(selectinload(UserSkill.skill))
        .order_by(UserSkill.skill_id.asc())
    )
    return [
        {"id": item.id, "skill": SkillRead.model_validate(item.skill), "level": item.level}
        for item in result.scalars().all()
    ]


@router.put("/me", response_model=list[UserSkillRead])
async def upsert_my_skills(
    payload: list[UserSkillUpsert],
    session: SessionDep,
    current_user: CurrentUser,
) -> list[dict]:
    for item in payload:
        skill = await session.get(Skill, item.skill_id)
        if skill is None:
            continue
        result = await session.execute(
            select(UserSkill).where(
                UserSkill.user_id == current_user.id,
                UserSkill.skill_id == item.skill_id,
            )
        )
        user_skill = result.scalar_one_or_none()
        if user_skill is None:
            session.add(
                UserSkill(user_id=current_user.id, skill_id=item.skill_id, level=item.level)
            )
        else:
            user_skill.level = item.level
    await session.commit()
    return await my_skills(session, current_user)


@router.post("/me", response_model=list[UserSkillRead], status_code=status.HTTP_201_CREATED)
async def create_my_skill(
    payload: UserSkillCreate,
    session: SessionDep,
    current_user: CurrentUser,
) -> list[dict]:
    name = payload.name.strip()
    category = payload.category.strip()
    if not name or not category:
        return await my_skills(session, current_user)

    skill = await session.scalar(select(Skill).where(Skill.category == category, Skill.name == name))
    if skill is None:
        skill = Skill(
            category=category,
            name=name,
            description=payload.description or "사용자가 직접 추가한 기술입니다.",
        )
        session.add(skill)
        await session.flush()

    user_skill = await session.scalar(
        select(UserSkill).where(
            UserSkill.user_id == current_user.id,
            UserSkill.skill_id == skill.id,
        )
    )
    if user_skill is None:
        session.add(UserSkill(user_id=current_user.id, skill_id=skill.id, level=payload.level))
    else:
        user_skill.level = payload.level

    await session.commit()
    return await my_skills(session, current_user)


@router.get("/me/radar", response_model=list[RadarPoint])
async def my_radar(session: SessionDep, current_user: CurrentUser) -> list[RadarPoint]:
    items = await my_skills(session, current_user)
    by_category: dict[str, list[int]] = {}
    for item in items:
        by_category.setdefault(item["skill"].category, []).append(item["level"])
    return [
        RadarPoint(category=category, score=round(sum(levels) / (len(levels) * 4) * 100))
        for category, levels in by_category.items()
    ]


async def _list_skills(session: SessionDep, category: str | None = None) -> list[Skill]:
    stmt = select(Skill).order_by(Skill.category.asc(), Skill.name.asc())
    if category:
        stmt = stmt.where(Skill.category == category)
    result = await session.execute(stmt)
    return list(result.scalars().all())
