import { useState, useEffect, useCallback, useRef } from 'react'
import { monitors } from '../data/monitors'
import { getActiveIncidents } from '../data/incidents'
import { getRefreshInterval } from '../config/env'
import MonitorStatusHeader from '../components/MonitorStatusHeader'
import MonitorStatusHeaderSkeleton from '../components/MonitorStatusHeaderSkeleton'
import MonitorCard from '../components/MonitorCard'
import MonitorCardSkeleton from '../components/MonitorCardSkeleton'
import Incident from '../components/Incident'
import MaintenanceNotice, { MaintenanceData } from '../components/MaintenanceNotice'
import BrowserHealthNotice from '../components/BrowserHealthNotice'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { Language, detectLanguage, getTranslations } from '../i18n/translations'
import { getMonitorStatus, getOverallStatus, type MonitorStatus } from '../lib/status'
import { normalizeMonitorCollection } from '../lib/monitorData'
import { cn } from '@/lib/utils'

interface RecentCheck {
  t: string // timestamp ISO
  s: MonitorStatus // status
  rt?: number // response time (ms), optionnel
}

interface DailyHistoryPoint {
  date: string // YYYY-MM-DD
  status: MonitorStatus
}

interface MonitorData {
  operational: boolean
  status?: MonitorStatus
  degraded?: boolean
  lastCheck: string
  responseTime?: number
  uptime?: number
  startDate?: string
  recentChecks?: RecentCheck[] // Last 24h of checks (for 1h/24h filters)
  dailyHistory?: DailyHistoryPoint[] // Daily history from KV (max 30 days)
}

interface KVMonitors {
  [key: string]: MonitorData
}

interface LongTermSummary {
  period: string
  monitorId?: string
  monitorName?: string
  checks: number
  operational: number
  degraded: number
  down: number
  maintenance: number
  uptime: number
}

interface IncidentHistoryItem {
  id: string
  monitorId: string
  monitorName: string
  startedAt: string
  resolvedAt?: string
  durationSeconds?: number
  httpStatus?: number
  responseTime?: number
  failureReason?: string
  lastCheckedAt?: string
  recoveredHttpStatus?: number
  recoveredResponseTime?: number
}

export default function StatusPage() {
  const [kvMonitors, setKvMonitors] = useState<KVMonitors>({})
  const [activeMaintenances, setActiveMaintenances] = useState<MaintenanceData[]>([])
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState<number>(1)
  const [incidentHistory, setIncidentHistory] = useState<IncidentHistoryItem[]>([])
  const [longTermHistory, setLongTermHistory] = useState<LongTermSummary[]>([])
  const [selectedHistoryYear, setSelectedHistoryYear] = useState<string>('all')
  const [selectedHistoryMonitor, setSelectedHistoryMonitor] = useState<string>('all')
  const [expandedIncidentDetails, setExpandedIncidentDetails] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [browserHealthStatus, setBrowserHealthStatus] = useState<MonitorStatus | null>(null)
  const [language, setLanguage] = useState<Language>('en')

  const t = getTranslations(language)
  const handleBrowserHealthStatus = useCallback((status: MonitorStatus | null) => {
    setBrowserHealthStatus(status)
  }, [])

  const lastUpdateRef = useRef('')
  useEffect(() => {
    lastUpdateRef.current = lastUpdate
  }, [lastUpdate])

  useEffect(() => {
    const detectedLang = detectLanguage()
    setLanguage(detectedLang)
  }, [])

  const fetchStatus = useCallback(async () => {
    const startTime = Date.now()

    try {
      const response = await fetch('/api/monitors/status')
      if (response.ok) {
        const data = await response.json()

        const elapsed = Date.now() - startTime
        const minDelay = 300

        if (elapsed < minDelay) {
          await new Promise(resolve => setTimeout(resolve, minDelay - elapsed))
        }

        setKvMonitors(normalizeMonitorCollection(data.monitors))
        setActiveMaintenances(data.maintenances || [])
        setLastUpdate(data.lastUpdate || new Date().toISOString())
        setCheckIntervalMinutes(data.checkIntervalMinutes || 1)
        setIncidentHistory(Array.isArray(data.incidentHistory) ? data.incidentHistory : [])
        setLongTermHistory(Array.isArray(data.longTermHistory) ? data.longTermHistory : [])
      }
    } catch (error) {
      console.error('Failed to fetch monitor status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const refreshInterval = getRefreshInterval()
    const interval = setInterval(fetchStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchStatus])

  useEffect(() => {
    const STALE_MS = 60 * 1000
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      const last = lastUpdateRef.current
      if (!last || Date.now() - new Date(last).getTime() > STALE_MS) {
        fetchStatus()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [fetchStatus])

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  const monitorsInMaintenance = new Set(activeMaintenances.flatMap((maintenance) => maintenance.affectedServices))
  const fallbackTimestamp = lastUpdate || new Date().toISOString()
  // Per-monitor summaries only. Legacy records had combined every service into one
  // count, so they are excluded rather than presented as a misleading "100 checks".
  // Collapse duplicate snapshots for the same monitor/month. These are cumulative
  // monthly summaries, so adding duplicates would inflate counts; keep the most complete
  // snapshot and derive the check total from the mutually exclusive status buckets.
  const perMonitorLongTermHistory = Object.values(longTermHistory
    .filter((item) => typeof item.monitorId === 'string' && typeof item.monitorName === 'string')
    .reduce<Record<string, LongTermSummary>>((acc, item) => {
      const key = `${item.monitorId}:${item.period}`
      const countFor = (entry: LongTermSummary) =>
        Math.max(0, Number(entry.operational) || 0) +
        Math.max(0, Number(entry.degraded) || 0) +
        Math.max(0, Number(entry.down) || 0) +
        Math.max(0, Number(entry.maintenance) || 0)
      const current = acc[key]
      if (!current || countFor(item) >= countFor(current)) {
        const checks = countFor(item)
        acc[key] = {
          ...item,
          checks,
          uptime: checks > 0
            ? ((Math.max(0, Number(item.operational) || 0) + Math.max(0, Number(item.maintenance) || 0)) / checks) * 100
            : 100,
        }
      }
      return acc
    }, {}))
  const yearlyLongTermHistory = Object.values(perMonitorLongTermHistory.reduce<Record<string, {
    year: string; monitorId: string; monitorName: string; checks: number; operational: number;
    degraded: number; down: number; maintenance: number; uptimeWeighted: number
  }>>((acc, item) => {
    const year = item.period.slice(0, 4)
    const monitorId = item.monitorId!
    const key = `${monitorId}:${year}`
    const current = acc[key] || {
      year, monitorId, monitorName: item.monitorName!, checks: 0, operational: 0,
      degraded: 0, down: 0, maintenance: 0, uptimeWeighted: 0
    }
    current.monitorName = item.monitorName || current.monitorName
    current.checks += item.checks
    current.operational += item.operational
    current.degraded += item.degraded
    current.down += item.down
    current.maintenance += item.maintenance
    current.uptimeWeighted += item.uptime * item.checks
    acc[key] = current
    return acc
  }, {})).map((item) => ({
    ...item,
    uptime: item.checks > 0 ? item.uptimeWeighted / item.checks : 100,
  })).sort((a, b) => b.year.localeCompare(a.year) || a.monitorName.localeCompare(b.monitorName))
  const availableHistoryYears = [...new Set(yearlyLongTermHistory.map((item) => item.year))].sort((a, b) => b.localeCompare(a))

  const getDisplayMonitorData = (monitorId: string): MonitorData | undefined => {
    const monitorData = kvMonitors[monitorId]

    if (!monitorsInMaintenance.has(monitorId)) {
      return monitorData
    }

    return {
      ...(monitorData || {}),
      operational: false,
      status: 'maintenance',
      lastCheck: monitorData?.lastCheck || fallbackTimestamp,
    }
  }

  const knownStatuses = monitors
    .map((monitor) => getMonitorStatus(getDisplayMonitorData(monitor.id)))
    .filter((status): status is MonitorStatus => status !== 'unknown')

  const overallStatus = getOverallStatus(browserHealthStatus ? [...knownStatuses, browserHealthStatus] : knownStatuses)
  const activeIncidents = getActiveIncidents()
  const formatIncidentDate = (value: string) => new Date(value).toLocaleString(
    language === 'ja' ? 'ja-JP' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  )
  const formatIncidentDuration = (seconds?: number) => {
    if (typeof seconds !== 'number') return t.incidentOngoing
    if (seconds < 60) return language === 'ja' ? `${seconds}秒` : `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return language === 'ja' ? `${minutes}分` : `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return language === 'ja'
      ? `${hours}時間${remainingMinutes ? ` ${remainingMinutes}分` : ''}`
      : `${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ''}`
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header language={language} onLanguageChange={handleLanguageChange} />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="mb-8">
            {loading ? (
              <MonitorStatusHeaderSkeleton />
            ) : (
              <MonitorStatusHeader
                overallStatus={overallStatus}
                lastUpdate={lastUpdate}
                language={language}
              />
            )}
          </div>

          <BrowserHealthNotice language={language} onStatusChange={handleBrowserHealthStatus} />

          {!loading && activeMaintenances.length > 0 && (
            <div className="mb-8 space-y-4">
              {activeMaintenances.map((maintenance) => (
                <MaintenanceNotice key={maintenance.id} maintenance={maintenance} language={language} />
              ))}
            </div>
          )}

          {!loading && activeIncidents.length > 0 && (
            <div className="mb-8 space-y-4">
              {activeIncidents.map((incident) => (
                <Incident key={incident.id} incident={incident} language={language} />
              ))}
            </div>
          )}

          <div className="mb-8">
            <h2 className="mb-5 text-lg font-semibold text-foreground sm:text-xl">
              {t.uptimeTitle}
            </h2>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {loading ? (
                <>
                  {monitors.map((monitor) => (
                    <MonitorCardSkeleton key={monitor.id} />
                  ))}
                </>
              ) : (
                <>
                  {monitors.map((monitor) => (
                    <MonitorCard
                      key={monitor.id}
                      monitor={monitor}
                      data={getDisplayMonitorData(monitor.id)}
                      language={language}
                      checkIntervalMinutes={checkIntervalMinutes}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          <section className="mb-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{language === 'ja' ? '年別稼働履歴' : 'Yearly uptime history'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{language === 'ja' ? 'カードを押すと、対象サービス・年で月別履歴を絞り込んで移動します。' : 'Select a card to filter monthly history by monitor and year.'}</p>
              </div>
              <span className="text-xs text-muted-foreground">{availableHistoryYears.length} {language === 'ja' ? '年分' : 'years'}</span>
            </div>
            {yearlyLongTermHistory.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {yearlyLongTermHistory.map((item) => {
                  const isSelected = selectedHistoryYear === item.year && selectedHistoryMonitor === item.monitorId
                  const yearMonths = perMonitorLongTermHistory.filter((month) => month.monitorId === item.monitorId && month.period.startsWith(item.year))
                  const totalDown = yearMonths.reduce((sum, month) => sum + month.down, 0)
                  const totalOperational = yearMonths.reduce((sum, month) => sum + month.operational, 0)
                  const totalDegraded = yearMonths.reduce((sum, month) => sum + month.degraded, 0)
                  const totalMaintenance = yearMonths.reduce((sum, month) => sum + month.maintenance, 0)
                  return (
                    <button
                      key={`${item.monitorId}-${item.year}`}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedHistoryYear('all')
                          setSelectedHistoryMonitor('all')
                        } else {
                          setSelectedHistoryYear(item.year)
                          setSelectedHistoryMonitor(item.monitorId)
                          document.getElementById('monthly-uptime-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                      }}
                      aria-pressed={isSelected}
                      className={cn(
                        "rounded-xl border bg-card p-4 text-left shadow-sm transition-colors sm:p-5",
                        isSelected ? "border-foreground/50 ring-1 ring-foreground/20" : "border-border hover:border-foreground/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-base font-semibold text-foreground">{item.year}</span>
                          <p className="mt-1 text-sm font-medium text-muted-foreground">{item.monitorName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{yearMonths.length} {language === 'ja' ? 'か月の記録' : 'months recorded'}</p>
                        </div>
                        <span className="text-lg font-semibold tabular-nums text-foreground">{item.uptime.toFixed(2)}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-label={language === 'ja' ? '年別稼働率' : 'Yearly uptime'}>
                        <div className="h-full rounded-full bg-green-500 transition-[width]" style={{ width: `${Math.max(0, Math.min(100, item.uptime))}%` }} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{language === 'ja' ? `${item.checks.toLocaleString()} 回確認` : `${item.checks.toLocaleString()} checks`}</span>
                        <span className="text-green-700 dark:text-green-400">{language === 'ja' ? `正常 ${totalOperational}` : `Up ${totalOperational}`}</span>
                        {totalDegraded > 0 && <span className="text-yellow-700 dark:text-yellow-400">{language === 'ja' ? `低下 ${totalDegraded}` : `Degraded ${totalDegraded}`}</span>}
                        {totalMaintenance > 0 && <span className="text-blue-700 dark:text-blue-400">{language === 'ja' ? `保守 ${totalMaintenance}` : `Maintenance ${totalMaintenance}`}</span>}
                        <span className="text-red-700 dark:text-red-400">{language === 'ja' ? `停止 ${totalDown}` : `Down ${totalDown}`}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs font-medium">
                        <span className="text-muted-foreground">{isSelected ? (language === 'ja' ? 'この条件で絞り込み中' : 'Filter active') : (language === 'ja' ? 'この対象・年で絞り込む' : 'Filter by this monitor and year')}</span>
                        <span className="text-foreground">{isSelected ? '✓' : '→'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground sm:px-6">
                {language === 'ja' ? '年別履歴はまだありません。監視結果が保存されると、ここに集計されます。' : 'No yearly history yet. Saved monitoring results will be summarized here.'}
              </div>
            )}
          </section>

          <section id="monthly-uptime-history" className="mb-8 scroll-mt-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{language === 'ja' ? '月別稼働履歴' : 'Monthly uptime history'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{language === 'ja' ? '月ごとの稼働率・確認回数・状態別の確認数を確認できます。' : 'Review uptime, check volume, and status breakdown for each month.'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="history-monitor-filter" className="text-xs text-muted-foreground">{language === 'ja' ? '監視対象' : 'Monitor'}</label>
                <select
                  id="history-monitor-filter"
                  value={selectedHistoryMonitor}
                  onChange={(event) => setSelectedHistoryMonitor(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="all">{language === 'ja' ? 'すべての監視対象' : 'All monitors'}</option>
                  {monitors.map((monitor) => <option key={monitor.id} value={monitor.id}>{monitor.name}</option>)}
                </select>
                <label htmlFor="history-year-filter" className="text-xs text-muted-foreground">{language === 'ja' ? '表示する年' : 'Year'}</label>
                <select
                  id="history-year-filter"
                  value={selectedHistoryYear}
                  onChange={(event) => setSelectedHistoryYear(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="all">{language === 'ja' ? 'すべて' : 'All years'}</option>
                  {availableHistoryYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </div>
            {perMonitorLongTermHistory.length > 0 ? (
              <div className="space-y-3">
                {perMonitorLongTermHistory
                  .filter((item) => (selectedHistoryYear === 'all' || item.period.startsWith(selectedHistoryYear)) && (selectedHistoryMonitor === 'all' || item.monitorId === selectedHistoryMonitor))
                  .slice()
                  .sort((a, b) => b.period.localeCompare(a.period))
                  .map((item) => {
                    const total = Math.max(0, item.checks)
                    const segments = [
                      { key: 'operational', label: language === 'ja' ? '正常' : 'Operational', value: item.operational, color: 'bg-green-500', text: 'text-green-700 dark:text-green-400' },
                      { key: 'degraded', label: language === 'ja' ? '低下' : 'Degraded', value: item.degraded, color: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-400' },
                      { key: 'down', label: language === 'ja' ? '停止' : 'Down', value: item.down, color: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
                      { key: 'maintenance', label: language === 'ja' ? '保守' : 'Maintenance', value: item.maintenance, color: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400' },
                    ]
                    return (
                      <article key={`${item.monitorId}-${item.period}`} className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{item.period}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{item.monitorName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.checks.toLocaleString()} {language === 'ja' ? '回の監視チェック' : 'monitoring checks'}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-semibold tabular-nums text-foreground">{item.uptime.toFixed(2)}%</div>
                            <div className="text-xs text-muted-foreground">{language === 'ja' ? '稼働率' : 'Uptime'}</div>
                          </div>
                        </div>
                        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ')}>
                          {segments.map((segment) => segment.value > 0 && (
                            <div key={segment.key} className={cn(segment.color, "h-full")} style={{ width: `${total > 0 ? segment.value / total * 100 : 0}%` }} title={`${segment.label}: ${segment.value}`} />
                          ))}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {segments.map((segment) => (
                            <div key={segment.key} className="rounded-lg bg-muted/50 px-3 py-2">
                              <div className={cn("text-xs", segment.text)}>{segment.label}</div>
                              <div className="mt-1 font-semibold tabular-nums text-foreground">{segment.value.toLocaleString()}</div>
                              <div className="text-[11px] text-muted-foreground">{total > 0 ? `${(segment.value / total * 100).toFixed(2)}%` : '—'}</div>
                            </div>
                          ))}
                        </div>
                      </article>
                    )
                  })}
                {perMonitorLongTermHistory.filter((item) => (selectedHistoryYear === 'all' || item.period.startsWith(selectedHistoryYear)) && (selectedHistoryMonitor === 'all' || item.monitorId === selectedHistoryMonitor)).length === 0 && (
                  <div className="rounded-xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
                    {language === 'ja' ? 'この年の月別履歴はありません。' : 'No monthly history is available for this year.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground sm:px-6">
                {language === 'ja' ? '監視対象ごとの月別履歴は、修正後のチェック結果が蓄積されると表示されます。過去の合算データは正確に分割できないため、誤解を招かないよう除外しています。' : 'Per-monitor monthly history will appear as new checks are collected. Older combined totals are excluded because they cannot be accurately split by monitor.'}
              </div>
            )}
          </section>

          <section className="mb-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t.incidentHistoryTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.incidentHistoryDescription}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {incidentHistory.length} {t.incidentCountLabel}
              </span>
            </div>
            {incidentHistory.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {incidentHistory.map((incident) => (
                  <article key={incident.id} className="relative overflow-hidden border-b border-border px-4 py-4 last:border-0 sm:px-5">
                    <div className={cn("absolute inset-y-0 left-0 w-1", incident.resolvedAt ? "bg-green-500" : "bg-red-500")} />
                    <div className="pl-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 rounded-full", incident.resolvedAt ? "bg-green-500" : "bg-red-500")} />
                          <h3 className="font-semibold text-foreground">{incident.monitorName}</h3>
                        </div>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", incident.resolvedAt ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-500/10 text-red-700 dark:text-red-400")}>
                          {incident.resolvedAt ? t.incidentResolved : t.incidentOngoing}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                        <span>{t.incidentStarted}: {formatIncidentDate(incident.startedAt)}</span>
                        <span>{incident.resolvedAt ? t.incidentResolvedAt + ': ' + formatIncidentDate(incident.resolvedAt) : t.incidentStillDown}</span>
                        <span>{t.incidentDuration}: {formatIncidentDuration(incident.durationSeconds)}</span>
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          aria-expanded={Boolean(expandedIncidentDetails[incident.id])}
                          onClick={() => setExpandedIncidentDetails((current) => ({ ...current, [incident.id]: !current[incident.id] }))}
                          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          {expandedIncidentDetails[incident.id]
                            ? (language === 'ja' ? '詳細を閉じる' : 'Hide details')
                            : (language === 'ja' ? '障害の詳細を表示' : 'Show incident details')}
                          <span aria-hidden="true">{expandedIncidentDetails[incident.id] ? '−' : '+'}</span>
                        </button>
                        {expandedIncidentDetails[incident.id] && (
                          <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
                            <h4 className="text-sm font-semibold text-foreground">{language === 'ja' ? '監視診断情報' : 'Monitoring diagnostics'}</h4>
                            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div>
                                <dt className="text-xs text-muted-foreground">{language === 'ja' ? '障害の原因・応答内容' : 'Failure reason'}</dt>
                                <dd className="mt-1 break-words text-sm text-foreground">{incident.failureReason || (language === 'ja' ? 'この障害は詳細情報の記録開始前に発生したため、原因は保存されていません。' : 'Diagnostic details were not recorded for this older incident.')}</dd>
                              </div>
                              <div>
                                <dt className="text-xs text-muted-foreground">{language === 'ja' ? '障害発生時の HTTP ステータス' : 'HTTP status at outage'}</dt>
                                <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">{typeof incident.httpStatus === 'number' ? incident.httpStatus : '—'}</dd>
                              </div>
                              <div>
                                <dt className="text-xs text-muted-foreground">{language === 'ja' ? '障害時の応答時間' : 'Response time during outage'}</dt>
                                <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">{typeof incident.responseTime === 'number' ? `${incident.responseTime} ms` : '—'}</dd>
                              </div>
                              <div>
                                <dt className="text-xs text-muted-foreground">{language === 'ja' ? '最終確認時刻' : 'Last check'}</dt>
                                <dd className="mt-1 text-sm text-foreground">{incident.lastCheckedAt ? formatIncidentDate(incident.lastCheckedAt) : '—'}</dd>
                              </div>
                              {incident.resolvedAt && (
                                <>
                                  <div>
                                    <dt className="text-xs text-muted-foreground">{language === 'ja' ? '復旧確認時の HTTP ステータス' : 'HTTP status on recovery'}</dt>
                                    <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">{typeof incident.recoveredHttpStatus === 'number' ? incident.recoveredHttpStatus : '—'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted-foreground">{language === 'ja' ? '復旧確認時の応答時間' : 'Response time on recovery'}</dt>
                                    <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">{typeof incident.recoveredResponseTime === 'number' ? `${incident.recoveredResponseTime} ms` : '—'}</dd>
                                  </div>
                                </>
                              )}
                            </dl>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card px-4 py-5 text-sm text-muted-foreground sm:px-6">
                {language === 'ja' ? '記録されている障害はまだありません。今後発生したダウンはここに保存されます。' : 'No incidents have been recorded yet. Future outages will be saved here.'}
              </div>
            )}
          </section>

          <div className="mt-8 border-t border-border pt-6 sm:mt-10">
            <h3 className="mb-2 text-base font-semibold text-foreground">
              {t.aboutTitle}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.aboutDescription}
              <a
                href="https://github.com/UptimeWorker/UptimeWorker"
                className="text-foreground hover:underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                UptimeWorker
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer language={language} />
    </div>
  )
}
