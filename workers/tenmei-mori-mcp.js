const SITE = "https://tenmei-mori.pages.dev";
const STATUS_URL = SITE + "/status/api/monitors/status";
const SERVER_CARD = {"$schema":"https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json","version":"1.0","protocolVersion":"2025-06-18","serverInfo":{"name":"tenmei-mori-mcp","title":"運勢・天命乃杜 — Public MCP","version":"1.0.0"},"description":"Read-only discovery tools for the public Tenmei Mori website. No visitor account, OAuth token, personal data, write operation, or AI-generation endpoint is exposed.","documentationUrl":"https://tenmei-mori.pages.dev/docs/agents/api.md","transport":{"type":"streamable-http","endpoint":"https://tenmei-mori-mcp.nden14800.workers.dev/mcp"},"capabilities":{"tools":{"listChanged":false}},"authentication":{"required":false,"schemes":[]},"tools":"dynamic"};
const RESOURCE_LIST = [
  { id: "home", name: "Homepage", url: SITE + "/", description: "Official Tenmei Mori website." },
  { id: "status", name: "Service status", url: SITE + "/status/", description: "Public service status page." },
  { id: "api-guide", name: "Public API guide", url: SITE + "/docs/agents/api.md", description: "Read-only API documentation." },
  { id: "api-catalog", name: "API catalog", url: SITE + "/.well-known/api-catalog", description: "Machine-readable API links." },
  { id: "openapi", name: "OpenAPI", url: SITE + "/openapi.json", description: "Public read-only API specification." },
  { id: "mcp-card", name: "MCP Server Card", url: SITE + "/.well-known/mcp/server-card.json", description: "Machine-readable MCP server metadata." }
];
const TOOLS = [
  { name: "site_info", description: "Get official site information and safe public resource links.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "list_public_resources", description: "List public Tenmei Mori resources that do not require visitor sign-in.", inputSchema: { type: "object", properties: { category: { type: "string", enum: ["all", "status", "api", "site"] } }, additionalProperties: false } },
  { name: "get_service_status", description: "Fetch the current public monitor status. Read-only; does not invoke AI features.", inputSchema: { type: "object", properties: {}, additionalProperties: false } }
];
function response(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": SITE,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version",
    "Access-Control-Expose-Headers": "MCP-Protocol-Version",
    "Cache-Control": "no-store",
    ...extra
  }});
}
function rpcResult(id, result) { return response(JSON.stringify({ jsonrpc: "2.0", id, result })); }
function rpcError(id, code, message) { return response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), 200); }
function toolResult(data) {
  return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data, isError: false };
}
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      const origin = request.headers.get("Origin");
      if (origin && origin !== SITE) return new Response("Forbidden origin", { status: 403 });
      return new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": SITE,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version",
        "Access-Control-Max-Age": "86400"
      }});
    }
    const origin = request.headers.get("Origin");
    if (origin && origin !== SITE && url.pathname !== "/.well-known/mcp/server-card.json") return new Response("Forbidden origin", { status: 403 });
    if (url.pathname === "/.well-known/mcp/server-card.json" && request.method === "GET") {
      return new Response(JSON.stringify(SERVER_CARD, null, 2), { status: 200, headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff"
      }});
    }
    if (url.pathname === "/health" && request.method === "GET") {
      return response(JSON.stringify({ status: "ok", server: "tenmei-mori-mcp", version: "1.0.0" }));
    }
    if (url.pathname !== "/mcp") return response(JSON.stringify({ error: "Not Found" }), 404);
    if (request.method !== "POST") return response(JSON.stringify({ error: "Use POST for MCP Streamable HTTP requests." }), 405, { Allow: "POST, OPTIONS" });
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > 65536) return response(JSON.stringify({ error: "Request too large" }), 413);
    let body;
    try { body = await request.json(); } catch (_) { return response(JSON.stringify({ error: "Invalid JSON" }), 400); }
    if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") return response(JSON.stringify({ error: "Invalid JSON-RPC request" }), 400);
    if (!Object.prototype.hasOwnProperty.call(body, "id")) return new Response(null, { status: 202 });
    const id = body.id;
    if (body.method === "initialize") {
      const requested = body.params?.protocolVersion;
      const version = ["2025-03-26", "2025-06-18", "2025-11-25"].includes(requested) ? requested : "2025-03-26";
      return rpcResult(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "tenmei-mori-mcp", version: "1.0.0", title: "運勢・天命乃杜 public tools" },
        instructions: "Read-only public information only. No visitor sessions, OAuth tokens, personal data operations, or AI-generation calls are exposed."
      });
    }
    if (body.method === "ping") return rpcResult(id, {});
    if (body.method === "tools/list") return rpcResult(id, { tools: TOOLS });
    if (body.method === "tools/call") {
      const name = body.params?.name;
      const args = body.params?.arguments || {};
      if (name === "site_info") {
        return rpcResult(id, toolResult({
          name: "運勢・天命乃杜",
          url: SITE + "/",
          description: "Free Japanese browser-based fortune-drawing site with a 12-level omikuji.",
          resources: RESOURCE_LIST,
          auth: "Human sign-in exists in the website UI, but no public OAuth/OIDC agent authorization server is published."
        }));
      }
      if (name === "list_public_resources") {
        const category = args.category || "all";
        const resources = RESOURCE_LIST.filter((r) => category === "all"
          || (category === "status" && r.id === "status")
          || (category === "api" && ["api-guide", "api-catalog", "openapi", "mcp-card"].includes(r.id))
          || (category === "site" && r.id === "home"));
        return rpcResult(id, toolResult({ resources }));
      }
      if (name === "get_service_status") {
        try {
          const result = await fetch(STATUS_URL, { headers: { "Accept": "application/json" } });
          if (!result.ok) throw new Error("Status endpoint returned HTTP " + result.status);
          return rpcResult(id, toolResult(await result.json()));
        } catch (_) {
          return rpcResult(id, { content: [{ type: "text", text: "Public status is temporarily unavailable." }], isError: true });
        }
      }
      return rpcError(id, -32602, "Unknown tool name.");
    }
    return rpcError(id, -32601, "Method not found.");
  }
};