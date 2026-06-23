export const DEFAULT_CYCLE_LENGTH = 28
export const DEFAULT_PERIOD_LENGTH = 5

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

export function getActualPeriodLength(cycle, fallback = DEFAULT_PERIOD_LENGTH) {
  if (!cycle) return fallback

  if (cycle.end_date) {
    const length = daysBetween(cycle.start_date, cycle.end_date) + 1
    return length > 0 ? length : fallback
  }

  const today = new Date()
  const start = parseDate(cycle.start_date)
  if (start && start <= today) {
    const activeLength = daysBetween(start, today) + 1
    return activeLength > 0 ? activeLength : fallback
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

  if (cycles.length === 1 && cycles[0].cycle_length) {
    return cycles[0].cycle_length
  }

  if (cycles.length < 2) return fallback

  const sorted = [...cycles].sort((a, b) => parseDate(a.start_date) - parseDate(b.start_date))
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

  const sorted = [...cycles].sort((a, b) => parseDate(b.start_date) - parseDate(a.start_date))
  return sorted.find((c) => parseDate(c.start_date) <= target) || null
}

export function getCycleDayForDate(date, cycleStart, cycleLength = DEFAULT_CYCLE_LENGTH) {
  const target = parseDate(date)
  const start = parseDate(cycleStart)
  if (!target || !start) return null

  const diff = daysBetween(start, target)
  if (diff === null || diff < 0) return null
  return (diff % cycleLength) + 1
}

export function getCurrentPhase(cycleDay, periodLength = DEFAULT_PERIOD_LENGTH, cycleLength = DEFAULT_CYCLE_LENGTH) {
  if (cycleDay <= periodLength) return 'menstruation'

  const ovulationDay = cycleLength - 14
  if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1) return 'ovulation'
  if (cycleDay < ovulationDay) return 'follicular'
  return 'luteal'
}

export function getPhaseForDate(date, cycles, avgCycleLength = DEFAULT_CYCLE_LENGTH, avgPeriodLength = DEFAULT_PERIOD_LENGTH) {
  const cycle = getCycleForDate(date, cycles)
  if (!cycle) return null

  const target = parseDate(date)
  const start = parseDate(cycle.start_date)

  const periodLength = getActualPeriodLength(cycle, avgPeriodLength)
  const periodEnd = new Date(start)
  periodEnd.setDate(start.getDate() + periodLength - 1)

  if (target >= start && target <= periodEnd) return 'menstruation'

  const cycleLength = cycle.cycle_length || avgCycleLength || DEFAULT_CYCLE_LENGTH
  const cycleDay = getCycleDayForDate(target, start, cycleLength)
  if (!cycleDay) return null

  return getCurrentPhase(cycleDay, periodLength, cycleLength)
}

export function getNextPeriodDateFromHistory(cycles, avgCycleLength = DEFAULT_CYCLE_LENGTH) {
  if (!cycles || cycles.length === 0) return null

  const sorted = [...cycles].sort((a, b) => parseDate(b.start_date) - parseDate(a.start_date))
  const lastCycle = sorted[0]
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
  ovulation.setDate(ovulation.getDate() - 14)
  return ovulation
}

// Legacy wrappers for backwards compatibility
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

export function getCycleStats(cycles) {
  if (!cycles || cycles.length === 0) return null

  const sorted = [...cycles].sort((a, b) => parseDate(a.start_date) - parseDate(b.start_date))
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
