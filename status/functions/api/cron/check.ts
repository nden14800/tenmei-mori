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
): Promise<boolean> {
  if (!alertUrl || !alertSecret || !previousStatus || previousStatus === currentStatus) return false

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
    return response.ok
  } catch {
    return false
  }
}

