import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Language } from '../i18n/translations'

type HealthState = 'operational' | 'maintenance' | 'degraded' | 'partial' | 'outage' | 'unknown' | 'external'

interface HealthComponent {
  state?: HealthState
  detail?: string
}

interface BrowserHealth {
  schemaVersion?: number
  checkedAt?: string | null
  overall?: { state?: HealthState; detail?: string }
  components?: Record<string, HealthComponent>
}

export default function BrowserHealthNotice({ language }: { language: Language }) {
  const [health, setHealth] = useState<BrowserHealth | null>(null)

  useEffect(() => {
    let active = true
    const base = window.location.pathname.startsWith('/status') ? '/status/health.json' : '/health.json'
    const load = async () => {
      try {
        const response = await fetch(base, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Health snapshot HTTP ${response.status}`)
        const data = await response.json() as BrowserHealth
        if (active) setHealth(data)
      } catch {
        if (active) setHealth({ overall: { state: 'unknown', detail: 'ブラウザ監視結果を読み込めません。' } })
      }
    }
    load()
    const timer = window.setInterval(load, 60_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  if (!health) return null
  const state = health.overall?.state || 'unknown'
  if (state === 'operational') return null

  const isOutage = state === 'outage' || state === 'unknown'
  const isMaintenance = state === 'maintenance'
  const title = state === 'outage'
    ? 'ブラウザ監視でサイト障害を検知'
    : state === 'partial'
      ? 'ブラウザ監視で一部障害を検知'
      : state === 'degraded'
        ? '主要機能に問題を検知'
        : isMaintenance
          ? 'メンテナンス中'
          : 'ブラウザ監視の状態を確認できません'
  const Icon = isOutage ? XCircle : isMaintenance ? Info : AlertTriangle
  const locale = document.documentElement.lang === 'ja' ? 'ja-JP' : 'en-US'
  const timestamp = health.checkedAt ? new Date(health.checkedAt).toLocaleString(locale) : null
  const components = Object.entries(health.components || {}).filter(([key, value]) => key !== 'ai' && value?.state && value.state !== 'operational')
  const names: Record<string, { ja: string; en: string }> = {
    site: { ja: '公開サイト', en: 'Public site' },
    api: { ja: 'Worker API', en: 'Worker API' },
    omikuji: { ja: 'おみくじ操作', en: 'Omikuji interaction' },
  }
  const ja = language === 'ja'

  return (
    <section
      role="alert"
      aria-live="polite"
      className={cn(
        'mb-8 rounded-lg border p-4 sm:p-5',
        isOutage
          ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100'
          : isMaintenance
            ? 'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100'
            : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{ja ? title : ({
            'outage': 'Browser monitor detected a site outage',
            'partial': 'Browser monitor detected a partial outage',
            'degraded': 'A key site function may be impaired',
            'maintenance': 'Maintenance is in progress',
            'unknown': 'Browser monitor status is unavailable',
          } as Record<string, string>)[state] || 'Browser monitor reported an issue'}</h2>
          <p className="mt-1 text-sm opacity-90">{health.overall?.detail || (ja ? '実ブラウザでの確認に失敗しました。' : 'The real-browser check did not pass.')}</p>
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
          {timestamp && <p className="mt-2 text-xs opacity-75">{ja ? '状態を最後に更新した時刻：' : 'Status last changed: '}{timestamp}</p>}
        </div>
      </div>
    </section>
  )
}
