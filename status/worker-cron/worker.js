export default {
  async fetch(request, env) {
    const authToken = request.headers.get("X-Cron-Auth");

    if (!authToken || authToken !== env.CRON_SECRET) {
      return new Response("Access denied", { status: 401 });
    }

    return new Response("OK", { status: 200 });
  },

  async scheduled(event, env, ctx) {
    if (!env.CRON_SECRET) {
      throw new Error("CRON_SECRET is not configured");
    }

    const target = "https://tenmei-mori.pages.dev/status/api/cron/check";
    const userAgent = env.CRON_USER_AGENT || "tenmei-mori-uptimeworker/1.0";

    console.log("Cron started:", new Date(event.scheduledTime).toISOString());

    const response = await fetch(target, {
      method: "POST",
      headers: {
        "X-Cron-Auth": env.CRON_SECRET,
        "X-Cron-Worker": "tenmei-mori-uptimeworker-cron",
        "User-Agent": userAgent,
        "Cache-Control": "no-store"
      }
    });

    const body = await response.text();

    if (!response.ok) {
      console.error("Status check failed:", response.status, body.slice(0, 500));
      throw new Error(`Status check failed with HTTP ${response.status}`);
    }

    console.log("Status check completed:", response.status, body.slice(0, 500));
  }
};
