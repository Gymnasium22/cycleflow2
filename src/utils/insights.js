import { parseDate, getAverageCycleLength } from './cycle'

/**
 * Non-medical pattern insights from logged cycles.
 * Free: first insight only. Premium: full list.
 */
export function buildCycleInsights(cycles, { max = 10 } = {}) {
  if (!cycles || cycles.length < 2) return []

  const sorted = [...cycles].sort((a, b) => parseDate(a.start_date) - parseDate(b.start_date))
  const lengths = []
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.round(
      (parseDate(sorted[i].start_date) - parseDate(sorted[i - 1].start_date)) / (1000 * 60 * 60 * 24)
    )
    if (days > 10 && days < 60) lengths.push(days)
  }
  if (lengths.length === 0) return []

  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const insights = []

  // Last N shorter/longer than average
  const last3 = lengths.slice(-3)
  if (last3.length >= 3 && last3.every((d) => d < avg - 1.5)) {
    insights.push({
      id: 'shorter_streak',
      key: 'insights.shorterStreak',
      params: { count: 3, avg: Math.round(avg) },
      premium: false,
    })
  } else if (last3.length >= 3 && last3.every((d) => d > avg + 1.5)) {
    insights.push({
      id: 'longer_streak',
      key: 'insights.longerStreak',
      params: { count: 3, avg: Math.round(avg) },
      premium: false,
    })
  }

  const variance =
    lengths.reduce((s, v) => s + (v - avg) ** 2, 0) / lengths.length
  const std = Math.sqrt(variance)
  if (std <= 2 && lengths.length >= 3) {
    insights.push({
      id: 'stable',
      key: 'insights.stable',
      params: { avg: Math.round(avg) },
      premium: false,
    })
  } else if (std > 4) {
    insights.push({
      id: 'variable',
      key: 'insights.variable',
      params: { range: `${Math.min(...lengths)}–${Math.max(...lengths)}` },
      premium: true,
    })
  }

  const periods = cycles
    .map((c) => {
      if (c.end_date) {
        return (
          Math.round((parseDate(c.end_date) - parseDate(c.start_date)) / 86400000) + 1
        )
      }
      return c.period_length || null
    })
    .filter((n) => n && n > 0)

  if (periods.length >= 2) {
    const pAvg = periods.reduce((a, b) => a + b, 0) / periods.length
    insights.push({
      id: 'period_avg',
      key: 'insights.periodAvg',
      params: { days: Math.round(pAvg) },
      premium: true,
    })
  }

  if (lengths.length >= 4) {
    const recent = lengths.slice(-3)
    const earlier = lengths.slice(0, -3)
    const rAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const eAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
    if (rAvg < eAvg - 2) {
      insights.push({
        id: 'trending_shorter',
        key: 'insights.trendingShorter',
        params: {},
        premium: true,
      })
    } else if (rAvg > eAvg + 2) {
      insights.push({
        id: 'trending_longer',
        key: 'insights.trendingLonger',
        params: {},
        premium: true,
      })
    }
  }

  // Fallback educational tip (always free)
  if (insights.length === 0) {
    insights.push({
      id: 'keep_logging',
      key: 'insights.keepLogging',
      params: { count: cycles.length },
      premium: false,
    })
  }

  return insights.slice(0, max)
}

export function filterInsightsForPlan(insights, isPremium) {
  if (isPremium) return insights
  // Free: only non-premium insights, max 1
  return insights.filter((i) => !i.premium).slice(0, 1)
}

export function getAverageFromCycles(cycles, fallback) {
  return getAverageCycleLength(cycles, fallback)
}
