import maintenancesConfig from '../../../maintenances.json'
import { isMaintenanceActive, type MaintenanceWindow } from '../../../src/lib/maintenance'
import { normalizeMonitorCollection } from '../../../src/lib/monitorData'
import { parseCheckInterval } from '../../../src/lib/monitorRequest'
import monitors from '../../../monitors.json'

interface StatusState {
  monitors: Record<string, any>
  incidentHistory: any[]
  longTermHistory: any[]
  lastUpdate: string | null
}

const STATUS_API_URL = 'https://tenmei-mori-backend.nden14800.workers.dev/api/status/state'

async function readStatusState(secret: string | undefined): Promise<StatusState> {
  if (!secret) throw new Error('STATUS_API_SECRET is not configured')
  const response = await fetch(STATUS_API_URL, {
    headers: { 'X-Status-Api-Auth': secret, 'Cache-Control': 'no-store' },
  })
  if (!response.ok) throw new Error(`Status state read failed: HTTP ${response.status}`)
  return await response.json() as StatusState
}

interface MaintenanceRecord extends MaintenanceWindow {
  id: string
  title: string | { en: string; fr?: string; uk?: string }
  message: string | { en: string; fr?: string; uk?: string }
  affectedServices: string[]
}

const maintenances: MaintenanceRecord[] = maintenancesConfig as MaintenanceRecord[]

// @ts-ignore - Cloudflare types available in production
export const onRequest: PagesFunction<Env> = async (context) => {
  const request = context.request
  const url = new URL(request.url)
  const userAgent = request.headers.get('User-Agent') || ''
  const origin = request.headers.get('Origin')
  const referer = request.headers.get('Referer')
  const secFetchSite = request.headers.get('Sec-Fetch-Site')
  const secFetchMode = request.headers.get('Sec-Fetch-Mode')
  const secFetchDest = request.headers.get('Sec-Fetch-Dest')
  const accept = request.headers.get('Accept') || ''

  const isSuspiciousUA = /curl|wget|python|httpie|postman|insomnia|axios|node-fetch|got\/|scrapy|selenium|phantomjs|headless/i.test(userAgent)
  if (isSuspiciousUA) {
    return new Response(null, { status: 404 })
  }

  const hasBrowserHeaders = secFetchSite !== null && secFetchMode !== null
  if (!hasBrowserHeaders) {
    return new Response(null, { status: 404 })
  }

  const isNavigating = secFetchMode === 'navigate'
  const isDirectNavigation = secFetchDest === 'document' ||
    (isNavigating && accept.includes('text/html')) ||
    (isNavigating && (secFetchDest === 'empty' || !secFetchDest))

  if (isDirectNavigation) {
    return new Response(null, { status: 404 })
  }

  if (secFetchSite !== 'same-origin') {
    return new Response(null, { status: 404 })
  }

  const allowedOrigin = url.origin
  if (origin && origin !== allowedOrigin) {
    return new Response(null, { status: 404 })
  }
  if (referer && !referer.startsWith(allowedOrigin)) {
    return new Response(null, { status: 404 })
  }

  if (request.method !== 'GET') {
    return new Response(null, { status: 404 })
  }

  try {
    const { STATUS_API_SECRET, CRON_CHECK_INTERVAL } = context.env
    const state = await readStatusState(STATUS_API_SECRET)
    const incidentHistory = Array.isArray(state.incidentHistory) ? state.incidentHistory : []
    const longTermHistory = Array.isArray(state.longTermHistory) ? state.longTermHistory : []
    const checkIntervalMinutes = parseCheckInterval(CRON_CHECK_INTERVAL, 1) ?? 1
    const monitorsData = state.monitors && typeof state.monitors === 'object' && !Array.isArray(state.monitors)
      ? state.monitors
      : {}
    const lastUpdate = state.lastUpdate || null

    const activeMaintenances = maintenances.filter((maintenance) => isMaintenanceActive(maintenance))

    return new Response(
      JSON.stringify({
        monitors: normalizeMonitorCollection(monitorsData),
        maintenances: activeMaintenances,
        lastUpdate: lastUpdate || new Date().toISOString(),
        checkIntervalMinutes,
        incidentHistory,
        longTermHistory,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=5',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching monitor status:', error)
    return new Response(
      JSON.stringify({
        monitors: {},
        maintenances: [],
        lastUpdate: new Date().toISOString(),
        error: 'Failed to fetch monitor status',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
