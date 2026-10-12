---
name: tenmei-mori
description: Discover Tenmei Mori public resources and use its documented read-only endpoints safely.
---

# Tenmei Mori agent guide

## Public resources
- Official site: https://tenmei-mori.pages.dev/
- Status page: https://tenmei-mori.pages.dev/status/
- API guide: https://tenmei-mori.pages.dev/docs/agents/api.md
- API catalog: https://tenmei-mori.pages.dev/.well-known/api-catalog
- OpenAPI: https://tenmei-mori.pages.dev/openapi.json

## Safe use
- Prefer documented read-only GET endpoints.
- Backend origin: https://tenmei-mori-backend.nden14800.workers.dev.
- Human Google/email sign-in is not an OAuth authorization server for agents. No agent registration or token-issuance endpoint is currently published.
- Do not invoke AI generation endpoints automatically; they may consume service quota and are rate limited.
- Do not submit, store, or infer personal information without explicit user direction.
- The site does not currently expose a standalone MCP server. WebMCP browser tools are feature-detected and only available in compatible browsers.
