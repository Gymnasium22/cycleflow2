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
  getCycleChartData,
  parseDate,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'
import { getOptionLabel, getOptionEmoji } from '../data/symptomCategories'
import { getSymptomPhaseCorrelations } from '../utils/symptomPhaseCorrelation'

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

const PHASE_BAR_COLORS = {
  menstruation: 'var(--phase-menstruation-deep)',
  follicular: 'var(--phase-follicular-deep)',
  ovulation: 'var(--phase-ovulation-deep)',
  luteal: 'var(--phase-luteal-deep)',
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
      if (ids.length > 0 && !ids.includes('none')) dates.add(s.date)
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
      ? getCycleChartData(cycles, fallbackCycle, fallbackPeriod)
      : [{ name: '1', cycle: fallbackCycle, period: fallbackPeriod }]

  const phaseCorrelations = useMemo(
    () => getSymptomPhaseCorrelations(allSymptoms, cycles, avgCycleLength, avgPeriodLength, lang),
    [allSymptoms, cycles, avgCycleLength, avgPeriodLength, lang]
  )

  const hasPhaseCorrelations = phaseCorrelations.some((p) => p.topItems.length > 0)

  const statCards = [
    { icon: Clock, label: t('analytics.averageCycle'), value: avgCycleLength, unit: t('analytics.days'), accent: 'var(--phase-ovulation-deep)' },
    { icon: Calendar, label: t('analytics.averagePeriod'), value: avgPeriodLength, unit: t('analytics.days'), accent: 'var(--phase-menstruation-deep)' },
    { icon: TrendingUp, label: t('analytics.cyclesCount'), value: cycles.length || 0, unit: '', accent: 'var(--phase-luteal-deep)' },
    ...(regularity
      ? [{
          icon: AlertCircle,
          label: t('analytics.regularityIndex'),
          value: `±${regularity.stdDev}`,
          unit: t('analytics.days'),
          sub: `${regularity.min}–${regularity.max}`,
          accent: 'var(--phase-follicular-deep)',
        }]
      : []),
  ]

  const insightCards = [
    ...(topMood ? [{ icon: Smile, label: t('analytics.topMood'), value: `${topMood.emoji} ${topMood.label}`, sub: `${topMood.count}×`, accent: 'var(--phase-follicular-deep)' }] : []),
    ...(topSymptom ? [{ icon: Activity, label: t('analytics.topSymptom'), value: `${topSymptom.emoji} ${topSymptom.label}`, sub: `${topSymptom.count}×`, accent: 'var(--phase-menstruation-deep)' }] : []),
    ...(topActivity ? [{ icon: TrendingUp, label: t('analytics.topActivity'), value: `${topActivity.emoji} ${topActivity.label}`, sub: `${topActivity.count}×`, accent: 'var(--phase-ovulation-deep)' }] : []),
    ...(sexDaysCount > 0 ? [{ icon: Heart, label: t('analytics.daysWithSex'), value: String(sexDaysCount), sub: topSex ? topSex.emoji : '', accent: 'var(--phase-menstruation)' }] : []),
    ...(medicationLogs.length > 0 ? [{ icon: Pill, label: t('analytics.medicationIntake'), value: `${medicationStats.taken}/${medicationLogs.length}`, sub: t('analytics.takenTotal'), accent: 'var(--phase-luteal-deep)' }] : []),
  ]

  const cycleColors = ['#C45C6A', '#8B6FE0', '#4A9A88', '#D4A84A', '#7C5FD4']
  const periodColors = ['#E8A0A8', '#C4B5FD', '#9DD4C4', '#F5D9A8', '#A78BFA']

  const maxCorrelation = Math.max(
    ...phaseCorrelations.flatMap((p) => p.topItems.map((i) => i.count)),
    1
  )

  return (
    <div className="space-y-5 pb-4 animate-fade-in">
      <h1 className="page-title">{t('analytics.title')}</h1>

      {cycles.length < 2 && (
        <p className="text-sm text-[var(--text-muted)] glass-panel rounded-2xl px-4 py-3">
          {t('analytics.needMoreData')}
        </p>
      )}

      {/* Hero metrics */}
      <div className="grid grid-cols-3 gap-2.5">
        {statCards.slice(0, 3).map((stat) => (
          <div key={stat.label} className="card-elevated p-3.5 text-center">
            <stat.icon size={16} className="mx-auto mb-2 opacity-60" style={{ color: stat.accent }} />
            <p className="insight-value tabular-nums" style={{ color: stat.accent }}>{stat.value}</p>
            <p className="text-[9px] text-[var(--text-muted)] mt-1 leading-tight">{stat.label}</p>
            {stat.unit && <p className="text-[9px] text-[var(--text-muted)]">{stat.unit}</p>}
          </div>
        ))}
      </div>

      {regularity && (
        <div className="card-elevated p-4 flex items-center gap-4">
          <AlertCircle size={20} style={{ color: 'var(--phase-follicular-deep)' }} />
          <div>
            <p className="text-xs text-[var(--text-muted)]">{t('analytics.regularityIndex')}</p>
            <p className="insight-value text-3xl tabular-nums" style={{ color: 'var(--phase-follicular-deep)' }}>
              ±{regularity.stdDev}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {t('analytics.regularityRange')}: {regularity.min}–{regularity.max} {t('analytics.days')}
            </p>
          </div>
        </div>
      )}

      {insightCards.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold">{t('analytics.wellnessAndHabits')}</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {insightCards.map((stat) => (
              <div key={stat.label} className="card-elevated p-4 flex flex-col min-h-[100px]">
                <stat.icon size={16} style={{ color: stat.accent }} className="mb-2 opacity-70" />
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{stat.label}</p>
                <p className="font-display text-lg font-semibold leading-tight mt-1 truncate">{stat.value}</p>
                {stat.sub && <p className="text-[10px] text-[var(--text-muted)] mt-auto pt-1">{stat.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasPhaseCorrelations && (
        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold">{t('analytics.phaseCorrelations')}</h2>
          <p className="text-xs text-[var(--text-muted)]">{t('analytics.phaseCorrelationsHint')}</p>
          <div className="space-y-3">
            {phaseCorrelations.map((entry) =>
              entry.topItems.length > 0 && (
                <div key={entry.phase} className="card-elevated p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{t(`home.phase.${entry.phase}`)}</p>
                    <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                      {entry.loggedDays} {t('analytics.loggedDays')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {entry.topItems.slice(0, 3).map((item) => (
                      <div key={`${entry.phase}-${item.optionId}`} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{item.emoji} {item.label}</span>
                          <span className="text-[var(--text-muted)] tabular-nums">{item.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-premium"
                            style={{
                              width: `${(item.count / maxCorrelation) * 100}%`,
                              background: PHASE_BAR_COLORS[entry.phase],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      <div className="card-elevated p-5">
        <h2 className="font-display text-base font-semibold mb-4">{t('analytics.cycleHistory')}</h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 4, left: -24 }} barGap={4}>
              <defs>
                <linearGradient id="cycleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B6FE0" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#C4B5FD" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="periodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C45C6A" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#E8A0A8" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: '14px',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-2)',
                  background: 'var(--surface-elevated)',
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="cycle" name={t('analytics.chartCycle')} radius={[10, 10, 4, 4]} fill="url(#cycleGrad)">
                {chartData.map((_, index) => (
                  <Cell key={`c-${index}`} fill={cycleColors[index % cycleColors.length]} fillOpacity={0.85} />
                ))}
              </Bar>
              <Bar dataKey="period" name={t('analytics.chartPeriod')} radius={[10, 10, 4, 4]} fill="url(#periodGrad)">
                {chartData.map((_, index) => (
                  <Cell key={`p-${index}`} fill={periodColors[index % periodColors.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl p-5 elevation-2 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--phase-ovulation-deep)] via-[var(--phase-menstruation-deep)] to-[var(--phase-luteal-deep)] opacity-90" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="relative">
          <p className="label-caps text-white/70">{t('analytics.dailyTip')}</p>
          <p className="font-display text-lg font-medium mt-2 leading-snug">{t('analytics.dailyTipText')}</p>
        </div>
      </div>
    </div>
  )
}