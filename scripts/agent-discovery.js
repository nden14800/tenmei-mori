(() => {
  "use strict";
  const modelContext = document.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== "function") return;

  const resources = [
    { id: "home", name: "Homepage", url: "https://tenmei-mori.pages.dev/", description: "Official website." },
    { id: "status", name: "Service status", url: "https://tenmei-mori.pages.dev/status/", description: "Public service status." },
    { id: "api-guide", name: "API guide", url: "https://tenmei-mori.pages.dev/docs/agents/api.md", description: "Read-only API documentation." },
    { id: "api-catalog", name: "API catalog", url: "https://tenmei-mori.pages.dev/.well-known/api-catalog", description: "Machine-readable API links." },
    { id: "mcp-card", name: "MCP Server Card", url: "https://tenmei-mori.pages.dev/.well-known/mcp/server-card.json", description: "Read-only MCP server metadata." }
  ];
  const definitions = [
    {
      name: "tenmei_mori_site_info",
      description: "Get official site information and public agent-discovery endpoints for 運勢・天命乃杜.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => ({
        name: "運勢・天命乃杜",
        url: "https://tenmei-mori.pages.dev/",
        description: "A free Japanese browser-based fortune-drawing site with a 12-level omikuji.",
        resources,
        agentAuth: "No public OAuth/OIDC agent authorization server is currently published."
      })
    },
    {
      name: "tenmei_mori_list_public_resources",
      description: "List public website resources that do not require signing in.",
      inputSchema: {
        type: "object",
        properties: { category: { type: "string", enum: ["all", "status", "api", "site"] } },
        additionalProperties: false
      },
      execute: async ({ category = "all" } = {}) => ({
        resources: resources.filter((r) => category === "all"
          || (category === "status" && r.id === "status")
          || (category === "api" && ["api-guide", "api-catalog", "mcp-card"].includes(r.id))
          || (category === "site" && r.id === "home"))
      })
    },
    {
      name: "tenmei_mori_open_public_resource",
      description: "Open a fixed allowlisted public resource in the current browser tab. Does not submit data or sign in.",
      inputSchema: {
        type: "object",
        properties: { resourceId: { type: "string", enum: resources.map((r) => r.id) } },
        required: ["resourceId"],
        additionalProperties: false
      },
      execute: async ({ resourceId } = {}) => {
        const resource = resources.find((r) => r.id === resourceId);
        if (!resource) throw new Error("Unknown public resource.");
        window.location.assign(resource.url);
        return { opened: resource.id, url: resource.url };
      }
    }
  ];
  const controller = new AbortController();
  Promise.resolve().then(async () => {
    for (const definition of definitions) {
      try { await modelContext.registerTool(definition, { signal: controller.signal }); }
      catch (error) { console.debug("[Tenmei Mori WebMCP] Registration unavailable:", definition.name, error); }
    }
  });
  window.addEventListener("pagehide", () => controller.abort(), { once: true });
})();
