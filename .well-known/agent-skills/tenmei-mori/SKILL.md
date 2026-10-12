---
name: tenmei-mori
description: Discover Tenmei Mori public resources, query its read-only MCP tools, and use documented endpoints safely.
---

# Tenmei Mori agent guide

## Public resources
- Official site: https://tenmei-mori.pages.dev/
- Status page: https://tenmei-mori.pages.dev/status/
- API guide: https://tenmei-mori.pages.dev/docs/agents/api.md
- API catalog: https://tenmei-mori.pages.dev/.well-known/api-catalog
- OpenAPI: https://tenmei-mori.pages.dev/openapi.json
- MCP Server Card: https://tenmei-mori.pages.dev/.well-known/mcp/server-card.json
- MCP endpoint: https://tenmei-mori-mcp.nden14800.workers.dev/mcp

## Safe use
- Prefer documented read-only GET endpoints and read-only MCP tools.
- The MCP server exposes site information, public resource links, and public service status only.
- Human Google/email sign-in is not an OAuth authorization server for agents. No agent registration or token-issuance endpoint is currently published.
- Do not invoke AI generation endpoints automatically; they may consume service quota and are rate limited.
- Do not submit, store, or infer personal information without explicit user direction.
