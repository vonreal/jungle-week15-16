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
