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

    let lastStatus = 0;
    let lastBody = "";

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
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
        lastStatus = response.status;
        lastBody = body;

        if (response.ok) {
          console.log("Status check completed:", response.status, body.slice(0, 500));
          return;
        }

        console.error("Status check failed:", response.status, body.slice(0, 500), "attempt", attempt);
      } catch (error) {
        console.error("Status check request error:", error, "attempt", attempt);
      }

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }

    throw new Error(`Status check failed after retries: HTTP ${lastStatus} ${lastBody.slice(0, 300)}`);
  }
};
