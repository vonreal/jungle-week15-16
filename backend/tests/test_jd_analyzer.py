from app.services.jd_analyzer import JDAnalyzerService


def test_extract_requirements_matches_korean_docker_alias():
    analyzer = JDAnalyzerService()

    requirements = analyzer.extract_requirements("도커 기반 서버 운영 경험이 필요합니다.")

    assert {"skill_name": "Docker", "importance": "preferred"} in requirements


def test_classify_experience_matches_korean_docker_alias():
    analyzer = JDAnalyzerService()

    classification, reason = analyzer.classify_experience(
        "도커를 이용해 웹 서버를 운용하며 웹 서비스를 제공한 경험이 있습니다.",
        ["Docker"],
    )

    assert classification == "essential"
    assert "Docker" in reason


def test_extract_requirements_ignores_company_intro_in_elice_mobile_jd():
    analyzer = JDAnalyzerService()
    raw_text = """
AI 인프라 혁신을 통한 AI 에코시스템 구축
• 최신 GPU 및 국산 NPU를 탑재한 AI PMDC 통해 고성능 AI 인프라 구축 및 서비스 제공
• 정부 및 공공기관에 안정적인 클라우드 환경 제공이 가능한 보안인증 획득
Flutter로 크로스플랫폼 애플리케이션을 개발하며 컨테이너 기반 실습 환경을 제공합니다.

주요업무
• 엘리스LXP의 모바일 버전 개발
• Flutter를 활용한 크로스플랫폼(iOS/Android) 모바일 애플리케이션 개발
• Product, UX, Backend 팀과 긴밀히 협업하여 프로젝트 개발
자격요건
• 5년 이상의 모바일 앱 개발 경력 (Flutter 경력 2년 이상 보유)
우대사항
• 자동화 테스트 작성 경험

[사용 중인 기술스택]
• Flutter
• GitLab
• WebSocket
• WebRTC
혜택 및 복지
• 클로드코드 지원
"""

    requirement_names = {item["skill_name"] for item in analyzer.extract_requirements(raw_text)}

    assert {
        "Flutter",
        "iOS",
        "Android",
        "GitLab",
        "WebSocket",
        "WebRTC",
        "자동화 테스트",
    }.issubset(requirement_names)
    assert "Docker" not in requirement_names
    assert "AWS" not in requirement_names
