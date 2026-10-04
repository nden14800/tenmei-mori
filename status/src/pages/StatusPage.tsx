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
import Footer from '../components/Footer'
import Header from '../components/Header'
import { Language, detectLanguage, getTranslations } from '../i18n/translations'
import { getMonitorStatus, getOverallStatus, type MonitorStatus } from '../lib/status'
import { normalizeMonitorCollection } from '../lib/monitorData'

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
}

export default function StatusPage() {
  const [kvMonitors, setKvMonitors] = useState<KVMonitors>({})
  const [activeMaintenances, setActiveMaintenances] = useState<MaintenanceData[]>([])
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState<number>(1)
  const [incidentHistory, setIncidentHistory] = useState<IncidentHistoryItem[]>([])
  const [longTermHistory, setLongTermHistory] = useState<LongTermSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<Language>('en')

  const t = getTranslations(language)

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
  const yearlyLongTermHistory = Object.values(longTermHistory.reduce<Record<string, { year: string; checks: number; down: number; uptimeWeighted: number }>>((acc, item) => {
    const year = item.period.slice(0, 4)
    const current = acc[year] || { year, checks: 0, down: 0, uptimeWeighted: 0 }
    current.checks += item.checks
    current.down += item.down
    current.uptimeWeighted += item.uptime * item.checks
    acc[year] = current
    return acc
  }, {})).map((item) => ({
    ...item,
    uptime: item.checks > 0 ? item.uptimeWeighted / item.checks : 100,
  })).sort((a, b) => b.year.localeCompare(a.year))

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

  const overallStatus = getOverallStatus(knownStatuses)
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
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-foreground">{language === 'ja' ? '年別稼働履歴' : 'Yearly uptime history'}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{language === 'ja' ? '保存された月別データを年単位でも確認できます。' : 'Stored monthly data is also summarized by year.'}</p>
            </div>
            {yearlyLongTermHistory.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {yearlyLongTermHistory.map((item) => (
                  <div key={item.year} className="grid grid-cols-2 gap-3 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-4 sm:px-6">
                    <span className="font-medium text-foreground">{item.year}</span>
                    <span className="text-sm text-muted-foreground">{language === 'ja' ? `${item.checks.toLocaleString()} 回確認` : `${item.checks.toLocaleString()} checks`}</span>
                    <span className="text-sm text-muted-foreground">{language === 'ja' ? `停止 ${item.down}` : `Down ${item.down}`}</span>
                    <span className="text-sm font-medium text-foreground">{item.uptime.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card px-4 py-5 text-sm text-muted-foreground sm:px-6">
                {language === 'ja' ? '年別履歴はまだありません。' : 'No yearly history yet.'}
              </div>
            )}
          </section>

          <section className="mb-8">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-foreground">{language === 'ja' ? '月別稼働履歴' : 'Monthly uptime history'}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{language === 'ja' ? '30日を超える期間は月別に集計し、保存された期間を一覧できます。' : 'Periods beyond 30 days are summarized by month so long-term history remains easy to read.'}</p>
            </div>
            {longTermHistory.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {[...longTermHistory].reverse().map((item) => (
                  <div key={item.period} className="grid grid-cols-2 gap-3 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-4 sm:px-6">
                    <span className="font-medium text-foreground">{item.period}</span>
                    <span className="text-sm text-muted-foreground">{language === 'ja' ? `${item.checks.toLocaleString()} 回確認` : `${item.checks.toLocaleString()} checks`}</span>
                    <span className="text-sm text-muted-foreground">{language === 'ja' ? `停止 ${item.down}` : `Down ${item.down}`}</span>
                    <span className="text-sm font-medium text-foreground">{item.uptime.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card px-4 py-5 text-sm text-muted-foreground sm:px-6">
                {language === 'ja' ? '長期履歴はまだありません。今後の監視結果が月別に保存されます。' : 'No long-term history yet. Future checks will be stored by month.'}
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
                  <article key={incident.id} className="border-b border-border px-4 py-4 last:border-0 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-medium text-foreground">{incident.monitorName}</h3>
                      <span className={incident.resolvedAt ? "text-xs text-muted-foreground" : "text-xs font-medium text-foreground"}>
                        {incident.resolvedAt ? t.incidentResolved : t.incidentOngoing}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
                      <span>{t.incidentStarted}: {formatIncidentDate(incident.startedAt)}</span>
                      <span>{incident.resolvedAt ? t.incidentResolvedAt + ': ' + formatIncidentDate(incident.resolvedAt) : t.incidentStillDown}</span>
                      <span>{t.incidentDuration}: {formatIncidentDuration(incident.durationSeconds)}</span>
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
