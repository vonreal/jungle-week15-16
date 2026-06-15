from __future__ import annotations

import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ExperienceClassification,
    JDAnalysis,
    JDRequirement,
    JobDescription,
    Skill,
    UserExperience,
    UserSkill,
)
from app.schemas.jd import JDAnalysisRead, JDCreate, JDRead
from app.services.crawler_mcp import MCPCrawlerService
from app.services.jd_analyzer import JDAnalyzerService
from app.services.ocr import OCRService
from app.services.rag import RAGService

router = APIRouter()


@router.post("", response_model=JDRead, status_code=status.HTTP_201_CREATED)
async def create_jd(payload: JDCreate, session: SessionDep, current_user: CurrentUser) -> JobDescription:
    raw_text = payload.raw_text
    if payload.input_type == "link":
        if not payload.source_url:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="채용공고 링크를 입력해주세요.")
        raw_text = raw_text or await MCPCrawlerService().fetch_text(payload.source_url)
    if not raw_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="채용공고 내용을 입력해주세요.")

    jd = JobDescription(
        user_id=current_user.id,
        title=payload.title,
        company=payload.company,
        source_url=payload.source_url,
        raw_text=raw_text,
        input_type=payload.input_type,
    )
    session.add(jd)
    await session.flush()
    await RAGService().store_chunks(session, "jd", jd.id, raw_text)
    await session.commit()
    await session.refresh(jd)
    return jd


@router.post("/image", response_model=JDRead, status_code=status.HTTP_201_CREATED)
async def create_jd_from_image(
    session: SessionDep,
    current_user: CurrentUser,
    title: str = Form(...),
    company: str | None = Form(default=None),
    file: UploadFile = File(...),
) -> JobDescription:
    raw_text = await OCRService().extract_text(file.filename or "jd-image", await file.read())
    return await create_jd(
        JDCreate(title=title, company=company, raw_text=raw_text, input_type="image"),
        session,
        current_user,
    )


@router.get("", response_model=list[JDRead])
async def list_jds(session: SessionDep, current_user: CurrentUser) -> list[JobDescription]:
    result = await session.execute(
        select(JobDescription)
        .where(JobDescription.user_id == current_user.id)
        .order_by(JobDescription.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/{jd_id}/analyze", response_model=JDAnalysisRead)
async def analyze_jd(
    jd_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> dict:
    jd = await session.get(JobDescription, jd_id)
    if jd is None or jd.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="채용공고를 찾을 수 없습니다.")

    analyzer = JDAnalyzerService()
    requirements = analyzer.extract_requirements(jd.raw_text)
    await session.execute(delete(JDRequirement).where(JDRequirement.jd_id == jd.id))
    req_models = [
        JDRequirement(jd_id=jd.id, skill_name=req["skill_name"], importance=req["importance"])
        for req in requirements
    ]
    session.add_all(req_models)

    user_skill_result = await session.execute(
        select(Skill.name, UserSkill.level)
        .join(UserSkill, UserSkill.skill_id == Skill.id)
        .where(UserSkill.user_id == current_user.id)
    )
    user_skills = list(user_skill_result.all())
    similar_chunks = await RAGService().similar_chunks(session, jd.raw_text)
    gap_summary = await analyzer.summarize_gap(jd.raw_text, user_skills, similar_chunks)

    analysis = JDAnalysis(jd_id=jd.id, user_id=current_user.id, gap_summary=gap_summary)
    session.add(analysis)
    await session.flush()

    exp_result = await session.execute(
        select(UserExperience).where(UserExperience.user_id == current_user.id)
    )
    req_names = [item["skill_name"] for item in requirements]
    class_models = []
    for experience in exp_result.scalars().all():
        classification, reason = analyzer.classify_experience(experience.content, req_names)
        model = ExperienceClassification(
            analysis_id=analysis.id,
            experience_id=experience.id,
            classification=classification,
            reason=reason,
        )
        session.add(model)
        class_models.append(model)

    await session.commit()
    for item in [analysis, *req_models, *class_models]:
        await session.refresh(item)

    return {
        **JDAnalysisRead.model_validate(analysis).model_dump(),
        "requirements": req_models,
        "classifications": class_models,
    }


@router.get("/analyses", response_model=list[JDAnalysisRead])
async def list_analyses(session: SessionDep, current_user: CurrentUser) -> list[dict]:
    result = await session.execute(
        select(JDAnalysis)
        .where(JDAnalysis.user_id == current_user.id)
        .options(selectinload(JDAnalysis.classifications), selectinload(JDAnalysis.jd))
        .order_by(JDAnalysis.created_at.desc())
    )
    analyses = result.scalars().unique().all()
    rows = []
    for analysis in analyses:
        req_result = await session.execute(
            select(JDRequirement).where(JDRequirement.jd_id == analysis.jd_id)
        )
        rows.append(
            {
                **JDAnalysisRead.model_validate(analysis).model_dump(),
                "requirements": list(req_result.scalars().all()),
                "classifications": list(analysis.classifications),
            }
        )
    return rows
