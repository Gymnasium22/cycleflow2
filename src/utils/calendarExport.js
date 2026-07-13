import { getNextPeriodDateFromHistory, getUpcomingOvulationDateFromHistory, getAverageCycleLength, toISODateString, parseDate } from './cycle'

function pad(n) {
  return String(n).padStart(2, '0')
}

function toIcsDate(date) {
  const d = date instanceof Date ? date : parseDate(date)
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function escapeIcs(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Build a simple .ics with expected periods + ovulation for the next few cycles (FREE).
 */
export function buildForecastIcs({
  cycles,
  cycleLength = 28,
  periodLength = 5,
  count = 6,
  appName = 'Kolechko',
  labels = {},
} = {}) {
  const avg = getAverageCycleLength(cycles, cycleLength)
  const events = []
  let periodStart = getNextPeriodDateFromHistory(cycles, avg)
  let ovulation = getUpcomingOvulationDateFromHistory(cycles, avg)

  for (let i = 0; i < count; i++) {
    if (periodStart) {
      const end = new Date(periodStart)
      end.setDate(end.getDate() + Math.max(1, periodLength) - 1)
      const endExclusive = new Date(end)
      endExclusive.setDate(endExclusive.getDate() + 1)
      events.push({
        uid: `period-${toISODateString(periodStart)}@kolechko`,
        stamp: toIcsDate(new Date()),
        start: toIcsDate(periodStart),
        end: toIcsDate(endExclusive),
        summary: labels.period || 'Expected period',
        description: labels.periodHint || 'Forecast from Kolechko — not medical advice.',
      })
      // next period
      const next = new Date(periodStart)
      next.setDate(next.getDate() + avg)
      periodStart = next
    }
    if (ovulation) {
      const ovEnd = new Date(ovulation)
      ovEnd.setDate(ovEnd.getDate() + 1)
      events.push({
        uid: `ovulation-${toISODateString(ovulation)}@kolechko`,
        stamp: toIcsDate(new Date()),
        start: toIcsDate(ovulation),
        end: toIcsDate(ovEnd),
        summary: labels.ovulation || 'Expected ovulation',
        description: labels.ovulationHint || 'Estimated fertile peak — not contraception.',
      })
      const nextOv = new Date(ovulation)
      nextOv.setDate(nextOv.getDate() + avg)
      ovulation = nextOv
    }
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${escapeIcs(appName)}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const ev of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}`,
      `DTSTAMP:${ev.stamp}T120000Z`,
      `DTSTART;VALUE=DATE:${ev.start}`,
      `DTEND;VALUE=DATE:${ev.end}`,
      `SUMMARY:${escapeIcs(ev.summary)}`,
      `DESCRIPTION:${escapeIcs(ev.description)}`,
      'END:VEVENT'
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(filename, icsBody) {
  const blob = new Blob([icsBody], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
