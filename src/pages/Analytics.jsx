import { useTranslation } from 'react-i18next'
import { TrendingUp, Clock, Calendar } from 'lucide-react'
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'

export function Analytics() {
  const { t } = useTranslation()

  const cycleLength = Number(localStorage.getItem('cycleLength')) || DEFAULT_CYCLE_LENGTH
  const periodLength = Number(localStorage.getItem('periodLength')) || DEFAULT_PERIOD_LENGTH

  const stats = [
    {
      icon: Clock,
      label: t('analytics.averageCycle'),
      value: `${cycleLength} ${t('analytics.days')}`,
      color: 'text-violet-600',
      bg: 'bg-violet-500/10',
    },
    {
      icon: Calendar,
      label: t('analytics.averagePeriod'),
      value: `${periodLength} ${t('analytics.days')}`,
      color: 'text-rose-600',
      bg: 'bg-rose-500/10',
    },
    {
      icon: TrendingUp,
      label: t('analytics.cyclesCount'),
      value: '1',
      color: 'text-teal-600',
      bg: 'bg-teal-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('analytics.title')}</h1>

      <div className="grid grid-cols-1 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl p-5 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)]">{stat.label}</p>
              <p className="text-2xl font-bold text-[var(--tg-theme-text-color,#111827)]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]">
        <h2 className="text-lg font-bold mb-4">{t('analytics.cycleHistory')}</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--tg-theme-bg-color,#ffffff)]">
            <div>
              <p className="font-semibold text-[var(--tg-theme-text-color,#111827)]">{localStorage.getItem('lastPeriodStart') || '—'}</p>
              <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">{t('home.nextPeriod')}: через {cycleLength} дн.</p>
            </div>
            <span className="text-sm font-semibold text-violet-600">{cycleLength} {t('analytics.days')}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-500 to-rose-500 text-white">
        <p className="text-sm text-white/80">Совет дня</p>
        <p className="text-lg font-semibold mt-1">Следите за регулярностью цикла — это помогает лучше понимать своё тело.</p>
      </div>
    </div>
  )
}
