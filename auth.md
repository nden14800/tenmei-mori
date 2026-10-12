# Agent authentication for 運勢・天命乃杜

The website supports human sign-in through Google or email verification/magic links in the website UI. These are not a published OAuth 2.0 authorization server for third-party agents.

Currently there is no public agent-registration endpoint, OAuth/OIDC issuer operated by this site, OAuth token issuance/refresh endpoint, OAuth Protected Resource Metadata document, or agent credential-revocation API.

## Instructions for agents
1. Prefer public read-only resources that do not require a visitor session.
2. Never ask visitors to disclose passwords, magic-link URLs, session cookies, or verification codes to an agent.
3. Do not treat a browser's signed-in session as authorization to call private APIs outside the website.
4. If an operation requires a signed-in visitor, direct the visitor to use the official website UI.

- API guide: https://tenmei-mori.pages.dev/docs/agents/api.md
- OpenAPI: https://tenmei-mori.pages.dev/openapi.json
- Status page: https://tenmei-mori.pages.dev/status/
