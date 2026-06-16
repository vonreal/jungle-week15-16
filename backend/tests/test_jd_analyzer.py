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


def test_matched_requirements_returns_evidence_keywords():
    analyzer = JDAnalyzerService()

    matched = analyzer.matched_requirements(
        "도커 환경에서 크론으로 스크래핑 서버를 운영하고 GitLab으로 배포했습니다.",
        ["Docker", "GitLab", "Flutter"],
    )

    assert matched == ["Docker", "GitLab"]


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


def test_extract_requirements_ignores_naver_filter_navigation():
    analyzer = JDAnalyzerService()
    raw_text = """
NAVER Careers Teams Tech Design Service & Business Jobs Login Search Jobs
직군/직무 Tech 전체 Software Development Frontend Android iOS Backend AI/ML Data Engineering

조직 소개
웹툰 AI 조직에서 필요한 개발 관련 작업을 수행하는 조직입니다.

담당 업무
- AI 서비스를 위한 백엔드 아키텍처 설계 및 서비스 개발/운영
- Inference 성능 개선 및 서비스 시스템 효율화 작업 진행
- GenAI 기반 서비스 개발 AI 핵심 기능의 백엔드 설계 및 개발

필요 역량
- 경력 2~6년 이상의 백엔드 개발 경험이 있으신 분
- Docker, Kubernetes 등의 container 기반 환경에서 서비스 경험이 있으신 분
- AI 모델의 특성을 이해하고, 이를 실제 서비스 로직에 맞게 설계하고 적용해 본 경험이 있으신 분
- Java, Kotlin, Python 중 하나 이상의 언어에 매우 능숙하신 분

우대 사항
- LLM/GenAI 서비스 경험
- vLLM, TensorRT, Triton Inference Server 등 로컬 모델 최적화 및 서빙 프레임워크 사용 경험
- PyTorch, TensorFlow 등 주요 ML 프레임워크 사용 경험
- MLOps(Kubeflow, MLflow 등) 경험

전형 절차 및 안내 사항
- 지원서 리뷰 후 인터뷰
"""

    requirements = analyzer.extract_requirements(raw_text)
    requirement_names = {item["skill_name"] for item in requirements}
    importance_by_name = {item["skill_name"]: item["importance"] for item in requirements}

    assert "iOS" not in requirement_names
    assert "Android" not in requirement_names
    assert "앱 성능 최적화" not in requirement_names
    assert {
        "백엔드 아키텍처",
        "Inference 최적화",
        "LLM/GenAI",
        "AI 인프라",
        "Java",
        "Kotlin",
        "Python",
        "Docker",
        "Kubernetes",
        "MLOps",
        "vLLM",
        "TensorRT",
        "Triton Inference Server",
        "PyTorch",
        "TensorFlow",
    }.issubset(requirement_names)
    assert importance_by_name["Docker"] == "required"
    assert importance_by_name["Kubernetes"] == "required"
    assert importance_by_name["Java"] == "required"
    assert importance_by_name["LLM/GenAI"] == "preferred"
    assert importance_by_name["PyTorch"] == "preferred"
