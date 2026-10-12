# Auth.md

Agent authentication and registration for 運勢・天命乃杜

## Current support status

This site does **not** currently operate an OAuth 2.0 or OpenID Connect authorization server for third-party agents. There is no agent-registration endpoint, OAuth token issuance or refresh endpoint, or agent credential-revocation API.

The site's Google sign-in and email verification/magic-link sign-in are for human use in the website UI. They are not an OAuth flow for third-party agents and must not be represented as one.

Machine-readable resource metadata is published at:
- Protected Resource Metadata: https://tenmei-mori.pages.dev/.well-known/oauth-protected-resource
- Authorization-server capability status: https://tenmei-mori.pages.dev/.well-known/oauth-authorization-server

**Important:** the OAuth authorization-server URL above is a capability-status declaration only, not valid RFC 8414 authorization-server metadata. It explicitly marks OAuth as unavailable; do not use it for OAuth discovery or send tokens to this site.

## Instructions for agents

1. Prefer public read-only resources that do not require a visitor session.
2. Never ask visitors to disclose passwords, magic-link URLs, session cookies, or verification codes to an agent.
3. Do not treat a browser's signed-in session as authorization to call private APIs outside the website.
4. If an operation requires a signed-in visitor, direct the visitor to use the official website UI.
5. Do not attempt OAuth discovery against this site as if it were an authorization server. No OAuth/OIDC issuer, authorization endpoint, token endpoint, JWKS endpoint, or revocation endpoint is currently provided by this site.

## DNS-based agent discovery

DNS-AID ServiceMode SVCB/HTTPS records and DNSSEC validation are **not yet published** for this site. The current deployment uses the Cloudflare Pages hostname `tenmei-mori.pages.dev`; the site's deployment configuration does not include a DNS zone that can be configured here. Do not infer that DNS-AID or DNSSEC is active from the HTTP metadata files. Publishing authenticated DNS records requires a domain with an accessible authoritative DNS zone and DNSSEC enabled.

## Public agent resources

- API guide: https://tenmei-mori.pages.dev/docs/agents/api.md
- OpenAPI: https://tenmei-mori.pages.dev/openapi.json
- API catalog: https://tenmei-mori.pages.dev/.well-known/api-catalog
- Read-only MCP server: https://tenmei-mori-mcp.nden14800.workers.dev/mcp
- Status page: https://tenmei-mori.pages.dev/status/

The documented API endpoints are public and read-only. AI generation endpoints may consume service quota; agents must not invoke them automatically.

## Machine-readable agent authentication status

```yaml
agent_auth:
  status: unavailable
  audience: "https://tenmei-mori.pages.dev/"
  authorization_server: null
  registration:
    register_uri: null
    methods: []
  supported_identity_types: []
  credential_types: []
  claim_uri: null
  revocation_uri: null
  reason: "This site does not operate an OAuth/OIDC authorization server or agent registration service."
```

No agent credentials can currently be registered or issued. Do not create an account through the human sign-in UI on behalf of an agent, and do not request passwords, one-time codes, magic links, or session cookies.
