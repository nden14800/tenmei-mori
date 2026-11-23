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

// Keep STATUS_API_SECRET synchronized across both Pages projects (tenmei-mori and tenmei-mori-status)
// and the backend Worker; a mismatch makes this endpoint return 500 and the UI show no data.
const STATUS_API_URL = 'https://tenmei-mori-backend.nden14800.workers.dev/api/status/state'

async function readStatusState(secret: string | undefined): Promise<StatusState> {
  if (!secret) throw new Error('STATUS_API_SECRET is not configured')
  const response = await fetch(STATUS_API_URL, {
    headers: { 'X-Status-Api-Auth': secret, 'Origin': 'https://tenmei-mori.pages.dev', 'Cache-Control': 'no-store' },
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

  // This endpoint is intentionally public and read-only. It is listed in the
  // API catalog and consumed by the public MCP server, so do not require
  // browser-only Fetch Metadata headers or a browser User-Agent.
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' },
    })
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        Allow: 'GET, OPTIONS',
      },
    })
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
        lastUpdate,
        checkIntervalMinutes,
        incidentHistory,
        longTermHistory,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=30',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching monitor status:', error)
    return new Response(
      JSON.stringify({
        monitors: {},
        maintenances: [],
        lastUpdate: null,
        error: 'Failed to fetch monitor status',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
