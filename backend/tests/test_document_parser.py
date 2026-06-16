import pytest

from app.services.documents import DocumentParserService


@pytest.mark.asyncio
async def test_extract_experiences_ignores_skill_rubric(monkeypatch):
    monkeypatch.setattr("app.services.documents.settings.openai_api_key", None)
    raw_text = """
02. 기본기 숙련도
1-연습 숙련도 2-초보 숙련도 3-기본 숙련도 4-실무 숙련도
주요 분야 기술역량 수준
웹 프로그래밍 여러가지 기술을 조합하여 DB - Server - Web 기반의 프로젝트를 구현할 수 있음 1
데이터베이스 데이터베이스에 대한 이해를 바탕으로 자료구조를 설계하고, 자료를 적재, 수정할 수 있음 0

03. 언어 및 도구 숙련도
프로그래밍 언어 Java (2), JavaScript (2), Python (3), C(4), swift(2)
개발 프레임워크 Spring (1), Node JS (2)
운영환경구축 Nginx (2)

04. 프로젝트 경험
● 전자정부프레임워크 기반의 레거시를 이해하고 코드를 분석하여 신규 기능 개발을 ERD 설계부터
배포까지 진행할 수 있습니다.
● 파이썬을 이용하여 웹에서 데이터를 수집하고 텔레그램 API에 접목하여 학교 공지봇을 한달간 운영했습니다.
"""

    experiences = await DocumentParserService().extract_experiences(raw_text)

    assert len(experiences) == 2
    assert all("숙련도" not in experience for experience in experiences)
    assert all("Java (2)" not in experience for experience in experiences)
    assert any("전자정부프레임워크" in experience and "배포까지" in experience for experience in experiences)
    assert any("텔레그램 API" in experience for experience in experiences)
