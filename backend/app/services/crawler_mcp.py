from __future__ import annotations

import sys
from typing import Any

import httpx
from bs4 import BeautifulSoup
from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client


def extract_readable_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for node in soup(["script", "style", "noscript", "svg", "canvas", "iframe"]):
        node.decompose()

    main = soup.select_one(
        "main, article, [role='main'], .job-detail, .job-description, .posting, .content"
    )
    source = main or soup
    return " ".join(source.get_text(" ").split())


class MCPCrawlerService:
    """Fetch job posting text through an MCP Python SDK tool server."""

    async def fetch_text(self, url: str) -> str:
        try:
            return await self._fetch_via_mcp(url)
        except Exception:
            return await self._fetch_direct(url)

    async def _fetch_via_mcp(self, url: str) -> str:
        server = StdioServerParameters(
            command=sys.executable,
            args=["-m", "app.mcp_servers.jd_crawler"],
        )
        async with stdio_client(server) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                result = await session.call_tool("fetch_job_posting", {"url": url})
                text = self._tool_result_text(result)
                if not text:
                    raise ValueError("MCP crawler returned empty text")
                return text

    async def _fetch_direct(self, url: str) -> str:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
        return extract_readable_text(response.text)

    def _tool_result_text(self, result: Any) -> str:
        parts = []
        for item in getattr(result, "content", []) or []:
            text = getattr(item, "text", None)
            if text:
                parts.append(text)
        return " ".join(" ".join(parts).split())
