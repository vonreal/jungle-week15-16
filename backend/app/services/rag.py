from __future__ import annotations

import hashlib
import math
import uuid

from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import and_, delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import DocumentEmbedding, JobDescription, UserDocument


class RAGService:
    def __init__(self) -> None:
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=900,
            chunk_overlap=120,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def _fallback_embedding(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        values = [(digest[i % len(digest)] / 255.0) for i in range(1536)]
        norm = math.sqrt(sum(v * v for v in values)) or 1
        return [v / norm for v in values]

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if not settings.openai_api_key:
            return [self._fallback_embedding(text) for text in texts]

        try:
            from langchain_openai import OpenAIEmbeddings

            embeddings = OpenAIEmbeddings(
                model=settings.embedding_model,
                api_key=settings.openai_api_key,
            )
            return await embeddings.aembed_documents(texts)
        except Exception:
            return [self._fallback_embedding(text) for text in texts]

    async def embed_query(self, text: str) -> list[float]:
        if not settings.openai_api_key:
            return self._fallback_embedding(text)

        try:
            from langchain_openai import OpenAIEmbeddings

            embeddings = OpenAIEmbeddings(
                model=settings.embedding_model,
                api_key=settings.openai_api_key,
            )
            return await embeddings.aembed_query(text)
        except Exception:
            return self._fallback_embedding(text)

    async def store_chunks(
        self,
        session: AsyncSession,
        source_type: str,
        source_id: uuid.UUID,
        text: str,
    ) -> None:
        chunks = [chunk for chunk in self.splitter.split_text(text or "") if chunk.strip()][:8]
        if not chunks:
            return

        await session.execute(
            delete(DocumentEmbedding).where(
                DocumentEmbedding.source_type == source_type,
                DocumentEmbedding.source_id == source_id,
            )
        )
        vectors = await self.embed_documents(chunks)
        for chunk, vector in zip(chunks, vectors, strict=False):
            session.add(
                DocumentEmbedding(
                    source_type=source_type,
                    source_id=source_id,
                    chunk_text=chunk,
                    embedding=vector,
                )
            )

    async def similar_chunks(
        self,
        session: AsyncSession,
        query: str,
        limit: int = 5,
        user_id: uuid.UUID | None = None,
    ) -> list[str]:
        embedding = await self.embed_query(query)
        distance = DocumentEmbedding.embedding.cosine_distance(embedding)

        stmt = select(DocumentEmbedding.chunk_text)
        if user_id is not None:
            user_jd_ids = select(JobDescription.id).where(JobDescription.user_id == user_id)
            user_document_ids = select(UserDocument.id).where(UserDocument.user_id == user_id)
            stmt = stmt.where(
                or_(
                    and_(
                        DocumentEmbedding.source_type == "jd",
                        DocumentEmbedding.source_id.in_(user_jd_ids),
                    ),
                    and_(
                        DocumentEmbedding.source_type.in_(["resume", "portfolio"]),
                        DocumentEmbedding.source_id.in_(user_document_ids),
                    ),
                ),
            )

        result = await session.execute(stmt.order_by(distance).limit(limit))
        return list(result.scalars().all())
