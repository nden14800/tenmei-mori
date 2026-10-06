import { getWorstStatus, isStatusAvailable, type MonitorStatus, type UptimeOptions } from './status.ts'

export type CheckCounts = Record<MonitorStatus, number>
export interface DailyHistoryPoint {
  date: string
  status: MonitorStatus
  counts?: CheckCounts
  responseTimeTotal?: number
  responseTimeCount?: number
  responseTimeAvg?: number
}

function getTokyoDate(timestamp: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp))
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return year && month && day ? `${year}-${month}-${day}` : new Date(timestamp).toISOString().slice(0, 10)
}

const STATUSES: MonitorStatus[] = ['operational', 'maintenance', 'degraded', 'down']

export function normalizeCheckCounts(value: unknown): CheckCounts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (!STATUSES.every((status) => Number.isSafeInteger(record[status]) && (record[status] as number) >= 0)) return undefined
  const counts = Object.fromEntries(STATUSES.map((status) => [status, record[status]])) as CheckCounts
  const total = STATUSES.reduce((sum, status) => sum + counts[status], 0)
  return total > 0 && Number.isSafeInteger(total) ? counts : undefined
}

// Keep legacy worst statuses for the timeline. Their original check counts
// cannot be reconstructed, so never turn one legacy day into one observation.
export function appendDailyCheck(
  history: readonly DailyHistoryPoint[],
  timestamp: string,
  status: MonitorStatus,
  responseTime?: number,
): DailyHistoryPoint[] {
  const date = getTokyoDate(timestamp)
  const previous = history.find((day) => day.date === date)
  const counts = previous ? normalizeCheckCounts(previous.counts) : {
    operational: 0, maintenance: 0, degraded: 0, down: 0,
  }
  if (counts) counts[status] += 1

  const previousResponseCount = Number.isSafeInteger(previous?.responseTimeCount) ? previous.responseTimeCount! : 0
  const previousResponseTotal = typeof previous?.responseTimeTotal === 'number' && Number.isFinite(previous.responseTimeTotal)
    ? previous.responseTimeTotal
    : 0
  const hasResponseTime = typeof responseTime === 'number' && Number.isFinite(responseTime) && responseTime >= 0
  const responseTimeCount = previousResponseCount + (hasResponseTime ? 1 : 0)
  const responseTimeTotal = previousResponseTotal + (hasResponseTime ? responseTime : 0)

  const entry: DailyHistoryPoint = {
    date,
    status: previous ? getWorstStatus(previous.status, status) : status,
    ...(counts ? { counts } : {}),
    ...(responseTimeCount > 0
      ? {
          responseTimeTotal,
          responseTimeCount,
          responseTimeAvg: Number((responseTimeTotal / responseTimeCount).toFixed(2)),
        }
      : {}),
  }
  return [...history.filter((day) => day.date !== date), entry]
    .sort((a, b) => a.date.localeCompare(b.date)).slice(-365)
}

export function calculateDailyUptime(history: readonly DailyHistoryPoint[], options: UptimeOptions = {}): number | null {
  if (history.length === 0) return null
  let total = 0
  let available = 0
  for (const day of history) {
    const counts = normalizeCheckCounts(day.counts)
    if (!counts) return null
    for (const status of STATUSES) {
      total += counts[status]
      if (isStatusAvailable(status, options)) available += counts[status]
    }
  }
  return Number.isSafeInteger(total) && total > 0 ? available / total * 100 : null
}
