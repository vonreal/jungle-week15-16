from app.services.crawler_mcp import extract_readable_text
from app.api.v1.endpoints.jd import infer_jd_metadata


def test_extract_readable_text_prefers_main_content():
    html = """
    <html>
      <head><style>.hidden { display: none; }</style><script>alert("x")</script></head>
      <body>
        <nav>메뉴 링크</nav>
        <main>
          <h1>백엔드 개발자</h1>
          <p>Spring Boot와 PostgreSQL 경험이 필요합니다.</p>
        </main>
      </body>
    </html>
    """

    text = extract_readable_text(html)

    assert "백엔드 개발자" in text
    assert "Spring Boot와 PostgreSQL 경험" in text
    assert "메뉴 링크" not in text
    assert "alert" not in text


def test_infer_jd_metadata_from_naver_webtoon_text():
    text = """
    [네이버웹툰] AI Applied Engineer (경력)
    모집 부서 NAVER WEBTOON 모집 분야 Tech 모집 분야 AI/ML 모집 경력 경력
    담당 업무 AI 서비스를 위한 백엔드 아키텍처 설계 및 서비스 개발/운영
    """

    metadata = infer_jd_metadata(text, "https://recruit.navercorp.com/rcrt/view.do?annoId=30004993")

    assert metadata["title"] == "[네이버웹툰] AI Applied Engineer (경력)"
    assert metadata["company"] == "네이버"


def test_infer_jd_metadata_from_elice_text():
    text = """
    Empowering AI, Elice. 모바일 엔지니어 (Flutter)는 무엇이 특별할까요?
    주요업무 엘리스LXP의 모바일 버전 개발 Flutter를 활용한 크로스플랫폼 개발
    """

    metadata = infer_jd_metadata(text, "https://elice.career.greetinghr.com/o/flutter")

    assert metadata["title"] == "모바일 엔지니어 (Flutter)는 무엇이 특별할까요?"
    assert metadata["company"] == "엘리스"
