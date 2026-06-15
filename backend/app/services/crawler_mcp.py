from __future__ import annotations

import httpx
from bs4 import BeautifulSoup


class MCPCrawlerService:
    """MCP-facing crawler boundary.

    The production hook can be replaced with an MCP Python SDK server/client. This default
    implementation keeps local development simple while preserving the service seam.
    """

    async def fetch_text(self, url: str) -> str:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        for node in soup(["script", "style", "noscript"]):
            node.decompose()
        return " ".join(soup.get_text(" ").split())

