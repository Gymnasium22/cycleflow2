import { describe, it, expect } from 'vitest'
import {
  getLastCycle,
  getActiveCycle,
  getAverageCycleLength,
  getAveragePeriodLength,
  getCycleChartData,
  isCycleDelayed,
  shouldSuggestPeriodEnd,
  isPeriodOverdue,
  getActualPeriodLength,
  sortCyclesByDateDesc,
  daysBetween,
  formatDaysUntil,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from './cycle'

const sampleCycles = [
  { id: '1', start_date: '2026-01-01', end_date: '2026-01-05', period_length: 5, cycle_length: 28 },
  { id: '2', start_date: '2026-01-29', end_date: '2026-02-02', period_length: 5, cycle_length: 28 },
  { id: '3', start_date: '2026-02-26', end_date: null, period_length: 5, cycle_length: 28 },
]

describe('sortCyclesByDateDesc', () => {
  it('sorts cycles by start_date descending', () => {
    const sorted = sortCyclesByDateDesc(sampleCycles)
    expect(sorted[0].start_date).toBe('2026-02-26')
    expect(sorted[2].start_date).toBe('2026-01-01')
  })
})

describe('getLastCycle', () => {
  it('returns the most recent cycle by start date', () => {
    expect(getLastCycle(sampleCycles)?.id).toBe('3')
  })

  it('returns null for empty array', () => {
    expect(getLastCycle([])).toBeNull()
  })
})

describe('getActiveCycle', () => {
  it('returns open cycle that started on or before today', () => {
    const cycles = [{ id: 'a', start_date: '2020-01-01', end_date: null }]
    expect(getActiveCycle(cycles)?.id).toBe('a')
  })

  it('returns null when all cycles are closed', () => {
    const cycles = [{ id: 'a', start_date: '2020-01-01', end_date: '2020-01-05' }]
    expect(getActiveCycle(cycles)).toBeNull()
  })
})

describe('getAverageCycleLength', () => {
  it('uses fallback when no cycles', () => {
    expect(getAverageCycleLength([], 30)).toBe(30)
  })

  it('calculates average from intervals between starts', () => {
    const cycles = [
      { start_date: '2026-01-01' },
      { start_date: '2026-01-29' },
    ]
    expect(getAverageCycleLength(cycles)).toBe(28)
  })
})

describe('getAveragePeriodLength', () => {
  it('averages actual period lengths', () => {
    const cycles = [
      { start_date: '2026-01-01', end_date: '2026-01-04' },
      { start_date: '2026-01-29', end_date: '2026-02-01' },
    ]
    expect(getAveragePeriodLength(cycles)).toBe(4)
  })
})

describe('getActualPeriodLength', () => {
  it('uses days between start and end when closed', () => {
    expect(getActualPeriodLength({ start_date: '2026-01-01', end_date: '2026-01-05' })).toBe(5)
  })

  it('falls back to period_length when open', () => {
    expect(getActualPeriodLength({ start_date: '2026-01-01', period_length: 6 })).toBe(6)
  })
})

describe('getCycleChartData', () => {
  it('maps cycles to chart entries with real intervals', () => {
    const data = getCycleChartData(sampleCycles.slice(0, 2))
    expect(data).toHaveLength(2)
    expect(data[1].cycle).toBe(28)
    expect(data[0].period).toBe(5)
  })
})

describe('isCycleDelayed', () => {
  it('returns false when active period is open', () => {
    const cycles = [{ start_date: new Date().toISOString().slice(0, 10), end_date: null }]
    expect(isCycleDelayed(cycles, DEFAULT_CYCLE_LENGTH)).toBe(false)
  })
})

describe('formatDaysUntil', () => {
  it('formats relative days in Russian', () => {
    expect(formatDaysUntil(0, 'ru')).toBe('сегодня')
    expect(formatDaysUntil(3, 'ru')).toBe('через 3 дн.')
    expect(formatDaysUntil(-2, 'ru')).toBe('просрочено на 2 дн.')
  })

  it('formats relative days in English', () => {
    expect(formatDaysUntil(1, 'en')).toBe('tomorrow')
    expect(formatDaysUntil(5, 'en')).toBe('in 5 days')
  })
})

describe('daysBetween', () => {
  it('counts inclusive day difference', () => {
    expect(daysBetween('2026-01-01', '2026-01-05')).toBe(4)
  })
})

describe('shouldSuggestPeriodEnd', () => {
  it('suggests end when active period day meets expected length', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(today.getDate() - (DEFAULT_PERIOD_LENGTH - 1))
    const cycle = {
      start_date: start.toISOString().slice(0, 10),
      end_date: null,
      period_length: DEFAULT_PERIOD_LENGTH,
    }
    expect(shouldSuggestPeriodEnd(cycle, DEFAULT_PERIOD_LENGTH)).toBe(true)
  })
})

describe('isPeriodOverdue', () => {
  it('detects period lasting longer than expected', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(today.getDate() - 10)
    const cycle = {
      start_date: start.toISOString().slice(0, 10),
      end_date: null,
      period_length: DEFAULT_PERIOD_LENGTH,
    }
    expect(isPeriodOverdue(cycle, DEFAULT_PERIOD_LENGTH)).toBe(true)
  })
})