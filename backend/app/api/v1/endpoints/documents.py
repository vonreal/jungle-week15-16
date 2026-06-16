from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.models import UserDocument, UserExperience
from app.schemas.documents import DocumentCreate, DocumentRead, ExperienceRead
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


async def _extract_and_store_experiences(
    session: SessionDep,
    user_id,
    document: UserDocument,
) -> None:
    parser = DocumentParserService()
    for content in await parser.extract_experiences(document.raw_text):
        session.add(UserExperience(user_id=user_id, document_id=document.id, content=content))


async def _store_document_chunks(session: SessionDep, document: UserDocument) -> None:
    if document.type not in {"resume", "portfolio"}:
        return
    await RAGService().store_chunks(session, document.type, document.id, document.raw_text)
