from __future__ import annotations

import uuid

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import delete, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import DocumentEmbedding, Skill, UserDocument, UserExperience, UserSkill
from app.schemas.documents import DocumentCreate, DocumentRead, ExperienceRead, ExperienceUpdate
from app.services.documents import DocumentParserService, DocumentTextExtractorService
from app.services.rag import RAGService

router = APIRouter()


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: DocumentCreate,
    session: SessionDep,
    current_user: CurrentUser,
) -> UserDocument:
    document = UserDocument(user_id=current_user.id, **payload.model_dump())
    session.add(document)
    await session.flush()
    await _extract_and_store_experiences(session, current_user.id, document)
    await _extract_and_store_skills(session, current_user.id, document)
    await _store_document_chunks(session, document)
    await session.commit()
    await session.refresh(document)
    return document


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    session: SessionDep,
    current_user: CurrentUser,
    type: str = Form(...),
    file: UploadFile = File(...),
) -> UserDocument:
    body = await file.read()
    try:
        raw_text = DocumentTextExtractorService().extract_text(file.filename, body)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="문서 텍스트 추출에 실패했습니다.",
        ) from exc
    if not raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="문서에서 읽을 수 있는 텍스트를 찾지 못했습니다.",
        )
    document = UserDocument(
        user_id=current_user.id,
        type=type,
        file_name=file.filename or "upload.txt",
        raw_text=raw_text,
    )
    session.add(document)
    await session.flush()
    await _extract_and_store_experiences(session, current_user.id, document)
    await _extract_and_store_skills(session, current_user.id, document)
    await _store_document_chunks(session, document)
    await session.commit()
    await session.refresh(document)
    return document


@router.get("", response_model=list[DocumentRead])
async def list_documents(session: SessionDep, current_user: CurrentUser) -> list[UserDocument]:
    result = await session.execute(
        select(UserDocument)
        .where(UserDocument.user_id == current_user.id)
        .order_by(UserDocument.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/experiences", response_model=list[ExperienceRead])
async def list_experiences(session: SessionDep, current_user: CurrentUser) -> list[UserExperience]:
    result = await session.execute(
        select(UserExperience)
        .where(UserExperience.user_id == current_user.id)
        .order_by(UserExperience.created_at.desc())
    )
    return list(result.scalars().all())


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Response:
    document = await _get_document_or_404(session, document_id, current_user.id)
    await session.execute(
        delete(DocumentEmbedding).where(
            DocumentEmbedding.source_type == document.type,
            DocumentEmbedding.source_id == document.id,
        )
    )
    await session.delete(document)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/experiences/{experience_id}", response_model=ExperienceRead)
async def update_experience(
    experience_id: uuid.UUID,
    payload: ExperienceUpdate,
    session: SessionDep,
    current_user: CurrentUser,
) -> UserExperience:
    experience = await _get_experience_or_404(session, experience_id, current_user.id)
    experience.content = payload.content.strip()
    await session.commit()
    await session.refresh(experience)
    return experience


@router.delete("/experiences/{experience_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experience(
    experience_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Response:
    experience = await _get_experience_or_404(session, experience_id, current_user.id)
    await session.delete(experience)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _extract_and_store_experiences(
    session: SessionDep,
    user_id,
    document: UserDocument,
) -> None:
    parser = DocumentParserService()
    for content in await parser.extract_experiences(document.raw_text):
        session.add(UserExperience(user_id=user_id, document_id=document.id, content=content))


async def _extract_and_store_skills(
    session: SessionDep,
    user_id,
    document: UserDocument,
) -> None:
    if document.type not in {"resume", "portfolio"}:
        return

    parser = DocumentParserService()
    for mention in parser.extract_skill_mentions(document.raw_text):
        skill = await session.scalar(
            select(Skill).where(func.lower(Skill.name) == mention["name"].lower())
        )
        if skill is None:
            skill = Skill(**mention)
            session.add(skill)
            await session.flush()

        user_skill = await session.scalar(
            select(UserSkill).where(
                UserSkill.user_id == user_id,
                UserSkill.skill_id == skill.id,
            )
        )
        if user_skill is None:
            session.add(UserSkill(user_id=user_id, skill_id=skill.id, level=1))


async def _store_document_chunks(session: SessionDep, document: UserDocument) -> None:
    if document.type not in {"resume", "portfolio"}:
        return
    await RAGService().store_chunks(session, document.type, document.id, document.raw_text)


async def _get_document_or_404(
    session: SessionDep,
    document_id: uuid.UUID,
    user_id: uuid.UUID,
) -> UserDocument:
    document = await session.scalar(
        select(UserDocument).where(UserDocument.id == document_id, UserDocument.user_id == user_id)
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="문서를 찾을 수 없습니다.")
    return document


async def _get_experience_or_404(
    session: SessionDep,
    experience_id: uuid.UUID,
    user_id: uuid.UUID,
) -> UserExperience:
    experience = await session.scalar(
        select(UserExperience).where(UserExperience.id == experience_id, UserExperience.user_id == user_id)
    )
    if experience is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="경험을 찾을 수 없습니다.")
    return experience
