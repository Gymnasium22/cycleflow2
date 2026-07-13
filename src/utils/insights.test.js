import { describe, it, expect } from 'vitest'
import { buildCycleInsights, filterInsightsForPlan } from './insights'

const base = [
  { start_date: '2026-01-01', end_date: '2026-01-05' },
  { start_date: '2026-01-25', end_date: '2026-01-29' }, // 24d
  { start_date: '2026-02-18', end_date: '2026-02-22' }, // 24d
  { start_date: '2026-03-14', end_date: '2026-03-18' }, // 24d
]

describe('buildCycleInsights', () => {
  it('returns at least one insight for multi-cycle history', () => {
    const list = buildCycleInsights(base)
    expect(list.length).toBeGreaterThan(0)
  })

  it('filterInsightsForPlan limits free to one non-premium', () => {
    const list = buildCycleInsights(base)
    const free = filterInsightsForPlan(list, false)
    expect(free.length).toBeLessThanOrEqual(1)
    expect(free.every((i) => !i.premium)).toBe(true)
  })

  it('premium gets full list', () => {
    const list = buildCycleInsights(base)
    expect(filterInsightsForPlan(list, true).length).toBe(list.length)
  })
})
