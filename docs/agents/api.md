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

## Authentication and safety
These GET endpoints do not require a visitor session. Account, write, and AI-generation endpoints are excluded from the public OpenAPI document. The backend is not a general-purpose OAuth authorization server. Google sign-in and email magic-link sign-in do not issue OAuth access tokens to external agents. AI generation may consume service quota; do not invoke it automatically.
