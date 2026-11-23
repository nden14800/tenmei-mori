# Tenmei Mori public API guide

This guide documents existing public, read-only endpoints only. It is not an SLA; endpoints may be rate-limited or temporarily unavailable.

## Base URL
`https://tenmei-mori-backend.nden14800.workers.dev`

## GET /api/system/maintenance
Returns the configured maintenance state. Fields: `active` (boolean), `title`, `message`, `scheduleLabel` (strings), and `retryAfterSeconds` (integer). This reports the maintenance gate, not the health of every dependency.

## GET /api/counter
Returns public aggregate counters with `count` and `user_count` fields.

## Status page
- Status page: https://tenmei-mori.pages.dev/status/
- Monitor data: https://tenmei-mori.pages.dev/status/api/monitors/status

## GET /status/api/monitors/status

Returns the public service-monitor snapshot used by the status page and the read-only MCP `get_service_status` tool. No visitor session or API key is required.

- Main-site route: `https://tenmei-mori.pages.dev/status/api/monitors/status`
- Standalone status-page route: `https://tenmei-mori-status.pages.dev/api/monitors/status`
- Methods: `GET` and CORS preflight `OPTIONS`; all write methods are rejected.
- CORS: public read-only access (`Access-Control-Allow-Origin: *`); credentials are not accepted.
- Cache: successful snapshots may be cached for up to 30 seconds.

The JSON response contains public monitoring data only: `monitors`, active `maintenances`, `lastUpdate`, `checkIntervalMinutes`, `incidentHistory`, and `longTermHistory`. It does not expose visitor accounts, authentication credentials, or private user records.

## Authentication and safety
These GET endpoints do not require a visitor session. Account, write, and AI-generation endpoints are excluded from the public OpenAPI document. The backend is not a general-purpose OAuth authorization server. Google sign-in and email magic-link sign-in do not issue OAuth access tokens to external agents. AI generation may consume service quota; do not invoke it automatically.
