import { useTranslation } from 'react-i18next'
import { TrendingUp, Clock, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
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

  const chartData = cycles.length > 0
    ? [...cycles].reverse().map((cycle, index) => ({
        name: `${t('analytics.cycleHistory')} ${index + 1}`,
        days: cycle.cycle_length || cycleLength,
      }))
    : [
        { name: '1', days: cycleLength },
      ]

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

  const colors = ['#f43f5e', '#8b5cf6', '#14b8a6', '#f59e0b', '#6366f1']

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
              <Bar dataKey="days" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
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
