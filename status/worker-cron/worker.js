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
      console.error("CRON_SECRET is not configured");
      return;
    }

    const target = "https://tenmei-mori.pages.dev/api/cron/check";
    const userAgent = env.CRON_USER_AGENT || "tenmei-mori-uptimeworker/1.0";

    try {
      const response = await fetch(target, {
        method: "POST",
        headers: {
          "X-Cron-Auth": env.CRON_SECRET,
          "User-Agent": userAgent
        }
      });

      if (!response.ok) {
        console.error("Status check failed:", response.status);
      }
    } catch (error) {
      console.error("Status check request failed:", error);
    }
  }
};