const SITE_OVERVIEW = "# 運勢・天命乃杜\n\nOfficial site: https://tenmei-mori.pages.dev/\n\n運勢・天命乃杜 is a free Japanese browser-based fortune-drawing site. Visitors can draw a 12-level omikuji without registering. The site also offers zodiac/blood-type readings, AI dream interpretation and worry consultation, personal history and amulets, statistics, rankings, articles, and a public status page.\n\n## Agent resources\n- API catalog: https://tenmei-mori.pages.dev/.well-known/api-catalog\n- Public read-only OpenAPI: https://tenmei-mori.pages.dev/openapi.json\n- API guide: https://tenmei-mori.pages.dev/docs/agents/api.md\n- Auth guide: https://tenmei-mori.pages.dev/auth.md\n- OAuth Protected Resource Metadata: https://tenmei-mori.pages.dev/.well-known/oauth-protected-resource\n- OAuth authorization-server capability status (OAuth unavailable): https://tenmei-mori.pages.dev/.well-known/oauth-authorization-server\n- Status page: https://tenmei-mori.pages.dev/status/\n- Monitor endpoint: https://tenmei-mori.pages.dev/status/api/monitors/status\n\nHuman sign-in is available in the website UI, but no public OAuth/OIDC agent authorization server is currently operated. DNS-AID records and DNSSEC are not published for the pages.dev hostname. A read-only MCP server is available at https://tenmei-mori-mcp.nden14800.workers.dev/mcp. AI generation endpoints may consume quota and should not be invoked automatically.\n";
const LINK_HEADER = '</.well-known/api-catalog>; rel="api-catalog", </openapi.json>; rel="service-desc", </docs/agents/api.md>; rel="service-doc", </auth.md>; rel="describedby", </.well-known/oauth-protected-resource>; rel="describedby", </.well-known/oauth-authorization-server>; rel="describedby", </status/api/monitors/status>; rel="status", </.well-known/agent-skills/index.json>; rel="describedby", </.well-known/mcp/server-card.json>; rel="describedby"';

export async function onRequest({ request, next }) {
  const url = new URL(request.url);

  // Same-origin BFF: forward API requests to the Worker while preserving browser
  // Origin, Cookie, Authorization (legacy migration only), body, and Set-Cookie.
  if (url.pathname.startsWith("/api/")) {
    const upstreamUrl = new URL(request.url);
    upstreamUrl.protocol = "https:";
    upstreamUrl.hostname = "tenmei-mori-backend.nden14800.workers.dev";
    const upstreamRequest = new Request(upstreamUrl.toString(), request);
    const upstreamResponse = await fetch(upstreamRequest);
    const proxyHeaders = new Headers(upstreamResponse.headers);
    if (url.pathname.startsWith("/api/auth/")) {
      proxyHeaders.set("Cache-Control", "no-store, max-age=0");
      proxyHeaders.set("CDN-Cache-Control", "no-store");
    }
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: proxyHeaders
    });
  }

  const accept = request.headers.get("Accept") || "";
  const isDocumentPath = !/\.[^/]+$/.test(url.pathname)
    && !url.pathname.startsWith("/.well-known/")
    && !url.pathname.startsWith("/status/api/");

  if (request.method === "GET" && isDocumentPath && accept.includes("text/markdown")) {
    const headers = new Headers({
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
      "Vary": "Accept",
      "Link": LINK_HEADER
    });
    return new Response(SITE_OVERVIEW, { status: 200, headers });
  }

  const response = await next();
  const headers = new Headers(response.headers);
  if (url.pathname === "/" || url.pathname === "/index.html") headers.set("Link", LINK_HEADER);

  if (request.method === "GET" && (headers.get("Content-Type") || "").includes("text/html")) {
    const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
    const nonce = btoa(String.fromCharCode(...nonceBytes));
    headers.set("Content-Security-Policy",
      `default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' https://www.googletagmanager.com https://www.clarity.ms https://challenges.cloudflare.com https://cdnjs.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://www.gstatic.com https://*.cdninstagram.com; connect-src 'self' https://tenmei-discord-bot.nden14800.workers.dev https://*.google-analytics.com https://*.clarity.ms https://challenges.cloudflare.com https://cdn.jsdelivr.net https://storage.googleapis.com https://bergamot.s3.amazonaws.com; frame-src https://challenges.cloudflare.com; manifest-src 'self'; worker-src 'self' blob:; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`);
    return new HTMLRewriter()
      .on("script", {
        element(element) {
          element.setAttribute("nonce", nonce);
        }
      })
      .on("body", {
        element(element) {
          element.append(`<script nonce="${nonce}" src="/scripts/agent-discovery.js" defer></script>`, { html: true });
        }
      })
      .transform(new Response(response.body, {
        status: response.status, statusText: response.statusText, headers
      }));
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
