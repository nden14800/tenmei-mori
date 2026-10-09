import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Monitor } from '../data/monitors'
import { cn } from '@/lib/utils'
import { Language, getTranslations } from '../i18n/translations'
import MonitorDetails from './MonitorDetails'
import { calculateDailyUptime, type DailyHistoryPoint } from '../lib/monitorHistory'
import { ChevronDown, ExternalLink } from 'lucide-react'
import {
  calculateUptime,
  getMonitorStatus,
  type MonitorStatus,
} from '../lib/status'
import {
  buildTimelineHistory,
  filterDailyHistoryInPeriod,
  getEffectiveBucketCount,
  getTimelineMinutesAgo,
  getTimelineDateAtIndex,
  type TimelineBarStatus as BarStatus,
  type TimelinePeriod,
} from '../lib/monitorTimeline'

function getBarStatusLabel(barStatus: BarStatus, language: Language): string {
  const t = getTranslations(language)
  switch (barStatus) {
    case 'operational':
      return t.operational
    case 'degraded':
      return t.degraded
    case 'maintenance':
      return t.maintenance
    case 'incident':
      return t.down
    case 'unknown':
      return t.noData
  }
}
const MONITOR_DESCRIPTIONS: Record<string, Partial<Record<Language, string>>> = {
  'tenmei-mori': {
    en: 'Tenmei no Mori public website',
    ko: '천명노모리 공개 사이트',
    zh: '天命乃杜公开网站',
    fr: 'Site public de Tenmei no Mori',
    de: 'Öffentliche Website von Tenmei no Mori',
    es: 'Sitio web público de Tenmei no Mori',
    pt: 'Site público do Tenmei no Mori',
    vi: 'Trang web công khai của Tenmei no Mori',
    id: 'Situs publik Tenmei no Mori',
    th: 'เว็บไซต์สาธารณะของ Tenmei no Mori',
  },
  'tenmei-mori-worker-api': {
    en: 'Tenmei no Mori API',
    ko: '천명노모리 API',
    zh: '天命乃杜 API',
    fr: 'API de Tenmei no Mori',
    de: 'API von Tenmei no Mori',
    es: 'API de Tenmei no Mori',
    pt: 'API do Tenmei no Mori',
    vi: 'API của Tenmei no Mori',
    id: 'API Tenmei no Mori',
    th: 'API ของ Tenmei no Mori',
  },
}

function getMonitorDescription(monitor: Monitor, language: Language): string | undefined {
  return MONITOR_DESCRIPTIONS[monitor.id]?.[language] ?? monitor.description
}

function getSafeExternalUrl(value: string | undefined): string | undefined {
  if (!value) return undefined

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

interface StatusTimelineProps {
  history: BarStatus[]
  getDateLabel: (index: number) => string
  language: Language
}

// Timeline barres avec tooltip riche au survol (date + libellé statut), positionné
// au-dessus de la barre survolée avec clamping pour éviter le débordement horizontal.
function StatusTimeline({ history, getDateLabel, language }: StatusTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Position en coordonnées viewport (fixed) pour échapper au clipping des parents
  // (overflow:hidden sur les cards). Tooltip rendu via portal dans document.body.
  const [hovered, setHovered] = useState<{ index: number; viewportX: number; viewportY: number } | null>(null)

  const handleEnter = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    const barRect = e.currentTarget.getBoundingClientRect()
    setHovered({
      index,
      viewportX: barRect.left + barRect.width / 2,
      viewportY: barRect.top,
    })
  }

  // Clamping horizontal en coordonnées viewport pour éviter que le tooltip déborde de l'écran.
  const HALF_TOOLTIP = 90
  const EDGE_PADDING = 8
  const clampedX = hovered
    ? Math.max(
        HALF_TOOLTIP + EDGE_PADDING,
        Math.min(hovered.viewportX, window.innerWidth - HALF_TOOLTIP - EDGE_PADDING)
      )
    : 0
  // Position de la flèche en % dans le tooltip : pointe toujours vers le centre de la
  // barre survolée, même si le tooltip a été décalé par le clamping. Bornée à [10%, 90%]
  // pour rester dans la zone visible du tooltip (pas sur les coins arrondis).
  const arrowOffsetPct = hovered
    ? Math.max(
        10,
        Math.min(90, ((hovered.viewportX - clampedX) / (HALF_TOOLTIP * 2) + 0.5) * 100)
      )
    : 50

  return (
    <div ref={containerRef} className="status-timeline mb-2">
      {history.map((barStatus, index) => (
        <div
          key={index}
          className={cn(
            "status-timeline-day",
            barStatus === 'operational' && "status-timeline-day-operational",
            barStatus === 'maintenance' && "status-timeline-day-maintenance",
            barStatus === 'degraded' && "status-timeline-day-degraded",
            barStatus === 'incident' && "status-timeline-day-incident",
            barStatus === 'unknown' && "status-timeline-day-unknown"
          )}
          onMouseEnter={(e) => handleEnter(e, index)}
          onMouseLeave={() => setHovered(null)}
        />
      ))}
      {hovered && typeof document !== 'undefined' && createPortal(
        <div
          className="status-timeline-tooltip"
          style={{
            left: `${clampedX}px`,
            top: `${hovered.viewportY}px`,
            ['--arrow-left' as string]: `${arrowOffsetPct}%`,
          }}
        >
          {history[hovered.index] === 'unknown' ? (
            // Pilule sans donnée : pas de date relative (trompeuse), juste le libellé.
            <span>{getBarStatusLabel('unknown', language)}</span>
          ) : (
            <>
              <span className="font-medium">{getDateLabel(hovered.index)}</span>
              <span className="opacity-60"> · </span>
              <span>{getBarStatusLabel(history[hovered.index], language)}</span>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

interface RecentCheck {
  t: string // timestamp ISO
  s: MonitorStatus // status
  rt?: number // response time (ms), optionnel (data historique sans rt reste valide)
}

interface MonitorData {
  operational: boolean
  status?: MonitorStatus
  degraded?: boolean
  lastCheck: string
  responseTime?: number
  uptime?: number
  startDate?: string
  recentChecks?: RecentCheck[] // Last 24h of checks (granular, every minute by default)
  dailyHistory?: DailyHistoryPoint[] // Daily history (1 entry per day)
}

interface MonitorCardProps {
  monitor: Monitor
  data?: MonitorData
  language: Language
  checkIntervalMinutes?: number
}

export default function MonitorCard({ monitor, data, language, checkIntervalMinutes = 1 }: MonitorCardProps) {
  const t = getTranslations(language)
  const [expanded, setExpanded] = useState(false)
  const [period, setPeriod] = useState<TimelinePeriod>('1h')
  const now = Date.now()
  const hasData = data !== undefined

  // Determine status with tri-state support
  const status = getMonitorStatus(data)
  const isOperational = status === 'operational'
  const isMaintenance = status === 'maintenance'
  const isDegraded = status === 'degraded'
  const isDown = status === 'down'
  const isUnknown = status === 'unknown'
  const uptimeOptions = { degradedCountsAsDown: monitor.degradedCountsAsDown !== false }
  const statusPageLink = getSafeExternalUrl(monitor.statusPageLink)

  const getStatusText = () => {
    if (!hasData || isUnknown) return t.noData
    if (isOperational) return t.operational
    if (isMaintenance) return t.maintenance
    if (isDegraded) return t.degraded
    return t.down
  }

  // Calculate uptime for the selected period.
  // Retourne null quand la fenêtre ne contient aucune mesure : la frise affiche
  // alors des barres 'unknown' (grises) et un pourcentage serait trompeur.
  const calculateUptimeFromChecks = (checks: RecentCheck[], hoursBack: number): number | null => {
    if (!hasData) return null

    const cutoff = now - hoursBack * 60 * 60 * 1000
    const relevantChecks = checks.filter((check) => {
      const time = new Date(check.t).getTime()
      return time >= cutoff && time <= now
    })
    if (relevantChecks.length === 0) return null

    return calculateUptime(relevantChecks.map((check) => check.s), status, uptimeOptions)
  }

  const calculateUptimeFromHistory = (history: DailyHistoryPoint[], period: '3d' | '7d' | '30d'): number | null => {
    if (!hasData) return null

    const relevantHistory = filterDailyHistoryInPeriod(history, period, now)
    if (relevantHistory.length === 0) return null

    return calculateDailyUptime(relevantHistory, uptimeOptions)
  }

  const uptimeForPeriod = (() => {
    if (!hasData) return null

    const recentChecks = data.recentChecks || []
    const dailyHistory = data.dailyHistory || []

    switch (period) {
      case '1h':
        return calculateUptimeFromChecks(recentChecks, 1)
      case '24h':
        return calculateUptimeFromChecks(recentChecks, 24)
      case '3d':
        return calculateUptimeFromHistory(dailyHistory, '3d')
      case '7d':
        return calculateUptimeFromHistory(dailyHistory, '7d')
      case '30d':
        return calculateUptimeFromHistory(dailyHistory, '30d')
      default:
        return typeof data.uptime === 'number' ? data.uptime : null
    }
  })()

  const historyStatuses = hasData
    ? buildTimelineHistory({
        period,
        currentStatus: status === 'unknown' ? 'down' : status,
        startDate: data.startDate,
        recentChecks: data.recentChecks,
        dailyHistory: data.dailyHistory,
        intervalMinutes: checkIntervalMinutes,
        now,
      })
    : Array<BarStatus>(getEffectiveBucketCount(period, checkIntervalMinutes)).fill('unknown')

  const incompleteHistory = hasData && uptimeForPeriod === null &&
    (period === '3d' || period === '7d' || period === '30d') &&
    filterDailyHistoryInPeriod(data.dailyHistory || [], period, now).length > 0

  // Chaque tooltip décrit la position temporelle du bucket dans le filtre sélectionné.
  const getBarTooltip = (index: number) => {
    const locale = language === 'fr' ? 'fr-FR' : language === 'uk' ? 'uk-UA' : language === 'ja' ? 'ja-JP' : 'en-US'

    if (period === '1h') {
      const minutesAgo = getTimelineMinutesAgo(index, period, checkIntervalMinutes)
      return `${minutesAgo} min ago`
    } else if (period === '24h') {
      const minutesAgo = getTimelineMinutesAgo(index, period, checkIntervalMinutes)
      const hoursAgo = Math.floor(minutesAgo / 60)
      return hoursAgo > 0 ? `${hoursAgo}h ago` : `${minutesAgo}m ago`
    } else if (period === '3d') {
      const day = getTimelineDateAtIndex(period, index, now)
      const [year, month, date] = day.split('-').map(Number)
      return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString(locale, {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
      })
    } else {
      const daysToShow = period === '7d' ? 7 : 30
      const msPerBar = (daysToShow * 24 * 60 * 60 * 1000) / BAR_COUNT
      const barTime = now - (BAR_COUNT - index) * msPerBar
      return new Date(barTime).toLocaleDateString(locale, {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
      })
    }
  }

  return (
    <div className="border-b border-border last:border-0" data-monitor-id={monitor.id}>
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-1.5">
            <button
              onClick={() => setExpanded(!expanded)}
              className="min-w-0 text-left transition-opacity hover:opacity-70"
              aria-expanded={expanded}
            >
              <div className="flex items-center gap-1">
                <h3 className="font-medium text-foreground text-sm" title={monitor.tooltip || undefined}>
                  {monitor.name}
                </h3>
                <ChevronDown
                  className={cn(
                    "w-3 h-3 text-muted-foreground transition-transform flex-shrink-0",
                    expanded && "rotate-180"
                  )}
                />
              </div>
              {getMonitorDescription(monitor, language) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getMonitorDescription(monitor, language)}
                </p>
              )}
            </button>
            {statusPageLink && (
              <a
                href={statusPageLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                title={statusPageLink}
                aria-label={`${monitor.name} (lien externe)`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row-reverse sm:items-center sm:gap-5">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "w-2 h-2 rounded-full",
                !hasData && "bg-gray-400",
                isOperational && "bg-green-500",
                isMaintenance && "bg-blue-500",
                isDegraded && "bg-yellow-500",
                isDown && "bg-red-500"
              )} />
              <span className={cn(
                "text-sm font-medium",
                !hasData && "text-muted-foreground",
                isOperational && "text-green-600 dark:text-green-500",
                isMaintenance && "text-blue-600 dark:text-blue-500",
                isDegraded && "text-yellow-600 dark:text-yellow-500",
                isDown && "text-red-600 dark:text-red-500"
              )}>
                {getStatusText()}
              </span>
            </div>
            {hasData && uptimeForPeriod !== null && (
              <span className={cn(
                "text-xs font-medium sm:text-sm",
                isOperational && "text-green-600 dark:text-green-500",
                isMaintenance && "text-blue-600 dark:text-blue-500",
                isDegraded && "text-yellow-600 dark:text-yellow-500",
                isDown && "text-red-600 dark:text-red-500"
              )}>
                {uptimeForPeriod.toFixed(2)}%
              </span>
            )}
            {hasData && uptimeForPeriod === null && (
              <span className="text-xs font-medium text-muted-foreground sm:text-sm" title={incompleteHistory ? t.incompleteHistoryExplanation : undefined}>
                {incompleteHistory ? t.incompleteHistory : t.noData}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 w-full">
          <StatusTimeline
            history={historyStatuses}
            getDateLabel={getBarTooltip}
            language={language}
          />

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">
              {language === 'ja'
                ? `${period === '1h' ? '直近1時間' : period === '24h' ? '直近24時間' : period === '3d' ? '直近3日間' : period === '7d' ? '直近7日間' : '直近30日間'}の稼働履歴`
                : `${period === '1h' ? 'Last hour' : period === '24h' ? 'Last 24 hours' : period === '3d' ? 'Last 3 days' : period === '7d' ? 'Last 7 days' : 'Last 30 days'} uptime history`}
            </span>
            <div className="flex gap-1">
            {(['1h', '24h', '3d', '7d', '30d'] as TimelinePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                data-period={p}
                aria-pressed={period === p}
                className={cn(
                  "h-6 min-w-8 rounded-md px-2 text-xs transition-colors",
                  period === p
                    ? "bg-foreground text-background font-medium"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Expandable details section */}
      {expanded && hasData && (
        <MonitorDetails
          responseTime={data.responseTime}
          lastCheck={data.lastCheck}
          status={status === 'unknown' ? 'down' : status}
          language={language}
          period={period}
          recentChecks={data.recentChecks}
          dailyHistory={data.dailyHistory}
        />
      )}
    </div>
  )
}
