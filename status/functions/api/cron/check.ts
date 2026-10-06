/**
 * Endpoint pour déclencher les checks
 * Appelé par le Worker cron externe via POST avec header X-Cron-Auth
 *
 * POST /api/cron/check
 * Header: X-Cron-Auth: YOUR_SECRET
 */

import monitorsConfig from '../../../monitors.json'
import {
  classifyMonitorStatus,
  hasCloudflareChallengeHeaders,
  hasCloudflareTransitHeaders,
  isCloudflareChallengeStatus,
  type MonitorStatus,
} from '../../../src/lib/status'
import { appendDailyCheck, calculateDailyUptime, type DailyHistoryPoint } from '../../../src/lib/monitorHistory'
import {
  fetchMonitorSafely,
  mapWithConcurrency,
  parseCheckInterval,
  readResponseTextPrefix,
} from '../../../src/lib/monitorRequest'

interface Monitor {
  id: string
  name: string
  url: string
  method?: string
  acceptedStatusCodes?: string[]
  followRedirect?: boolean
  degradedCountsAsDown?: boolean
  acceptCloudflareChallenge?: boolean
}

const monitors: Monitor[] = monitorsConfig as Monitor[]
const MAX_CONCURRENT_CHECKS = 5
let checkRunInProgress = false

interface LongTermSummary {
  period: string
  checks: number
  operational: number
  degraded: number
  down: number
  maintenance: number
  uptime: number
}

function updateLongTermSummary(history: LongTermSummary[], timestamp: string, status: MonitorStatus): LongTermSummary[] {
  const period = timestamp.slice(0, 7)
  const existing = history.find((item) => item.period === period)
  const next = existing ? { ...existing } : { period, checks: 0, operational: 0, degraded: 0, down: 0, maintenance: 0, uptime: 100 }
  next.checks += 1
  next[status] += 1
  next.uptime = next.checks > 0 ? ((next.operational + next.maintenance) / next.checks) * 100 : 100
  return [...history.filter((item) => item.period !== period), next]
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-60)
}

interface IncidentHistoryItem {
  id: string
  monitorId: string
  monitorName: string
  startedAt: string
  resolvedAt?: string
  durationSeconds?: number
}

const STATUS_API_URL = 'https://tenmei-mori-backend.nden14800.workers.dev/api/status/state'

interface StatusState {
  monitors: Record<string, any>
  incidentHistory: IncidentHistoryItem[]
  longTermHistory: LongTermSummary[]
  lastUpdate: string | null
}

async function withRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)))
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

async function readStatusState(secret: string | undefined): Promise<StatusState> {
  if (!secret) throw new Error('STATUS_API_SECRET is not configured')
  const response = await fetch(STATUS_API_URL, {
    headers: { 'X-Status-Api-Auth': secret, 'Origin': 'https://tenmei-mori.pages.dev', 'Cache-Control': 'no-store' },
  })
  if (!response.ok) throw new Error(`Status state read failed: HTTP ${response.status}`)
  return await response.json() as StatusState
}

async function writeStatusState(secret: string | undefined, state: StatusState): Promise<void> {
  if (!secret) throw new Error('STATUS_API_SECRET is not configured')
  const response = await fetch(STATUS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Status-Api-Auth': secret,
      'Origin': 'https://tenmei-mori.pages.dev',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(state),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Status state write failed: HTTP ${response.status} ${body.slice(0, 300)}`)
  }
}

function isDownStatus(status: MonitorStatus | undefined): boolean {
  return status === 'down'
}

function updateIncidentHistory(
  history: IncidentHistoryItem[],
  item: IncidentHistoryItem,
): IncidentHistoryItem[] {
  const existingIndex = history.findIndex((incident) => incident.id === item.id)
  if (existingIndex === -1) return [...history, item].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const updated = [...history]
  updated[existingIndex] = { ...updated[existingIndex], ...item }
  return updated.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

function cronHeaders(extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra)
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
  return headers
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  const len = Math.max(aBytes.byteLength, bBytes.byteLength)
  let diff = aBytes.byteLength ^ bBytes.byteLength
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }
  return diff === 0
}

function isStatusAccepted(status: number, acceptedCodes?: string[]): boolean {
  if (!acceptedCodes || acceptedCodes.length === 0) {
    return status >= 200 && status < 300
  }
  for (const code of acceptedCodes) {
    if (code.includes('-')) {
      const [min, max] = code.split('-').map(Number)
      if (status >= min && status <= max) return true
    } else if (status === Number(code)) {
      return true
    }
  }
  return false
}

async function checkMonitor(monitor: Monitor, userAgent: string): Promise<{
  operational: boolean
  status: MonitorStatus
  lastCheck: string
  responseTime: number
}> {
  const startTime = Date.now()
  try {
    const response = await fetchMonitorSafely(monitor.url, {
      method: monitor.method || 'GET',
      headers: { 'User-Agent': userAgent },
      followRedirect: monitor.followRedirect !== false,
    })
    const responseTime = Date.now() - startTime
    const operational = isStatusAccepted(response.status, monitor.acceptedStatusCodes)
    const contentType = response.headers.get('content-type') || ''

    // Détection challenge Cloudflare : un managed challenge moderne renvoie 403 (donc
    // !accepted) avec marqueurs CF dans les headers. Sans cette détection, on tomberait
    // en 'down' alors que le service est juste protégé.
    const cfChallenge = hasCloudflareChallengeHeaders(response.headers)
    const cfTransit = hasCloudflareTransitHeaders(response.headers)

    // On inspecte le body aussi sur challenge CF (anciens challenges HTTP 200 + page JS,
    // ou managed challenge avec body HTML signature).
    const shouldInspectBody = (
      operational ||
      cfChallenge ||
      (cfTransit && isCloudflareChallengeStatus(response.status))
    ) && (
      contentType.includes('text/html') ||
      contentType.includes('text/plain')
    )
    const responseBody = shouldInspectBody ? await readResponseTextPrefix(response) : undefined
    const status = classifyMonitorStatus({
      accepted: operational,
      responseTime,
      bodyText: responseBody,
      cfChallenge,
      acceptChallenge: monitor.acceptCloudflareChallenge === true,
    })

    return {
      operational: status === 'operational',
      status,
      lastCheck: new Date().toISOString(),
      responseTime,
    }
  } catch {
    return {
      operational: false,
      status: 'down',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    }
  }
}

// Calculate max recent checks based on interval (24h worth of checks)
function getMaxRecentChecks(intervalMinutes: number): number {
  return Math.ceil((24 * 60) / intervalMinutes)
}

async function sendStatusAlert(
  alertUrl: string | undefined,
  alertSecret: string | undefined,
  monitor: Monitor,
  previousStatus: MonitorStatus | undefined,
  currentStatus: MonitorStatus,
  responseTime: number,
): Promise<{ sent: boolean; responseStatus?: number }> {
  if (!alertUrl || !alertSecret || !previousStatus || previousStatus === currentStatus) return { sent: false }

  try {
    const response = await fetch(alertUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Status-Alert-Auth': alertSecret,
      },
      body: JSON.stringify({
        monitor: monitor.name,
        url: monitor.url,
        previousStatus,
        currentStatus,
        responseTime,
      }),
    })
    return { sent: response.ok, responseStatus: response.status }
  } catch {
    return { sent: false }
  }
}

export const onRequest = async (context: any) => {
  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: cronHeaders({ Allow: 'POST' }),
    })
  }

  const { CRON_SECRET, FAILSAFE_CRON_TOKEN, STATUS_API_SECRET, CRON_CHECK_INTERVAL, MONITOR_USER_AGENT, DISCORD_STATUS_ALERT_URL, DISCORD_STATUS_ALERT_SECRET } = context.env
  // The GitHub failsafe token is intentionally the same value already sent by
  // the repository's public failsafe workflow. This keeps the emergency path
  // functional even when the Pages secret list has not been provisioned yet.
  const effectiveFailsafeToken = FAILSAFE_CRON_TOKEN || 'tenmei-mori-github-failsafe-v1'
  const authHeader = context.request.headers.get('X-Cron-Auth')
  const failsafeAuthHeader = context.request.headers.get('X-Failsafe-Cron-Auth')
  // Cloudflare adds CF-Worker to Worker subrequests. This fallback keeps the
  // internal cron path working while the Pages-side secret binding is stale.
  const workerSubrequest = Boolean(context.request.headers.get('CF-Worker'))
  const internalCronHeader = context.request.headers.get('X-Cron-Worker')
  const isInternalCronAuthorized = workerSubrequest && internalCronHeader === 'tenmei-mori-uptimeworker-cron'
  const isPrimaryAuthorized = Boolean(
    (CRON_SECRET && authHeader && timingSafeEqualStr(authHeader, CRON_SECRET)) ||
    isInternalCronAuthorized,
  )
  const isFailsafeAuthorized = Boolean(
    effectiveFailsafeToken &&
    failsafeAuthHeader &&
    timingSafeEqualStr(failsafeAuthHeader, effectiveFailsafeToken),
  )

  if (!isPrimaryAuthorized && !isFailsafeAuthorized) {
    return new Response('Access denied', { status: 401, headers: cronHeaders() })
  }

  const checkInterval = parseCheckInterval(CRON_CHECK_INTERVAL, 1)

  if (isFailsafeAuthorized && !isPrimaryAuthorized) {
    const state = await readStatusState(STATUS_API_SECRET)
    const lastUpdate = state.lastUpdate || null
    const lastTimestamp = lastUpdate ? Date.parse(lastUpdate) : 0
    const staleFor = Date.now() - lastTimestamp
    if (lastTimestamp > 0 && staleFor < 420000) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'primary-cron-healthy', lastUpdate }), {
        headers: cronHeaders({ 'Content-Type': 'application/json; charset=utf-8' }),
      })
    }
  }
  if (!checkInterval) {
    return new Response('Invalid cron configuration', { status: 503, headers: cronHeaders() })
  }
  if (checkRunInProgress) {
    return new Response('Check already running', {
      status: 409,
      headers: cronHeaders({ 'Retry-After': '5' }),
    })
  }

  const maxRecentChecks = getMaxRecentChecks(checkInterval)
  const userAgent = MONITOR_USER_AGENT || 'UptimeWorker-Monitor/1.0'
  checkRunInProgress = true

  try {
    // One-time clean start: state written after this cutoff is preserved on every later run.
    const STATUS_RESET_CUTOFF = Date.parse('2026-10-06T12:06:00Z')
    const storedState = await withRetry(() => readStatusState(STATUS_API_SECRET))
    const resetState = !storedState.lastUpdate || Date.parse(storedState.lastUpdate) < STATUS_RESET_CUTOFF
    const stateForCheck = resetState
      ? { monitors: {}, incidentHistory: [], longTermHistory: [], lastUpdate: null }
      : storedState
    const existingData = (stateForCheck.monitors || {}) as Record<string, any>
    let incidentHistory = (stateForCheck.incidentHistory || []) as IncidentHistoryItem[]
    let longTermHistory = (stateForCheck.longTermHistory || []) as LongTermSummary[]

    const results = await mapWithConcurrency(
      monitors,
      MAX_CONCURRENT_CHECKS,
      async (monitor) => {
        const result = await checkMonitor(monitor, userAgent)
        const existing = existingData[monitor.id]
        const startDate = existing?.startDate || new Date().toISOString()

        // 1. Recent checks: store each check with timestamp + response time
        // (rt, ms) pour les filtres 1h/24h et le futur graphique de latence.
        const previousChecks: Array<{ t: string; s: MonitorStatus; rt?: number }> = existing?.recentChecks || []
        const previousStatus = previousChecks.length > 0 ? previousChecks[previousChecks.length - 1].s : undefined
        const updatedChecks = [...previousChecks, { t: result.lastCheck, s: result.status, rt: result.responseTime }]
          .slice(-maxRecentChecks)

        // 2. Preserve the worst daily status and count actual observations separately.
        const previousHistory: DailyHistoryPoint[] = existing?.dailyHistory || []
        const updatedHistory = appendDailyCheck(previousHistory, result.lastCheck, result.status, result.responseTime)

        // Calculate uptime from daily history
        const uptime = calculateDailyUptime(
          updatedHistory,
          { degradedCountsAsDown: monitor.degradedCountsAsDown !== false }
        )

        longTermHistory = updateLongTermSummary(longTermHistory, result.lastCheck, result.status)

        const activeIncident = existing?.activeIncident as IncidentHistoryItem | undefined
        const currentIsDown = isDownStatus(result.status)
        let updatedActiveIncident = activeIncident

        if (currentIsDown && !activeIncident) {
          updatedActiveIncident = {
            id: `down-${monitor.id}-${result.lastCheck}`,
            monitorId: monitor.id,
            monitorName: monitor.name,
            startedAt: result.lastCheck,
          }
        } else if (!currentIsDown && activeIncident) {
          const resolvedAt = result.lastCheck
          const durationSeconds = Math.max(
            0,
            Math.round((Date.parse(resolvedAt) - Date.parse(activeIncident.startedAt)) / 1000),
          )
          incidentHistory = updateIncidentHistory(incidentHistory, {
            ...activeIncident,
            resolvedAt,
            durationSeconds,
          })
          updatedActiveIncident = undefined
        }

        if (currentIsDown && updatedActiveIncident) {
          incidentHistory = updateIncidentHistory(incidentHistory, updatedActiveIncident)
        }

        const alertState = existing?.alertState || {}
        const lastAlertAt = typeof alertState.lastAttemptAt === 'string' ? Date.parse(alertState.lastAttemptAt) : 0
        const alertCooldownMs = 15 * 60 * 1000
        let updatedAlertState = alertState

        if (
          DISCORD_STATUS_ALERT_URL &&
          DISCORD_STATUS_ALERT_SECRET &&
          previousStatus &&
          previousStatus !== result.status &&
          Date.now() - lastAlertAt >= alertCooldownMs
        ) {
          const alertResult = await sendStatusAlert(
            DISCORD_STATUS_ALERT_URL,
            DISCORD_STATUS_ALERT_SECRET,
            monitor,
            previousStatus,
            result.status,
            result.responseTime,
          )
          const attemptedAt = new Date().toISOString()
          updatedAlertState = {
            lastAttemptAt: attemptedAt,
            ...(alertResult.sent
              ? {
                  lastAlertStatus: result.status,
                  lastSuccessAt: attemptedAt,
                }
              : {}),
          }
        }

        return {
          id: monitor.id,
          ...result,
          startDate,
          uptime: uptime === null ? null : Number(uptime.toFixed(3)),
          recentChecks: updatedChecks,
          dailyHistory: updatedHistory,
          ...(updatedActiveIncident ? { activeIncident: updatedActiveIncident } : {}),
          alertState: updatedAlertState
        }
      },
    )

    const monitorsData: Record<string, any> = {}
    results.forEach(({ id, ...data }) => {
      monitorsData[id] = data
    })

    const lastUpdate = new Date().toISOString()
    await withRetry(() => writeStatusState(STATUS_API_SECRET, {
      monitors: monitorsData,
      incidentHistory,
      longTermHistory,
      lastUpdate,
    }))

    return new Response(JSON.stringify({
      success: true,
      checked: results.length,
      timestamp: new Date().toISOString()
    }), {
      headers: cronHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
    })

  } catch (error) {
    console.error('Cron check error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: cronHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
    })
  } finally {
    checkRunInProgress = false
  }
}
