const SITE_OVERVIEW = "# 運勢・天命乃杜\n\nOfficial site: https://tenmei-mori.pages.dev/\n\n運勢・天命乃杜 is a free Japanese browser-based fortune-drawing site. Visitors can draw a 12-level omikuji without registering. The site also offers zodiac/blood-type readings, AI dream interpretation and worry consultation, personal history and amulets, statistics, rankings, articles, and a public status page.\n\n## Agent resources\n- API catalog: https://tenmei-mori.pages.dev/.well-known/api-catalog\n- Public read-only OpenAPI: https://tenmei-mori.pages.dev/openapi.json\n- API guide: https://tenmei-mori.pages.dev/docs/agents/api.md\n- Status page: https://tenmei-mori.pages.dev/status/\n- Monitor endpoint: https://tenmei-mori.pages.dev/status/api/monitors/status\n\nHuman sign-in is available in the website UI, but no public OAuth/OIDC agent authorization server is currently published. A read-only MCP server is available at https://tenmei-mori-mcp.nden14800.workers.dev/mcp. AI generation endpoints may consume quota and should not be invoked automatically.\n";
const LINK_HEADER = '</.well-known/api-catalog>; rel="api-catalog", </openapi.json>; rel="service-desc", </docs/agents/api.md>; rel="service-doc", </auth.md>; rel="describedby", </.well-known/oauth-protected-resource>; rel="describedby", </status/api/monitors/status>; rel="status", </.well-known/agent-skills/index.json>; rel="describedby", </.well-known/mcp/server-card.json>; rel="describedby"';

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const accept = request.headers.get("Accept") || "";
  const isDocumentPath = !/\.[^/]+$/.test(url.pathname)
    && !url.pathname.startsWith("/.well-known/")
    && !url.pathname.startsWith("/status/api/");

  // HTML remains the browser default. Explicit Markdown requests receive a concise
  // site overview instead of the JavaScript SPA shell.
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
    return new HTMLRewriter().on("body", {
      element(element) {
        element.append('<script src="/scripts/agent-discovery.js" defer></script>', { html: true });
      }
    }).transform(new Response(response.body, {
      status: response.status, statusText: response.statusText, headers
    }));
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
