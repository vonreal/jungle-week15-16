from __future__ import annotations

from urllib.parse import urlparse

import httpx
from mcp.server.fastmcp import FastMCP

from app.services.crawler_mcp import extract_readable_text

mcp = FastMCP("careerbuddy-jd-crawler")


def _validate_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("http 또는 https 채용공고 URL만 입력할 수 있습니다.")
    return url


@mcp.tool()
async def fetch_job_posting(url: str) -> str:
    """Fetch a public job posting URL and return readable text for JD analysis."""

    target_url = _validate_url(url)
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "CareerBuddyMCP/1.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=headers) as client:
        response = await client.get(target_url)
        response.raise_for_status()

    text = extract_readable_text(response.text)
    if not text:
        raise ValueError("채용공고 본문을 추출하지 못했습니다.")
    return text


if __name__ == "__main__":
    mcp.run(transport="stdio")
