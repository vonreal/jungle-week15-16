from __future__ import annotations

from io import BytesIO
import re
from pathlib import Path


class DocumentTextExtractorService:
    def extract_text(self, filename: str | None, body: bytes) -> str:
        suffix = Path(filename or "").suffix.lower()
        if suffix == ".pdf":
            return self._extract_pdf(body)
        if suffix == ".docx":
            return self._extract_docx(body)
        return body.decode("utf-8", errors="ignore")

    def _extract_pdf(self, body: bytes) -> str:
        from pypdf import PdfReader

        reader = PdfReader(BytesIO(body))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(page.strip() for page in pages if page.strip())

    def _extract_docx(self, body: bytes) -> str:
        from docx import Document

        document = Document(BytesIO(body))
        paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs]
        table_cells = [
            cell.text.strip()
            for table in document.tables
            for row in table.rows
            for cell in row.cells
            if cell.text.strip()
        ]
        return "\n".join(text for text in [*paragraphs, *table_cells] if text)


class DocumentParserService:
    async def extract_experiences(self, raw_text: str | None) -> list[str]:
        if not raw_text:
            return []

        candidates = re.split(r"[\n\r]+|[•\-]\s+", raw_text)
        experiences = []
        for candidate in candidates:
            cleaned = re.sub(r"\s+", " ", candidate).strip()
            if len(cleaned) >= 12 and any(
                key in cleaned.lower()
                for key in ["개발", "구현", "설계", "운영", "배포", "api", "docker", "aws", "react"]
            ):
                experiences.append(cleaned)

        return experiences[:30]
