import { useTranslation } from 'react-i18next'
import { TrendingUp, Clock, Calendar, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useCycles } from '../hooks/useCycles'
import {
  getAverageCycleLength,
  getAveragePeriodLength,
  getCycleStats,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'

export function Analytics() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const { cycles } = useCycles()

  const fallbackCycle = profile?.cycle_length || DEFAULT_CYCLE_LENGTH
  const fallbackPeriod = profile?.period_length || DEFAULT_PERIOD_LENGTH

  const avgCycleLength = getAverageCycleLength(cycles, fallbackCycle)
  const avgPeriodLength = getAveragePeriodLength(cycles, fallbackPeriod)
  const stats = getCycleStats(cycles)

  const chartData = cycles.length > 0
    ? [...cycles].reverse().map((cycle, index) => ({
        name: `#${index + 1}`,
        cycle: cycle.cycle_length || fallbackCycle,
        period: cycle.period_length || fallbackPeriod,
      }))
    : [
        { name: '1', cycle: fallbackCycle, period: fallbackPeriod },
      ]

  const statCards = [
    {
      icon: Clock,
      label: t('analytics.averageCycle'),
      value: `${avgCycleLength} ${t('analytics.days')}`,
      color: 'text-violet-600',
      bg: 'bg-violet-500/10',
    },
    {
      icon: Calendar,
      label: t('analytics.averagePeriod'),
      value: `${avgPeriodLength} ${t('analytics.days')}`,
      color: 'text-rose-600',
      bg: 'bg-rose-500/10',
    },
    {
      icon: TrendingUp,
      label: t('analytics.cyclesCount'),
      value: String(cycles.length || 0),
      color: 'text-teal-600',
      bg: 'bg-teal-500/10',
    },
    ...(stats?.cycleVariation !== null
      ? [
          {
            icon: AlertCircle,
            label: i18n.language === 'ru' ? 'Разброс цикла' : 'Cycle variation',
            value: `±${stats.cycleVariation} ${t('analytics.days')}`,
            color: 'text-amber-600',
            bg: 'bg-amber-500/10',
          },
        ]
      : []),
  ]

  const cycleColors = ['#f43f5e', '#8b5cf6', '#14b8a6', '#f59e0b', '#6366f1']
  const periodColors = ['#fb7185', '#a78bfa', '#5eead4', '#fcd34d', '#818cf8']

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('analytics.title')}</h1>

      <div className="grid grid-cols-1 gap-4">
        {statCards.map((stat) => (
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

      {/* Chart */}
      <div className="rounded-2xl p-5 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]">
        <h2 className="text-lg font-bold mb-4">{t('analytics.cycleHistory')}</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="cycle" name={i18n.language === 'ru' ? 'Цикл' : 'Cycle'} radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={cycleColors[index % cycleColors.length]} />
                ))}
              </Bar>
              <Bar dataKey="period" name={i18n.language === 'ru' ? 'Месячные' : 'Period'} radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`pcell-${index}`} fill={periodColors[index % periodColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
