from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, OptionalCurrentUser, SessionDep
from app.models import Comment, Post, PostApplication, PostStatRequirement, PostView, Skill, Tag
from app.schemas.posts import (
    CommentCreate,
    CommentRead,
    PostApplicationRead,
    PostApplicationStatus,
    PostCreate,
    PostPage,
    PostRead,
    PostUpdate,
)

router = APIRouter()


@router.get("", response_model=PostPage)
async def list_posts(
    session: SessionDep,
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
    search: str | None = None,
    tag: str | None = None,
) -> PostPage:
    stmt = select(Post).where(Post.is_public.is_(True), Post.is_draft.is_(False)).options(selectinload(Post.tags))
    if search:
        like = f"%{search}%"
        stmt = stmt.where(or_(Post.title.ilike(like), Post.content.ilike(like)))
    if tag:
        stmt = stmt.join(Post.tags).where(Tag.name == tag)

    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    result = await session.execute(
        stmt.order_by(Post.created_at.desc()).offset((page - 1) * size).limit(size)
    )
    posts = result.scalars().unique().all()
    return PostPage(page=page, size=size, total=total or 0, items=list(posts))


@router.post("", response_model=PostRead, status_code=status.HTTP_201_CREATED)
async def create_post(payload: PostCreate, session: SessionDep, current_user: CurrentUser) -> Post:
    post = Post(
        user_id=current_user.id,
        title=payload.title,
        content=payload.content,
        analysis_id=payload.analysis_id,
        recommendation_id=payload.recommendation_id,
        is_public=False if payload.is_draft else payload.is_public,
        is_draft=payload.is_draft,
    )
    post.tags = await _get_or_create_tags(session, payload.tags)
    session.add(post)
    await session.flush()
    await _replace_stat_requirements(session, post, payload.stat_requirements)
    await session.commit()
    return await _get_post_or_404(session, post.id)


@router.get("/{post_id}", response_model=PostRead)
async def get_post(
    post_id: uuid.UUID,
    session: SessionDep,
    current_user: OptionalCurrentUser,
) -> Post:
    post = await _get_post_or_404(session, post_id)
    if post.is_draft and (current_user is None or post.user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="게시글을 찾을 수 없습니다.")
    if current_user is not None and not post.is_draft:
        existing_view = await session.scalar(
            select(PostView).where(
                PostView.post_id == post_id,
                PostView.user_id == current_user.id,
            )
        )
        if existing_view is None:
            session.add(PostView(post_id=post_id, user_id=current_user.id))
            post.view_count += 1
            await session.commit()
    return await _get_post_or_404(session, post_id)


@router.patch("/{post_id}", response_model=PostRead)
async def update_post(
    post_id: uuid.UUID,
    payload: PostUpdate,
    session: SessionDep,
    current_user: CurrentUser,
) -> Post:
    post = await _get_post_or_404(session, post_id)
    _ensure_owner(post.user_id, current_user.id)

    data = payload.model_dump(exclude_unset=True)
    tags = data.pop("tags", None)
    stat_requirements = data.pop("stat_requirements", None)
    for key, value in data.items():
        setattr(post, key, value)
    if post.is_draft:
        post.is_public = False
        if not post.title.strip():
            post.title = "제목 없는 임시글"
    elif not post.title.strip() or not post.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="게시글 제목과 내용을 입력해주세요.")
    if tags is not None:
        post.tags = await _get_or_create_tags(session, tags)
    if stat_requirements is not None:
        await _replace_stat_requirements(session, post, stat_requirements)

    await session.commit()
    return await _get_post_or_404(session, post_id)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> Response:
    post = await _get_post_or_404(session, post_id)
    _ensure_owner(post.user_id, current_user.id)
    await session.delete(post)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/drafts/me", response_model=list[PostRead])
async def list_my_drafts(session: SessionDep, current_user: CurrentUser) -> list[Post]:
    result = await session.execute(
        select(Post)
        .where(Post.user_id == current_user.id, Post.is_draft.is_(True))
        .options(selectinload(Post.tags))
        .order_by(Post.updated_at.desc())
    )
    return list(result.scalars().unique().all())


@router.get("/{post_id}/applications/me", response_model=PostApplicationStatus)
async def get_my_application_status(
    post_id: uuid.UUID,
    session: SessionDep,
    current_user: OptionalCurrentUser,
) -> PostApplicationStatus:
    post = await _get_post_or_404(session, post_id)
    if post.is_draft:
        _ensure_owner(post.user_id, current_user.id) if current_user is not None else _raise_not_found()

    count = await session.scalar(
        select(func.count()).select_from(PostApplication).where(PostApplication.post_id == post_id)
    )
    if current_user is None:
        return PostApplicationStatus(is_applied=False, count=count or 0)
    application = await session.scalar(
        select(PostApplication).where(
            PostApplication.post_id == post_id,
            PostApplication.user_id == current_user.id,
        )
    )
    return PostApplicationStatus(is_applied=application is not None, count=count or 0)


@router.post("/{post_id}/applications", response_model=PostApplicationRead, status_code=status.HTTP_201_CREATED)
async def apply_to_post(
    post_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> dict:
    post = await _get_post_or_404(session, post_id)
    if post.is_draft:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="임시저장 글에는 신청할 수 없습니다.")
    if post.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="내 게시글에는 신청할 수 없습니다.")
    application = await session.scalar(
        select(PostApplication)
        .where(PostApplication.post_id == post_id, PostApplication.user_id == current_user.id)
        .options(selectinload(PostApplication.user))
    )
    if application is None:
        application = PostApplication(post_id=post_id, user_id=current_user.id)
        session.add(application)
        await session.commit()
        application = await session.scalar(
            select(PostApplication)
            .where(PostApplication.post_id == post_id, PostApplication.user_id == current_user.id)
            .options(selectinload(PostApplication.user))
        )
    return _application_read(application)


@router.delete("/{post_id}/applications/me", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_my_application(
    post_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Response:
    await _get_post_or_404(session, post_id)
    application = await session.scalar(
        select(PostApplication).where(
            PostApplication.post_id == post_id,
            PostApplication.user_id == current_user.id,
        )
    )
    if application is not None:
        await session.delete(application)
        await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{post_id}/applications", response_model=list[PostApplicationRead])
async def list_applications(
    post_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> list[dict]:
    post = await _get_post_or_404(session, post_id)
    _ensure_owner(post.user_id, current_user.id)
    result = await session.execute(
        select(PostApplication)
        .where(PostApplication.post_id == post_id)
        .options(selectinload(PostApplication.user))
        .order_by(PostApplication.created_at.asc())
    )
    return [_application_read(application) for application in result.scalars().all()]


@router.post("/{post_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: uuid.UUID,
    payload: CommentCreate,
    session: SessionDep,
    current_user: CurrentUser,
) -> Comment:
    await _get_post_or_404(session, post_id)
    comment = Comment(post_id=post_id, user_id=current_user.id, content=payload.content)
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    return comment


@router.get("/{post_id}/comments", response_model=list[CommentRead])
async def list_comments(post_id: uuid.UUID, session: SessionDep) -> list[Comment]:
    await _get_post_or_404(session, post_id)
    result = await session.execute(
        select(Comment).where(Comment.post_id == post_id).order_by(Comment.created_at.asc())
    )
    return list(result.scalars().all())


@router.delete("/{post_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    post_id: uuid.UUID,
    comment_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> Response:
    comment = await session.get(Comment, comment_id)
    if comment is None or comment.post_id != post_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="댓글을 찾을 수 없습니다.")
    _ensure_owner(comment.user_id, current_user.id)
    await session.delete(comment)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _get_post_or_404(session: SessionDep, post_id: uuid.UUID) -> Post:
    result = await session.execute(
        select(Post).where(Post.id == post_id).options(selectinload(Post.tags))
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="게시글을 찾을 수 없습니다.")
    return post


def _raise_not_found() -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="게시글을 찾을 수 없습니다.")


def _application_read(application: PostApplication) -> dict:
    return {
        "id": application.id,
        "post_id": application.post_id,
        "user_id": application.user_id,
        "user_nickname": application.user.nickname if application.user is not None else "CareerBuddy 사용자",
        "created_at": application.created_at,
    }


async def _get_or_create_tags(session: SessionDep, names: list[str]) -> list[Tag]:
    clean_names = [name.strip() for name in names if name.strip()]
    if not clean_names:
        return []

    result = await session.execute(select(Tag).where(Tag.name.in_(clean_names)))
    existing = {tag.name: tag for tag in result.scalars().all()}
    tags = []
    for name in dict.fromkeys(clean_names):
        tag = existing.get(name)
        if tag is None:
            tag = Tag(name=name)
            session.add(tag)
            await session.flush()
        tags.append(tag)
    return tags


async def _replace_stat_requirements(
    session: SessionDep,
    post: Post,
    requirements: list,
) -> None:
    if post.id is not None:
        await session.execute(delete(PostStatRequirement).where(PostStatRequirement.post_id == post.id))
    for item in requirements:
        skill_id = _field(item, "skill_id")
        min_level = _field(item, "min_level")
        skill = await session.get(Skill, skill_id)
        if skill is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="알 수 없는 스킬 정보입니다.")
        session.add(
            PostStatRequirement(
                post_id=post.id,
                skill_id=skill_id,
                min_level=min_level,
            )
        )


def _ensure_owner(owner_id: uuid.UUID, current_id: uuid.UUID) -> None:
    if owner_id != current_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")


def _field(item, name: str):
    if isinstance(item, dict):
        return item[name]
    return getattr(item, name)
