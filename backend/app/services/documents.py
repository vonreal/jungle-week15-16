from __future__ import annotations

import re


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

