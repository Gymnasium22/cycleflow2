export const DEFAULT_CYCLE_LENGTH = 28
export const DEFAULT_PERIOD_LENGTH = 5
export const LUTEAL_PHASE_LENGTH = 14
export const CYCLE_DELAY_NOTIFY_DAYS = 3

export function parseDate(dateInput) {
  if (!dateInput) return null
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput)
  if (isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d
}

export function daysBetween(a, b) {
  const da = parseDate(a)
  const db = parseDate(b)
  if (!da || !db) return null
  return Math.floor((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}

export function isSameDay(a, b) {
  const da = parseDate(a)
  const db = parseDate(b)
  if (!da || !db) return false
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export function isToday(date) {
  return isSameDay(date, new Date())
}

export function toISODateString(date) {
  const d = typeof date === 'string' ? parseDate(date) : new Date(date)
  if (!d || isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function sortCyclesByDateDesc(cycles) {
  if (!cycles?.length) return []
  return [...cycles].sort((a, b) => parseDate(b.start_date) - parseDate(a.start_date))
}

export function sortCyclesByDateAsc(cycles) {
  if (!cycles?.length) return []
  return [...cycles].sort((a, b) => parseDate(a.start_date) - parseDate(b.start_date))
}

export function getLastCycle(cycles) {
  return sortCyclesByDateDesc(cycles)[0] || null
}

export function isPeriodTrackingOpen(cycle) {
  if (!cycle || cycle.end_date) return false
  const start = parseDate(cycle.start_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return !!(start && start <= today)
}

export function getActiveCycle(cycles) {
  if (!cycles?.length) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return sortCyclesByDateDesc(cycles).find((c) => {
    if (c.end_date) return false
    const start = parseDate(c.start_date)
    return start && start <= today
  }) || null
}

export function getPeriodEndDateForPhase(cycle, fallbackPeriodLength = DEFAULT_PERIOD_LENGTH) {
  const start = parseDate(cycle?.start_date)
  if (!start) return null
  if (cycle.end_date) return parseDate(cycle.end_date)

  const expectedLen = cycle.period_length || fallbackPeriodLength
  const end = new Date(start)
  end.setDate(start.getDate() + expectedLen - 1)
  return end
}

export function isDateInPeriodRange(date, cycle, fallbackPeriodLength = DEFAULT_PERIOD_LENGTH) {
  const start = parseDate(cycle?.start_date)
  const end = getPeriodEndDateForPhase(cycle, fallbackPeriodLength)
  const target = parseDate(date)
  if (!start || !end || !target) return false
  return target >= start && target <= end
}

export function isPeriodOverdue(cycle, fallbackPeriodLength = DEFAULT_PERIOD_LENGTH) {
  if (!isPeriodTrackingOpen(cycle)) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expectedEnd = getPeriodEndDateForPhase(cycle, fallbackPeriodLength)
  return expectedEnd && today > expectedEnd
}

export function getActivePeriodDay(cycle) {
  if (!isPeriodTrackingOpen(cycle)) return null
  const start = parseDate(cycle.start_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export function getActualPeriodLength(cycle, fallback = DEFAULT_PERIOD_LENGTH) {
  if (!cycle) return fallback

  if (cycle.end_date) {
    const length = daysBetween(cycle.start_date, cycle.end_date) + 1
    return length > 0 ? length : fallback
  }

  return cycle.period_length || fallback
}

export function getAveragePeriodLength(cycles, fallback = DEFAULT_PERIOD_LENGTH) {
  if (!cycles || cycles.length === 0) return fallback
  const lengths = cycles.map((c) => getActualPeriodLength(c, null)).filter((l) => l !== null)
  if (lengths.length === 0) return fallback
  return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
}

export function getAverageCycleLength(cycles, fallback = DEFAULT_CYCLE_LENGTH) {
  if (!cycles || cycles.length === 0) return fallback

  if (cycles.length < 2) {
    return cycles[0]?.cycle_length || fallback
  }

  const sorted = sortCyclesByDateAsc(cycles)
  const intervals = []
  for (let i = 1; i < sorted.length; i++) {
    const days = daysBetween(sorted[i - 1].start_date, sorted[i].start_date)
    if (days && days > 0) intervals.push(days)
  }

  if (intervals.length === 0) return fallback
  return Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
}

export function getCycleForDate(date, cycles) {
  if (!cycles || cycles.length === 0) return null
  const target = parseDate(date)
  if (!target) return null

  const sorted = sortCyclesByDateDesc(cycles)
  return sorted.find((c) => parseDate(c.start_date) <= target) || null
}

export function getCycleDayForDate(date, cycleStart) {
  const target = parseDate(date)
  const start = parseDate(cycleStart)
  if (!target || !start) return null

  const diff = daysBetween(start, target)
  if (diff === null || diff < 0) return null
  return diff + 1
}

export function getCurrentPhase(cycleDay, periodLength = DEFAULT_PERIOD_LENGTH, cycleLength = DEFAULT_CYCLE_LENGTH) {
  if (cycleDay <= periodLength) return 'menstruation'

  const ovulationDay = Math.max(periodLength + 1, cycleLength - LUTEAL_PHASE_LENGTH)
  if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1) return 'ovulation'
  if (cycleDay < ovulationDay) return 'follicular'
  return 'luteal'
}

export function getPhaseForDate(date, cycles, avgCycleLength = DEFAULT_CYCLE_LENGTH, avgPeriodLength = DEFAULT_PERIOD_LENGTH) {
  const cycle = getCycleForDate(date, cycles)
  if (!cycle) return null

  const target = parseDate(date)
  const start = parseDate(cycle.start_date)
  const periodEnd = getPeriodEndDateForPhase(cycle, avgPeriodLength)

  if (target >= start && target <= periodEnd) return 'menstruation'

  const cycleLength = cycle.cycle_length || avgCycleLength || DEFAULT_CYCLE_LENGTH
  const cycleDay = getCycleDayForDate(target, start, cycleLength)
  if (!cycleDay) return null

  const periodLength = cycle.period_length || avgPeriodLength
  return getCurrentPhase(cycleDay, periodLength, cycleLength)
}

export function getNextPeriodDateFromHistory(cycles, avgCycleLength = DEFAULT_CYCLE_LENGTH) {
  if (!cycles || cycles.length === 0) return null

  const lastCycle = getLastCycle(cycles)
  const lastStart = parseDate(lastCycle.start_date)
  const cycleLength = avgCycleLength || lastCycle.cycle_length || DEFAULT_CYCLE_LENGTH

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let nextDate = new Date(lastStart)
  while (nextDate.getTime() <= today.getTime()) {
    nextDate.setDate(nextDate.getDate() + cycleLength)
  }
  return nextDate
}

export function getOvulationDateFromHistory(cycles, avgCycleLength = DEFAULT_CYCLE_LENGTH) {
  const nextPeriod = getNextPeriodDateFromHistory(cycles, avgCycleLength)
  if (!nextPeriod) return null

  const ovulation = new Date(nextPeriod)
  ovulation.setDate(ovulation.getDate() - LUTEAL_PHASE_LENGTH)
  return ovulation
}

/** Next ovulation on or after today (avoids "overdue" after current ovulation passed). */
export function getUpcomingOvulationDateFromHistory(cycles, avgCycleLength = DEFAULT_CYCLE_LENGTH) {
  if (!cycles?.length) return null

  const lastCycle = getLastCycle(cycles)
  const lastStart = parseDate(lastCycle.start_date)
  if (!lastStart) return null

  const cycleLength = avgCycleLength || lastCycle.cycle_length || DEFAULT_CYCLE_LENGTH
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let ovulation = new Date(lastStart)
  ovulation.setDate(ovulation.getDate() + cycleLength - LUTEAL_PHASE_LENGTH)

  while (ovulation.getTime() < today.getTime()) {
    ovulation.setDate(ovulation.getDate() + cycleLength)
  }
  return ovulation
}

/** ISO date strings for the predicted next period window (not yet logged). */
export function getPredictedPeriodDateSet(cycles, avgCycleLength, avgPeriodLength) {
  const nextStart = getNextPeriodDateFromHistory(cycles, avgCycleLength)
  if (!nextStart) return new Set()

  const set = new Set()
  const len = avgPeriodLength || DEFAULT_PERIOD_LENGTH
  for (let i = 0; i < len; i++) {
    const d = new Date(nextStart)
    d.setDate(d.getDate() + i)
    set.add(toISODateString(d))
  }
  return set
}

export function getCycleDay(lastPeriodStart, cycleLength = DEFAULT_CYCLE_LENGTH) {
  return getCycleDayForDate(new Date(), lastPeriodStart, cycleLength)
}

export function getNextPeriodDate(lastPeriodStart, cycleLength = DEFAULT_CYCLE_LENGTH) {
  return getNextPeriodDateFromHistory(
    [{ start_date: lastPeriodStart, cycle_length: cycleLength }],
    cycleLength
  )
}

export function getOvulationDate(lastPeriodStart, cycleLength = DEFAULT_CYCLE_LENGTH) {
  return getOvulationDateFromHistory(
    [{ start_date: lastPeriodStart, cycle_length: cycleLength }],
    cycleLength
  )
}

export function formatDate(date, locale = 'ru-RU') {
  const d = parseDate(date)
  if (!d) return ''
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
  })
}

export function getDaysUntil(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = parseDate(date)
  if (!target) return null
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDaysUntil(days, lang = 'ru') {
  if (days === null || days === undefined) return ''
  if (days === 0) return lang === 'ru' ? 'сегодня' : 'today'
  if (days === 1) return lang === 'ru' ? 'завтра' : 'tomorrow'
  if (days === -1) return lang === 'ru' ? 'вчера' : 'yesterday'
  if (days < 0) {
    const abs = Math.abs(days)
    return lang === 'ru' ? `просрочено на ${abs} дн.` : `${abs} days overdue`
  }
  return lang === 'ru' ? `через ${days} дн.` : `in ${days} days`
}

export function getCycleChartData(cycles, fallbackCycle = DEFAULT_CYCLE_LENGTH, fallbackPeriod = DEFAULT_PERIOD_LENGTH) {
  const sorted = sortCyclesByDateAsc(cycles)
  return sorted.map((cycle, index) => {
    let cycleLen = cycle.cycle_length || fallbackCycle
    if (index > 0) {
      const interval = daysBetween(sorted[index - 1].start_date, cycle.start_date)
      if (interval && interval > 0) cycleLen = interval
    }
    return {
      name: `#${index + 1}`,
      cycle: cycleLen,
      period: getActualPeriodLength(cycle, fallbackPeriod),
    }
  })
}

export function generateCalendarDays(year, month) {
  const days = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

  for (let i = 0; i < startPadding; i++) {
    days.push(null)
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  return days
}

export function isCycleDelayed(cycles, avgCycleLength = DEFAULT_CYCLE_LENGTH) {
  if (!cycles?.length) return false
  if (getActiveCycle(cycles)) return false

  const nextPeriod = getNextPeriodDateFromHistory(cycles, avgCycleLength)
  if (!nextPeriod) return false

  const daysUntil = getDaysUntil(nextPeriod)
  return daysUntil !== null && daysUntil < 0
}

export function getCycleDelayDays(cycles, avgCycleLength = DEFAULT_CYCLE_LENGTH) {
  if (!isCycleDelayed(cycles, avgCycleLength)) return 0
  const nextPeriod = getNextPeriodDateFromHistory(cycles, avgCycleLength)
  return Math.abs(getDaysUntil(nextPeriod) || 0)
}

export function shouldSuggestPeriodEnd(cycle, expectedPeriodLength = DEFAULT_PERIOD_LENGTH) {
  if (!isPeriodTrackingOpen(cycle)) return false
  const day = getActivePeriodDay(cycle)
  return day !== null && day >= expectedPeriodLength
}

export function getCycleStats(cycles) {
  if (!cycles || cycles.length === 0) return null

  const sorted = sortCyclesByDateAsc(cycles)
  const intervals = []
  for (let i = 1; i < sorted.length; i++) {
    const days = daysBetween(sorted[i - 1].start_date, sorted[i].start_date)
    if (days && days > 0) intervals.push(days)
  }

  return {
    count: cycles.length,
    avgCycleLength: getAverageCycleLength(cycles),
    avgPeriodLength: getAveragePeriodLength(cycles),
    minCycleLength: intervals.length > 0 ? Math.min(...intervals) : null,
    maxCycleLength: intervals.length > 0 ? Math.max(...intervals) : null,
    cycleVariation: intervals.length > 0 ? Math.max(...intervals) - Math.min(...intervals) : null,
  }
}