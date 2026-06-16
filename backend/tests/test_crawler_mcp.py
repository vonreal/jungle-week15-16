from app.services.crawler_mcp import extract_readable_text


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
