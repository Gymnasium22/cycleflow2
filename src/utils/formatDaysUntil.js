import i18n from '../i18n'

export function formatDaysUntilI18n(days, options = {}) {
  const { allowOverdue = true } = options
  if (days === null || days === undefined) return ''
  if (days === 0) return i18n.t('common.today')
  if (days === 1) return i18n.t('common.tomorrow')
  if (days === -1) return i18n.t('common.yesterday')
  if (days < 0) {
    if (!allowOverdue) return i18n.t('common.inDays', { count: 0 })
    return i18n.t('common.overdueDays', { count: Math.abs(days) })
  }
  return i18n.t('common.inDays', { count: days })
}

/** Forecast chip: only forward-looking copy (no "overdue" for ovulation). */
export function formatForecastDaysUntil(days) {
  if (days === null || days === undefined) return ''
  if (days === 0) return i18n.t('common.today')
  if (days === 1) return i18n.t('common.tomorrow')
  if (days > 0) return i18n.t('common.inDays', { count: days })
  return i18n.t('common.daysAgo', { count: Math.abs(days) })
}