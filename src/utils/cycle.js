export const DEFAULT_CYCLE_LENGTH = 28
export const DEFAULT_PERIOD_LENGTH = 5

export function getCycleDay(lastPeriodStart, cycleLength = DEFAULT_CYCLE_LENGTH) {
  const start = new Date(lastPeriodStart)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffTime = today.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return null
  return (diffDays % cycleLength) + 1
}

export function getCurrentPhase(cycleDay, periodLength = DEFAULT_PERIOD_LENGTH, cycleLength = DEFAULT_CYCLE_LENGTH) {
  if (cycleDay <= periodLength) return 'menstruation'

  const ovulationDay = cycleLength - 14
  if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1) return 'ovulation'
  if (cycleDay < ovulationDay) return 'follicular'
  return 'luteal'
}

export function getNextPeriodDate(lastPeriodStart, cycleLength = DEFAULT_CYCLE_LENGTH) {
  const start = new Date(lastPeriodStart)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let nextDate = new Date(start)
  while (nextDate.getTime() <= today.getTime()) {
    nextDate.setDate(nextDate.getDate() + cycleLength)
  }

  return nextDate
}

export function getOvulationDate(lastPeriodStart, cycleLength = DEFAULT_CYCLE_LENGTH) {
  const nextPeriod = getNextPeriodDate(lastPeriodStart, cycleLength)
  const ovulation = new Date(nextPeriod)
  ovulation.setDate(ovulation.getDate() - 14)
  return ovulation
}

export function formatDate(date, locale = 'ru-RU') {
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
  })
}

export function getDaysUntil(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
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

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
