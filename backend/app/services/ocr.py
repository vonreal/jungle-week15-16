from __future__ import annotations


class OCRService:
    async def extract_text(self, filename: str, content: bytes) -> str:
        return (
            f"{filename} 이미지 OCR 대기 상태입니다. "
            "운영 환경에서는 Tesseract, AWS Textract, 또는 Vision OCR 제공자를 연결하세요. "
            f"파일 크기: {len(content)} bytes"
        )

