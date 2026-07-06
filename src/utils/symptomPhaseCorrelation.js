import { getPhaseForDate } from './cycle'
import { getOptionLabel, getOptionEmoji } from '../data/symptomCategories'

const TRACKED_CATEGORIES = ['mood', 'symptoms', 'activity']
const PHASE_ORDER = ['menstruation', 'follicular', 'ovulation', 'luteal']

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

export function getSymptomPhaseCorrelations(symptoms, cycles, avgCycleLength, avgPeriodLength, lang = 'ru') {
  const phaseData = Object.fromEntries(
    PHASE_ORDER.map((phase) => [phase, { optionCounts: {}, dates: new Set() }])
  )

  for (const s of symptoms) {
    if (!TRACKED_CATEGORIES.includes(s.symptom_type)) continue
    const phase = getPhaseForDate(s.date, cycles, avgCycleLength, avgPeriodLength)
    if (!phase || !phaseData[phase]) continue

    phaseData[phase].dates.add(s.date)
    const ids = parseSelectedIds(s.notes)
    for (const id of ids) {
      const key = `${s.symptom_type}:${id}`
      phaseData[phase].optionCounts[key] = (phaseData[phase].optionCounts[key] || 0) + 1
    }
  }

  return PHASE_ORDER.map((phase) => {
    const { optionCounts, dates } = phaseData[phase]
    const topItems = Object.entries(optionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key, count]) => {
        const [categoryId, optionId] = key.split(':')
        return {
          categoryId,
          optionId,
          count,
          label: getOptionLabel(categoryId, optionId, lang),
          emoji: getOptionEmoji(categoryId, optionId),
        }
      })

    return {
      phase,
      loggedDays: dates.size,
      topItems,
    }
  }).filter((entry) => entry.loggedDays > 0 || entry.topItems.length > 0)
}