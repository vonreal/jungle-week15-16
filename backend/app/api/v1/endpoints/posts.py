from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.models import Comment, Post, PostStatRequirement, Skill, Tag
from app.schemas.posts import CommentCreate, CommentRead, PostCreate, PostPage, PostRead, PostUpdate

router = APIRouter()


@router.get("", response_model=PostPage)
async def list_posts(
    session: SessionDep,
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
    search: str | None = None,
    tag: str | None = None,
) -> PostPage:
    stmt = select(Post).where(Post.is_public.is_(True)).options(selectinload(Post.tags))
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
        is_public=payload.is_public,
    )
    post.tags = await _get_or_create_tags(session, payload.tags)
    session.add(post)
    await session.flush()
    await _replace_stat_requirements(session, post, payload.stat_requirements)
    await session.commit()
    return await _get_post_or_404(session, post.id)


@router.get("/{post_id}", response_model=PostRead)
async def get_post(post_id: uuid.UUID, session: SessionDep) -> Post:
    post = await _get_post_or_404(session, post_id)
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


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
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown skill_id")
        session.add(
            PostStatRequirement(
                post_id=post.id,
                skill_id=skill_id,
                min_level=min_level,
            )
        )


def _ensure_owner(owner_id: uuid.UUID, current_id: uuid.UUID) -> None:
    if owner_id != current_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def _field(item, name: str):
    if isinstance(item, dict):
        return item[name]
    return getattr(item, name)
