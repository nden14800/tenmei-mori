export const onRequestGet = async (context: any) => {
  const expected = "discord-alert-test-20261004-7f4c9b2e"
  const supplied = new URL(context.request.url).searchParams.get("token")
  if (supplied !== expected) return new Response("Not Found", { status: 404 })

  const { DISCORD_STATUS_ALERT_URL, DISCORD_STATUS_ALERT_SECRET } = context.env
  if (!DISCORD_STATUS_ALERT_URL || !DISCORD_STATUS_ALERT_SECRET) return new Response("Discord configuration missing", { status: 503 })

  const response = await fetch(DISCORD_STATUS_ALERT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Status-Alert-Auth": DISCORD_STATUS_ALERT_SECRET,
    },
    body: JSON.stringify({
      monitor: "天命乃杜 Status（実動作テスト）",
      url: "https://tenmei-mori.pages.dev/",
      previousStatus: "down",
      currentStatus: "operational",
      responseTime: 123,
    }),
  })

  const body = await response.text()
  return new Response(JSON.stringify({ ok: response.ok, status: response.status, body }), {
    status: response.ok ? 200 : 502,
    headers: { "Content-Type": "application/json" },
  })
}
