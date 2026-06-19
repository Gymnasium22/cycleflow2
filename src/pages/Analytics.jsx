import { useTranslation } from 'react-i18next'
import { TrendingUp, Clock, Calendar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCycles } from '../hooks/useCycles'
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'

export function Analytics() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const { cycles } = useCycles()

  const cycleLength = profile?.cycle_length || DEFAULT_CYCLE_LENGTH
  const periodLength = profile?.period_length || DEFAULT_PERIOD_LENGTH

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
      value: String(cycles.length || 1),
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
          {cycles.length === 0 ? (
            <div className="p-3 rounded-xl bg-[var(--tg-theme-bg-color,#ffffff)] text-sm text-[var(--tg-theme-hint-color,#6b7280)]">
              {i18n.language === 'ru' ? 'Пока нет записей. Добавьте первый цикл на главном экране.' : 'No records yet. Add your first cycle on the home screen.'}
            </div>
          ) : (
            cycles.map((cycle) => (
              <div key={cycle.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--tg-theme-bg-color,#ffffff)]">
                <div>
                  <p className="font-semibold text-[var(--tg-theme-text-color,#111827)]">{cycle.start_date}</p>
                  <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
                    {cycle.end_date ? `${t('home.nextPeriod')}: ${cycle.end_date}` : t('home.nextPeriod')}
                  </p>
                </div>
                <span className="text-sm font-semibold text-violet-600">{cycle.cycle_length || cycleLength} {t('analytics.days')}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-500 to-rose-500 text-white">
        <p className="text-sm text-white/80">{i18n.language === 'ru' ? 'Совет дня' : 'Daily tip'}</p>
        <p className="text-lg font-semibold mt-1">
          {i18n.language === 'ru'
            ? 'Следите за регулярностью цикла — это помогает лучше понимать своё тело.'
            : 'Track your cycle regularity — it helps you understand your body better.'}
        </p>
      </div>
    </div>
  )
}
