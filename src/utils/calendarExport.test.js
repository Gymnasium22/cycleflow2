import { describe, it, expect } from 'vitest'
import { buildForecastIcs } from './calendarExport'

describe('buildForecastIcs', () => {
  it('emits VCALENDAR with events', () => {
    const ics = buildForecastIcs({
      cycles: [
        { start_date: '2026-01-01', end_date: '2026-01-05' },
        { start_date: '2026-01-29', end_date: '2026-02-02' },
      ],
      cycleLength: 28,
      periodLength: 5,
      count: 2,
    })
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('END:VCALENDAR')
  })
})
