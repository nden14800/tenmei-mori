import { Translations } from '../translations'

export const en: Translations = {
    // Header
    statusPage: 'Status Page',

    // Status Header
    allOperational: 'All Systems Operational',
    notAllOperational: 'Not All Systems Operational',
    lastChecked: 'Last checked',

    // Monitor Card
    operational: 'Operational',
    maintenance: 'Maintenance',
    degraded: 'Degraded',
    majorOutage: 'Major outage',
    down: 'Down',
    noData: 'No data',
    incompleteHistory: 'Incomplete history',
    incompleteHistoryExplanation: 'Previous statuses are preserved, but successful and failed check counts are missing to calculate availability.',
    uptime: 'uptime',
    daysAgo: 'History',
    today: 'Today',

    // Uptime sections
    uptimeTitle: 'Uptime',
    lastHour: 'Last hour',
    last24Hours: 'Last 24 hours',
    last3Days: 'Last 3 days',
    last7Days: 'Last 7 days',
    last30Days: 'Last 30 days',

    // Monitor Details
    overallUptime: 'Overall Uptime',
    responseTime: 'Response time',
    recentEvents: 'Latest events',
    running: 'Running',
    offline: 'Down',
    noRecentEvents: 'No recent events',

    // Incidents
    affectedServices: 'Affected services:',

    // About section
    aboutTitle: 'About this status page',
    aboutDescription: 'This page shows the real-time operational status of all monitored services. Data is refreshed automatically every 60 seconds. For more information, visit ',
    visitWebsite: 'uptimeworker.net',

    // Footer
    allRightsReserved: 'All rights reserved',
    about: 'About',
    terms: 'Terms',
    privacy: 'Privacy',
    contact: 'Contact',
    status: 'Status',
    sponsor: 'Sponsor',
    incidentHistoryTitle: 'Incident history',
    incidentHistoryDescription: 'All stored incidents are shown here, including incidents older than 30 days.',
    incidentCountLabel: 'incidents',
    incidentStarted: 'Started',
    incidentResolvedAt: 'Resolved',
    incidentDuration: 'Duration',
    incidentResolved: 'Resolved',
    incidentOngoing: 'Ongoing',
    incidentStillDown: 'Still down',

    // Language toggle
    changeLanguageTooltip: 'Change language',
    languageCode: 'EN',
    nativeName: 'English',
}
