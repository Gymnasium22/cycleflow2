import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, AlertCircle, Heart, Activity, Pill, Smile, Sparkles } from 'lucide-react'
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

function getRegularityMeta(stdDev, t) {
  if (stdDev <= 2) return { label: t('analytics.regularityStable'), tone: 'var(--accent-success-deep)' }
  if (stdDev <= 4) return { label: t('analytics.regularityModerate'), tone: 'var(--phase-follicular-deep)' }
  return { label: t('analytics.regularityIrregular'), tone: 'var(--phase-menstruation-deep)' }
}

const PHASE_BAR_COLORS = {
  menstruation: 'var(--phase-menstruation-deep)',
  follicular: 'var(--phase-follicular-deep)',
  ovulation: 'var(--phase-ovulation-deep)',
  luteal: 'var(--phase-luteal-deep)',
}

const PHASE_HERO_GRADIENT = {
  menstruation: 'from-[var(--phase-menstruation-start)] to-[var(--phase-menstruation-end)]',
  follicular: 'from-[var(--phase-follicular-start)] to-[var(--phase-follicular-end)]',
  ovulation: 'from-[var(--phase-ovulation-start)] to-[var(--phase-ovulation-end)]',
  luteal: 'from-[var(--phase-luteal-start)] to-[var(--phase-luteal-end)]',
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

  const regularityMeta = regularity ? getRegularityMeta(regularity.stdDev, t) : null

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

  const loggedDaysCount = useMemo(() => new Set(allSymptoms.map((s) => s.date)).size, [allSymptoms])

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
    const adherence = medicationLogs.length
      ? Math.round((counts.taken / medicationLogs.length) * 100)
      : null
    return { ...counts, adherence }
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

  const dominantPhase = useMemo(() => {
    const ranked = [...phaseCorrelations].sort((a, b) => b.loggedDays - a.loggedDays)
    return ranked[0]?.loggedDays > 0 ? ranked[0].phase : 'follicular'
  }, [phaseCorrelations])

  const personalizedInsight = useMemo(() => {
    if (regularity && regularity.stdDev > 4) return t('analytics.insightIrregular')
    if (medicationStats.adherence !== null && medicationStats.adherence < 70) return t('analytics.insightMedication')
    if (topSymptom) return t('analytics.insightSymptom', { symptom: `${topSymptom.emoji} ${topSymptom.label}` })
    if (cycles.length >= 3) return t('analytics.insightStable')
    return t('analytics.insightDefault')
  }, [regularity, medicationStats.adherence, topSymptom, cycles.length, t])

  const insightCards = [
    ...(topMood ? [{ icon: Smile, label: t('analytics.topMood'), value: `${topMood.emoji} ${topMood.label}`, sub: `${topMood.count}×`, accent: 'var(--phase-follicular-deep)' }] : []),
    ...(topSymptom ? [{ icon: Activity, label: t('analytics.topSymptom'), value: `${topSymptom.emoji} ${topSymptom.label}`, sub: `${topSymptom.count}×`, accent: 'var(--phase-menstruation-deep)' }] : []),
    ...(topActivity ? [{ icon: TrendingUp, label: t('analytics.topActivity'), value: `${topActivity.emoji} ${topActivity.label}`, sub: `${topActivity.count}×`, accent: 'var(--phase-ovulation-deep)' }] : []),
    ...(sexDaysCount > 0 ? [{ icon: Heart, label: t('analytics.daysWithSex'), value: String(sexDaysCount), sub: topSex ? topSex.emoji : '', accent: 'var(--phase-menstruation)' }] : []),
    ...(medicationLogs.length > 0
      ? [{
          icon: Pill,
          label: t('analytics.medicationIntake'),
          value: `${medicationStats.adherence}%`,
          sub: t('analytics.adherence'),
          accent: 'var(--accent-success-deep)',
        }]
      : []),
  ]

  const cycleColors = ['#C45C6A', '#8B6FE0', '#8E7AA8', '#D4A84A', '#7C5FD4']
  const periodColors = ['#E8A0A8', '#C4B5FD', '#C8B4D8', '#F5D9A8', '#A78BFA']

  const maxCorrelation = Math.max(
    ...phaseCorrelations.flatMap((p) => p.topItems.map((i) => i.count)),
    1
  )

  return (
    <div className="space-y-5 pb-4 animate-fade-in">
      <header>
        <h1 className="page-title">{t('analytics.title')}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">{t('analytics.subtitle')}</p>
      </header>

      {cycles.length < 2 && (
        <p className="text-sm text-[var(--text-muted)] glass-panel rounded-2xl px-4 py-3">
          {t('analytics.needMoreData')}
        </p>
      )}

      {/* Hero summary */}
      <div className={`relative overflow-hidden rounded-2xl p-5 text-white elevation-2 bg-gradient-to-br ${PHASE_HERO_GRADIENT[dominantPhase]}`}>
        <div className="absolute inset-0 noise-overlay pointer-events-none" />
        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-caps text-white/75">{t('analytics.overview')}</p>
              <p className="font-display text-4xl font-semibold tabular-nums mt-1">{avgCycleLength}</p>
              <p className="text-sm text-white/80">{t('analytics.averageCycle')} · {t('analytics.days')}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-display font-semibold tabular-nums">{cycles.length}</p>
              <p className="text-xs text-white/75">{t('analytics.cyclesCount')}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-2.5 py-2 text-center">
              <p className="text-lg font-bold tabular-nums">{avgPeriodLength}</p>
              <p className="text-[9px] text-white/75 leading-tight">{t('analytics.averagePeriod')}</p>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-2.5 py-2 text-center">
              <p className="text-lg font-bold tabular-nums">{loggedDaysCount}</p>
              <p className="text-[9px] text-white/75 leading-tight">{t('analytics.loggedDaysTotal')}</p>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-2.5 py-2 text-center">
              <p className="text-lg font-bold tabular-nums">{regularity ? `±${regularity.stdDev}` : '—'}</p>
              <p className="text-[9px] text-white/75 leading-tight">{t('analytics.regularityIndex')}</p>
            </div>
          </div>
          {regularityMeta && (
            <p className="text-xs font-medium text-white/90 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20">
              <Sparkles size={12} />
              {regularityMeta.label}
            </p>
          )}
        </div>
      </div>

      {/* Cycle chart — primary visual */}
      <div className="card-elevated p-5">
        <h2 className="font-display text-base font-semibold mb-1">{t('analytics.cycleHistory')}</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">{t('analytics.cycleHistoryHint')}</p>
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

      {regularity && (
        <div className="card-elevated p-4 flex items-center gap-4">
          <AlertCircle size={20} style={{ color: regularityMeta?.tone || 'var(--phase-follicular-deep)' }} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--text-muted)]">{t('analytics.regularityIndex')}</p>
            <p className="insight-value text-3xl tabular-nums" style={{ color: regularityMeta?.tone }}>
              ±{regularity.stdDev}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {t('analytics.regularityRange')}: {regularity.min}–{regularity.max} {t('analytics.days')}
              {regularityMeta ? ` · ${regularityMeta.label}` : ''}
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
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: PHASE_BAR_COLORS[entry.phase] }}
                      />
                      {t(`home.phase.${entry.phase}`)}
                    </p>
                    <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                      {entry.loggedDays} {t('analytics.loggedDays')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {entry.topItems.slice(0, 3).map((item) => (
                      <div key={`${entry.phase}-${item.optionId}`} className="space-y-1">
                        <div className="flex justify-between text-xs gap-2">
                          <span className="truncate">{item.emoji} {item.label}</span>
                          <span className="text-[var(--text-muted)] tabular-nums shrink-0">{item.count}</span>
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

      <div className="rounded-2xl p-5 elevation-2 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--phase-ovulation-deep)] via-[var(--phase-menstruation-deep)] to-[#5C4F72] opacity-90" />
        <div className="absolute inset-0 noise-overlay" />
        <div className="relative">
          <p className="label-caps text-white/70">{t('analytics.personalInsight')}</p>
          <p className="font-display text-base font-medium mt-2 leading-snug">{personalizedInsight}</p>
        </div>
      </div>
    </div>
  )
}