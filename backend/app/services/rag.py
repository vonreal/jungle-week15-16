from __future__ import annotations

import hashlib
import math
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DocumentEmbedding


class RAGService:
    def embed_text(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        values = [(digest[i % len(digest)] / 255.0) for i in range(1536)]
        norm = math.sqrt(sum(v * v for v in values)) or 1
        return [v / norm for v in values]

    async def store_chunks(
        self,
        session: AsyncSession,
        source_type: str,
        source_id: uuid.UUID,
        text: str,
    ) -> None:
        chunks = [text[i : i + 900] for i in range(0, len(text), 900)] or [text]
        for chunk in chunks[:8]:
            session.add(
                DocumentEmbedding(
                    source_type=source_type,
                    source_id=source_id,
                    chunk_text=chunk,
                    embedding=self.embed_text(chunk),
                )
            )

    async def similar_chunks(self, session: AsyncSession, query: str, limit: int = 5) -> list[str]:
        embedding = self.embed_text(query)
        distance = DocumentEmbedding.embedding.cosine_distance(embedding)
        result = await session.execute(
            select(DocumentEmbedding.chunk_text).order_by(distance).limit(limit)
        )
        return list(result.scalars().all())

