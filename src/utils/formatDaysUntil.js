import i18n from '../i18n'

export function formatDaysUntilI18n(days) {
  if (days === null || days === undefined) return ''
  if (days === 0) return i18n.t('common.today')
  if (days === 1) return i18n.t('common.tomorrow')
  if (days === -1) return i18n.t('common.yesterday')
  if (days < 0) return i18n.t('common.overdueDays', { count: Math.abs(days) })
  return i18n.t('common.inDays', { count: days })
}