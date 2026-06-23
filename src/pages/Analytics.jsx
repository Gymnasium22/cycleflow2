import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, Clock, Calendar, AlertCircle, Heart, Activity, Pill, Smile } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useCycles } from '../hooks/useCycles'
import { useSymptomHistory } from '../hooks/useSymptomHistory'
import { useMedicationLogs } from '../hooks/useMedicationLogs'
import {
  getAverageCycleLength,
  getAveragePeriodLength,
  parseDate,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'
import { getOptionLabel, getOptionEmoji } from '../data/symptomCategories'

function parseSelectedIds(notes) {
  try {
    const parsed = JSON.parse(notes || '[]')
    if (Array.isArray(parsed)) return parsed
    if (parsed && Array.isArray(parsed.selectedIds)) return parsed.selectedIds
    return []
  } catch {
    return []
  }
}

function getTopOption(categoryId, counts, lang) {
  const catCounts = counts[categoryId] || {}
  const entries = Object.entries(catCounts).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null
  const [id, count] = entries[0]
  return {
    id,
    count,
    label: getOptionLabel(categoryId, id, lang),
    emoji: getOptionEmoji(categoryId, id),
  }
}

export function Analytics() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const { cycles } = useCycles()
  const { symptoms: allSymptoms } = useSymptomHistory('2000-01-01', '2100-12-31')
  const { logs: medicationLogs } = useMedicationLogs({ startDate: '2000-01-01', endDate: '2100-12-31' })

  const lang = i18n.language === 'ru' ? 'ru' : 'en'
  const fallbackCycle = profile?.cycle_length || DEFAULT_CYCLE_LENGTH
  const fallbackPeriod = profile?.period_length || DEFAULT_PERIOD_LENGTH

  const avgCycleLength = getAverageCycleLength(cycles, fallbackCycle)
  const avgPeriodLength = getAveragePeriodLength(cycles, fallbackPeriod)

  const regularity = useMemo(() => {
    if (cycles.length < 2) return null
    const sorted = [...cycles].sort((a, b) => parseDate(a.start_date) - parseDate(b.start_date))
    const intervals = []
    for (let i = 1; i < sorted.length; i++) {
      const diff = Math.round((parseDate(sorted[i].start_date) - parseDate(sorted[i - 1].start_date)) / (1000 * 60 * 60 * 24))
      if (diff > 0) intervals.push(diff)
    }
    if (intervals.length === 0) return null
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const variance = intervals.reduce((sum, v) => sum + (v - avg) ** 2, 0) / intervals.length
    return {
      avg: Math.round(avg),
      min: Math.min(...intervals),
      max: Math.max(...intervals),
      stdDev: Math.round(Math.sqrt(variance)),
    }
  }, [cycles])

  const symptomCounts = useMemo(() => {
    const counts = {}
    for (const s of allSymptoms) {
      const ids = parseSelectedIds(s.notes)
      if (!counts[s.symptom_type]) counts[s.symptom_type] = {}
      for (const id of ids) {
        counts[s.symptom_type][id] = (counts[s.symptom_type][id] || 0) + 1
      }
    }
    return counts
  }, [allSymptoms])

  const sexDaysCount = useMemo(() => {
    const dates = new Set()
    for (const s of allSymptoms) {
      if (s.symptom_type !== 'sex') continue
      const ids = parseSelectedIds(s.notes)
      if (ids.length > 0 && !ids.includes('none')) {
        dates.add(s.date)
      }
    }
    return dates.size
  }, [allSymptoms])

  const topMood = getTopOption('mood', symptomCounts, lang)
  const topSymptom = getTopOption('symptoms', symptomCounts, lang)
  const topActivity = getTopOption('activity', symptomCounts, lang)
  const topSex = getTopOption('sex', symptomCounts, lang)

  const medicationStats = useMemo(() => {
    const counts = { taken: 0, skipped: 0, pending: 0 }
    for (const log of medicationLogs) {
      if (counts[log.status] !== undefined) counts[log.status]++
    }
    return counts
  }, [medicationLogs])

  const chartData =
    cycles.length > 0
      ? [...cycles].reverse().map((cycle, index) => ({
          name: `#${index + 1}`,
          cycle: cycle.cycle_length || fallbackCycle,
          period: cycle.period_length || fallbackPeriod,
        }))
      : [{ name: '1', cycle: fallbackCycle, period: fallbackPeriod }]

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
    ...(regularity
      ? [
          {
            icon: AlertCircle,
            label: t('analytics.regularityIndex'),
            value: `±${regularity.stdDev} ${t('analytics.days')}`,
            sub: `${t('analytics.regularityRange')}: ${regularity.min}–${regularity.max} ${t('analytics.days')}`,
            color: 'text-amber-600',
            bg: 'bg-amber-500/10',
          },
        ]
      : []),
  ]

  const insightCards = [
    ...(topMood
      ? [
          {
            icon: Smile,
            label: t('analytics.topMood'),
            value: `${topMood.emoji} ${topMood.label}`,
            sub: `${topMood.count} ${t('analytics.times')}`,
            color: 'text-amber-600',
            bg: 'bg-amber-500/10',
          },
        ]
      : []),
    ...(topSymptom
      ? [
          {
            icon: Activity,
            label: t('analytics.topSymptom'),
            value: `${topSymptom.emoji} ${topSymptom.label}`,
            sub: `${topSymptom.count} ${t('analytics.times')}`,
            color: 'text-rose-600',
            bg: 'bg-rose-500/10',
          },
        ]
      : []),
    ...(topActivity
      ? [
          {
            icon: TrendingUp,
            label: t('analytics.topActivity'),
            value: `${topActivity.emoji} ${topActivity.label}`,
            sub: `${topActivity.count} ${t('analytics.times')}`,
            color: 'text-blue-600',
            bg: 'bg-blue-500/10',
          },
        ]
      : []),
    ...(sexDaysCount > 0
      ? [
          {
            icon: Heart,
            label: t('analytics.daysWithSex'),
            value: String(sexDaysCount),
            sub: topSex ? `${t('analytics.often')}: ${topSex.emoji} ${topSex.label}` : '',
            color: 'text-pink-600',
            bg: 'bg-pink-500/10',
          },
        ]
      : []),
    ...(medicationLogs.length > 0
      ? [
          {
            icon: Pill,
            label: t('analytics.medicationIntake'),
            value: `${medicationStats.taken}/${medicationLogs.length}`,
            sub: t('analytics.takenTotal'),
            color: 'text-emerald-600',
            bg: 'bg-emerald-500/10',
          },
        ]
      : []),
  ]

  const cycleColors = ['#f43f5e', '#8b5cf6', '#14b8a6', '#f59e0b', '#6366f1']
  const periodColors = ['#fb7185', '#a78bfa', '#5eead4', '#fcd34d', '#818cf8']

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-2xl font-bold">{t('analytics.title')}</h1>

      <div className="grid grid-cols-1 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)]">{stat.label}</p>
              <p className="text-2xl font-bold text-[var(--tg-theme-text-color,#111827)]">{stat.value}</p>
              {stat.sub && <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">{stat.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {insightCards.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-bold">{t('analytics.wellnessAndHabits')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {insightCards.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] flex flex-col justify-between"
              >
                <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-2`}>
                  <stat.icon size={18} />
                </div>
                <div>
                  <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">{stat.label}</p>
                  <p className="text-lg font-bold text-[var(--tg-theme-text-color,#111827)] leading-tight">{stat.value}</p>
                  {stat.sub && <p className="text-[10px] text-[var(--tg-theme-hint-color,#6b7280)] mt-0.5">{stat.sub}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <Bar dataKey="cycle" name={lang === 'ru' ? 'Цикл' : 'Cycle'} radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={cycleColors[index % cycleColors.length]} />
                ))}
              </Bar>
              <Bar dataKey="period" name={lang === 'ru' ? 'Месячные' : 'Period'} radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`pcell-${index}`} fill={periodColors[index % periodColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-500 to-rose-500 text-white">
        <p className="text-sm text-white/80">{lang === 'ru' ? 'Совет дня' : 'Daily tip'}</p>
        <p className="text-lg font-semibold mt-1">
          {lang === 'ru'
            ? 'Следите за регулярностью цикла — это помогает лучше понимать своё тело.'
            : 'Track your cycle regularity — it helps you understand your body better.'}
        </p>
      </div>
    </div>
  )
}
