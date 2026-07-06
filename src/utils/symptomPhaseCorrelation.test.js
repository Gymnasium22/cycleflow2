import { describe, it, expect } from 'vitest'
import { getSymptomPhaseCorrelations } from './symptomPhaseCorrelation'

describe('getSymptomPhaseCorrelations', () => {
  const cycles = [
    { start_date: '2026-01-01', end_date: '2026-01-05', period_length: 5, cycle_length: 28 },
  ]

  it('groups symptoms by cycle phase', () => {
    const symptoms = [
      { date: '2026-01-02', symptom_type: 'mood', notes: JSON.stringify({ selectedIds: ['happy'], comment: '' }) },
      { date: '2026-01-15', symptom_type: 'symptoms', notes: JSON.stringify({ selectedIds: ['cramps'], comment: '' }) },
    ]

    const result = getSymptomPhaseCorrelations(symptoms, cycles, 28, 5, 'en')
    const menstruation = result.find((r) => r.phase === 'menstruation')
    expect(menstruation?.topItems.length).toBeGreaterThan(0)
    expect(menstruation?.topItems[0].optionId).toBe('happy')
  })

  it('returns empty top items when no matching symptoms', () => {
    const result = getSymptomPhaseCorrelations([], cycles, 28, 5, 'en')
    expect(result.every((r) => r.topItems.length === 0)).toBe(true)
  })
})