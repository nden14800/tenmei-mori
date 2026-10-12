# Auth.md

Agent authentication and registration for 運勢・天命乃杜

The website supports human sign-in through Google or email verification/magic links in the website UI. These are not a published OAuth 2.0 authorization server for third-party agents.

Currently there is no public agent-registration endpoint, OAuth/OIDC issuer operated by this site, OAuth token issuance/refresh endpoint, or agent credential-revocation API. The site's Google/email sign-in is for human use in the website UI and must not be treated as an OAuth flow for third-party agents.

## Instructions for agents
1. Prefer public read-only resources that do not require a visitor session.
2. Never ask visitors to disclose passwords, magic-link URLs, session cookies, or verification codes to an agent.
3. Do not treat a browser's signed-in session as authorization to call private APIs outside the website.
4. If an operation requires a signed-in visitor, direct the visitor to use the official website UI.

- API guide: https://tenmei-mori.pages.dev/docs/agents/api.md
- OpenAPI: https://tenmei-mori.pages.dev/openapi.json
- Status page: https://tenmei-mori.pages.dev/status/


## Machine-readable agent authentication status

```yaml
agent_auth:
  status: unavailable
  audience: "https://tenmei-mori.pages.dev"
  registration:
    register_uri: null
    methods: []
  supported_identity_types: []
  credential_types: []
  claim_uri: null
  revocation_uri: null
  reason: "This site does not operate an OAuth/OIDC authorization server or agent registration service."
```

No agent credentials can currently be registered or issued. Do not attempt to create an account through the human sign-in UI on behalf of an agent, and do not request passwords, one-time codes, magic links, or session cookies.
