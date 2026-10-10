import { useEffect, useState } from 'react'
import { AlertTriangle, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Language } from '../i18n/translations'
import type { MonitorStatus } from '../lib/status'

type HealthState = 'operational' | 'maintenance' | 'degraded' | 'partial' | 'outage' | 'unknown' | 'external'
interface HealthComponent { state?: HealthState; detail?: string }
interface BrowserHealth {
  schemaVersion?: number
  checkedAt?: string | null
  stateChangedAt?: string | null
  overall?: { state?: HealthState; detail?: string }
  components?: Record<string, HealthComponent>
}

const MAX_HEALTH_AGE_MS = 15 * 60 * 1000
const CLOUDFLARE_BROWSER_HEALTH_URL = 'https://tenmei-mori-browser-monitor.nden14800.workers.dev/api/health'

function toMonitorStatus(state?: HealthState): MonitorStatus | null {
  switch (state) {
    case 'operational': return 'operational'
    case 'maintenance': return 'maintenance'
    case 'degraded':
    case 'partial': return 'degraded'
    case 'outage': return 'down'
    default: return null
  }
}

export default function BrowserHealthNotice({
  language, onStatusChange,
}: {
  language: Language
  onStatusChange: (status: MonitorStatus | null, fresh: boolean) => void
}) {
  const [health, setHealth] = useState<BrowserHealth | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch(CLOUDFLARE_BROWSER_HEALTH_URL, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Cloudflare browser health HTTP ${response.status}`)
        const data = await response.json() as BrowserHealth
        const checkedAt = data.checkedAt ? Date.parse(data.checkedAt) : Number.NaN
        const age = Date.now() - checkedAt
        const fresh = Number.isFinite(checkedAt) && age >= -60_000 && age <= MAX_HEALTH_AGE_MS
        const status = toMonitorStatus(data.overall?.state)
        if (active) {
          setHealth(data)
          setLoadFailed(false)
          onStatusChange(fresh ? status : null, fresh)
        }
      } catch {
        if (active) { setLoadFailed(true); onStatusChange(null, false) }
      }
    }
    onStatusChange(null, false)
    load()
    const timer = window.setInterval(load, 60_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [onStatusChange])

  const ja = language === 'ja'
  const locale = ja ? 'ja-JP' : 'en-US'
  const checkedAt = health?.checkedAt ? Date.parse(health.checkedAt) : Number.NaN
  const age = Date.now() - checkedAt
  const fresh = !loadFailed && Number.isFinite(checkedAt) && age >= -60_000 && age <= MAX_HEALTH_AGE_MS
  if (!health && !loadFailed) return null

  const state = health?.overall?.state || 'unknown'
  const timestamp = Number.isFinite(checkedAt) ? new Date(checkedAt).toLocaleString(locale) : null
  const components = Object.entries(health?.components || {}).filter(
    ([key, value]) => key !== 'ai' && value?.state && value.state !== 'operational' && value.state !== 'external',
  )
  const names: Record<string, { ja: string; en: string }> = {
    site: { ja: '公開サイト', en: 'Public site' },
    api: { ja: 'Worker API', en: 'Worker API' },
    omikuji: { ja: 'おみくじ操作', en: 'Omikuji interaction' },
  }

  if (!fresh) {
    return (
      <section role="status" aria-live="polite" className="mb-8 rounded-lg border border-gray-300 bg-gray-50 p-4 text-gray-900 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100 sm:p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{ja ? 'ブラウザ監視データが古くなっています' : 'Browser monitor data is stale'}</h2>
            <p className="mt-1 text-sm opacity-90">
              {loadFailed
                ? (ja ? '最新の監視結果を取得できません。現在のおみくじ操作の状態は確認できていません。' : 'The latest browser-monitor result could not be loaded; the current interaction status is unconfirmed.')
                : (ja ? '15分以内の確認結果がないため、以前の結果を現在の障害としては扱いません。' : 'No check result from the last 15 minutes is available, so the last-known result is not treated as a current incident.')}
            </p>
            {health?.overall?.detail && <p className="mt-2 text-sm opacity-90">{ja ? '最後の記録：' : 'Last recorded result: '}{health.overall.detail}</p>}
            {timestamp && <p className="mt-2 text-xs opacity-75">{ja ? '最終監視チェック：' : 'Last browser check: '}{timestamp}</p>}
          </div>
        </div>
      </section>
    )
  }

  if (state === 'operational') return null
  const isOutage = state === 'outage'
  const isMaintenance = state === 'maintenance'
  const isUnknown = state === 'unknown' || state === 'external'
  const title = isOutage
    ? (ja ? 'ブラウザ監視でサイト障害を検知' : 'Browser monitor detected a site outage')
    : state === 'partial'
      ? (ja ? 'ブラウザ監視で一部障害を検知' : 'Browser monitor detected a partial outage')
      : state === 'degraded'
        ? (ja ? '主要機能に問題を検知' : 'A key site function may be impaired')
        : isMaintenance
          ? (ja ? 'メンテナンス中' : 'Maintenance is in progress')
          : (ja ? 'ブラウザ監視の状態を確認できません' : 'Browser monitor status is unavailable')
  const Icon = isOutage ? XCircle : isMaintenance ? Info : AlertTriangle
  const colorClass = isUnknown
    ? 'border-gray-300 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100'
    : isOutage
      ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100'
      : isMaintenance
        ? 'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100'
        : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'

  return (
    <section role={isUnknown ? 'status' : 'alert'} aria-live="polite" className={cn('mb-8 rounded-lg border p-4 sm:p-5', colorClass)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm opacity-90">{health?.overall?.detail || (ja ? '実ブラウザでの確認に失敗しました。' : 'The real-browser check did not pass.')}</p>
          {components.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {components.map(([key, value]) => (
                <li key={key}>
                  <span className="font-medium">{names[key]?.[ja ? 'ja' : 'en'] || key}</span>
                  {value.detail ? `: ${value.detail}` : ''}
                </li>
              ))}
            </ul>
          )}
          {timestamp && <p className="mt-2 text-xs opacity-75">{ja ? '監視チェック日時：' : 'Last monitor check: '}{timestamp}</p>}
          {(health?.stateChangedAt || health?.checkedAt) && (
            <p className="mt-1 text-xs opacity-75">
              {ja ? '状態が最後に変化した時刻：' : 'Status last changed: '}
              {new Date(health.stateChangedAt || health.checkedAt!).toLocaleString(locale)}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
