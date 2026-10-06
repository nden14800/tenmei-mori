/*
 * Modified from UptimeWorker (Apache-2.0).
 * Changes: added Japanese locale support and enabled locale integration for 天命乃杜.
 */
import { en } from './locales/en'
import { fr } from './locales/fr'
import { uk } from './locales/uk'
import { ja } from './locales/ja'
import { de, es, id, ko, pt, th, vi, zh } from './locales/additional'

const ALL_LOCALES = { en, fr, uk, ja, ko, zh, de, es, pt, vi, id, th }

export type Language = keyof typeof ALL_LOCALES

export interface Translations {
  statusPage: string
  allOperational: string
  notAllOperational: string
  lastChecked: string
  operational: string
  maintenance: string
  degraded: string
  majorOutage: string
  down: string
  noData: string
  incompleteHistory: string
  incompleteHistoryExplanation: string
  uptime: string
  daysAgo: string
  today: string
  uptimeTitle: string
  lastHour: string
  last24Hours: string
  last3Days: string
  last7Days: string
  last30Days: string
  overallUptime: string
  responseTime: string
  recentEvents: string
  running: string
  offline: string
  noRecentEvents: string
  affectedServices: string
  aboutTitle: string
  aboutDescription: string
  visitWebsite: string
  allRightsReserved: string
  about: string
  terms: string
  privacy: string
  contact: string
  status: string
  sponsor: string
  incidentHistoryTitle: string
  incidentHistoryDescription: string
  incidentCountLabel: string
  incidentStarted: string
  incidentResolvedAt: string
  incidentDuration: string
  incidentResolved: string
  incidentOngoing: string
  incidentStillDown: string
  changeLanguageTooltip: string
  languageCode: string
  nativeName: string
}

// The status page language selector intentionally follows tenmei-mori's current
// public language setting: Japanese and English only.
// Other locale files remain available for translating original tenmei-mori text,
// but they are not exposed as selectable status-page languages.
const CONFIG_LANGUAGES: Language[] = ['ja', 'en']

export const ENABLED_LANGUAGES: Language[] = CONFIG_LANGUAGES.filter((lang) => lang !== 'uk') as Language[]

export const NATIVE_NAMES = ENABLED_LANGUAGES.reduce((acc, lang) => {
  acc[lang as Language] = ALL_LOCALES[lang as Language].nativeName
  return acc
}, {} as Record<Language, string>)

export function getIntlLocale(lang: Language): string {
  const locales: Record<Language, string> = {
    ja: 'ja-JP',
    en: 'en-US',
    ko: 'ko-KR',
    zh: 'zh-CN',
    fr: 'fr-FR',
    de: 'de-DE',
    es: 'es-ES',
    pt: 'pt-PT',
    vi: 'vi-VN',
    id: 'id-ID',
    th: 'th-TH',
    uk: 'uk-UA',
  }
  return locales[lang] ?? 'en-US'
}

export function getTranslations(lang: Language): Translations {
  if (!ENABLED_LANGUAGES.includes(lang)) {
    return ALL_LOCALES[ENABLED_LANGUAGES[0] as Language]
  }
  return ALL_LOCALES[lang]
}

export function detectLanguage(): Language {
  const saved = localStorage.getItem('language') as Language | null
  if (saved && ENABLED_LANGUAGES.includes(saved)) return saved

  const browserLang = navigator.language.split('-')[0]
  if (ENABLED_LANGUAGES.includes(browserLang as Language)) return browserLang as Language

  return ENABLED_LANGUAGES[0] as Language
}

export function getNextLanguage(current: Language): Language {
  const currentIndex = ENABLED_LANGUAGES.indexOf(current)
  if (currentIndex === -1) return ENABLED_LANGUAGES[0] as Language
  const nextIndex = (currentIndex + 1) % ENABLED_LANGUAGES.length
  return ENABLED_LANGUAGES[nextIndex] as Language
}
