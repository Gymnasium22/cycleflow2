import { getCategoryLabel, getOptionLabel } from '../data/symptomCategories'
import { getActualPeriodLength } from './cycle'

function escapeCsvCell(value) {
  const str = value === null || value === undefined ? '' : String(value)
  return `"${str.replace(/"/g, '""')}"`
}

function parseSymptomNotes(notes) {
  try {
    const parsed = JSON.parse(notes || '{}')
    if (Array.isArray(parsed)) {
      return { selectedIds: parsed, comment: '' }
    }
    return {
      selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds : [],
      comment: parsed.comment || '',
    }
  } catch {
    return { selectedIds: [], comment: '' }
  }
}

export function buildExportCsv({ cycles = [], symptoms = [], dayNotes = [], profile = {}, lang = 'ru' }) {
  const rows = []

  rows.push(['type', 'date', 'field', 'value'].map(escapeCsvCell).join(','))

  for (const cycle of cycles) {
    rows.push(['cycle', cycle.start_date, 'start_date', cycle.start_date].map(escapeCsvCell).join(','))
    if (cycle.end_date) {
      rows.push(['cycle', cycle.start_date, 'end_date', cycle.end_date].map(escapeCsvCell).join(','))
    }
    rows.push(['cycle', cycle.start_date, 'period_length', getActualPeriodLength(cycle)].map(escapeCsvCell).join(','))
    if (cycle.notes) {
      rows.push(['cycle', cycle.start_date, 'notes', cycle.notes].map(escapeCsvCell).join(','))
    }
  }

  for (const note of dayNotes) {
    if (note.content) {
      rows.push(['day_note', note.date, 'content', note.content].map(escapeCsvCell).join(','))
    }
  }

  for (const symptom of symptoms) {
    const { selectedIds, comment } = parseSymptomNotes(symptom.notes)
    const category = getCategoryLabel(symptom.symptom_type, lang)
    const options = selectedIds
      .map((id) => getOptionLabel(symptom.symptom_type, id, lang))
      .join('; ')

    rows.push(['symptom', symptom.date, 'category', category].map(escapeCsvCell).join(','))
    if (options) {
      rows.push(['symptom', symptom.date, 'options', options].map(escapeCsvCell).join(','))
    }
    if (symptom.intensity) {
      rows.push(['symptom', symptom.date, 'intensity', symptom.intensity].map(escapeCsvCell).join(','))
    }
    if (comment) {
      rows.push(['symptom', symptom.date, 'comment', comment].map(escapeCsvCell).join(','))
    }
  }

  if (profile.cycle_length) {
    rows.push(['profile', '', 'cycle_length', profile.cycle_length].map(escapeCsvCell).join(','))
  }
  if (profile.period_length) {
    rows.push(['profile', '', 'period_length', profile.period_length].map(escapeCsvCell).join(','))
  }

  return `\uFEFF${rows.join('\n')}`
}

export function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}