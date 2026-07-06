import {
  getAverageCycleLength,
  getAveragePeriodLength,
  getActualPeriodLength,
  sortCyclesByDateDesc,
  formatDate,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from './cycle'
import { getCategoryLabel, getOptionLabel, getOptionEmoji } from '../data/symptomCategories'
import { getSymptomPhaseCorrelations } from './symptomPhaseCorrelation'

function parseSymptomNotes(notes) {
  try {
    const parsed = JSON.parse(notes || '{}')
    if (Array.isArray(parsed)) return { selectedIds: parsed, comment: '' }
    return {
      selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds : [],
      comment: parsed.comment || '',
    }
  } catch {
    return { selectedIds: [], comment: '' }
  }
}

function computeRegularity(cycles) {
  if (cycles.length < 2) return null
  const sorted = [...cycles].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
  const intervals = []
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round((new Date(sorted[i].start_date) - new Date(sorted[i - 1].start_date)) / 86400000)
    if (diff > 0) intervals.push(diff)
  }
  if (!intervals.length) return null
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const variance = intervals.reduce((sum, v) => sum + (v - avg) ** 2, 0) / intervals.length
  return {
    stdDev: Math.round(Math.sqrt(variance)),
    min: Math.min(...intervals),
    max: Math.max(...intervals),
  }
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 5) {
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

export async function downloadDoctorReport({
  cycles = [],
  symptoms = [],
  dayNotes = [],
  profile = {},
  lang = 'ru',
  labels,
}) {
  const { jsPDF } = await import('jspdf')
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 16
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const fallbackCycle = profile?.cycle_length || DEFAULT_CYCLE_LENGTH
  const fallbackPeriod = profile?.period_length || DEFAULT_PERIOD_LENGTH
  const avgCycle = getAverageCycleLength(cycles, fallbackCycle)
  const avgPeriod = getAveragePeriodLength(cycles, fallbackPeriod)
  const regularity = computeRegularity(cycles)
  const phaseCorrelations = getSymptomPhaseCorrelations(symptoms, cycles, avgCycle, avgPeriod, lang)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(labels.title, margin, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`${labels.generated}: ${formatDate(new Date(), locale)}`, margin, y)
  y += 10
  doc.setTextColor(0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(labels.summary, margin, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const summaryLines = [
    `${labels.avgCycle}: ${avgCycle} ${labels.days}`,
    `${labels.avgPeriod}: ${avgPeriod} ${labels.days}`,
    `${labels.cyclesCount}: ${cycles.length}`,
  ]
  if (regularity) {
    summaryLines.push(`${labels.regularity}: ±${regularity.stdDev} ${labels.days} (${regularity.min}–${regularity.max})`)
  }
  for (const line of summaryLines) {
    doc.text(line, margin, y)
    y += 5
  }
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(labels.cyclesTable, margin, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const recentCycles = sortCyclesByDateDesc(cycles).slice(0, 12)
  if (!recentCycles.length) {
    y = addWrappedText(doc, labels.noCycles, margin, y, contentWidth)
    y += 4
  } else {
    for (const cycle of recentCycles) {
      const periodLen = getActualPeriodLength(cycle)
      const line = `• ${formatDate(cycle.start_date, locale)} — ${cycle.end_date ? formatDate(cycle.end_date, locale) : labels.ongoing} · ${labels.period}: ${periodLen} ${labels.days}`
      y = addWrappedText(doc, line, margin, y, contentWidth, 4.5)
      if (cycle.notes) {
        y = addWrappedText(doc, `  ${labels.note}: ${cycle.notes}`, margin + 2, y, contentWidth - 2, 4.5)
      }
      if (y > 270) {
        doc.addPage()
        y = margin
      }
    }
    y += 4
  }

  const phasesWithData = phaseCorrelations.filter((p) => p.topItems.length > 0)
  if (phasesWithData.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(labels.symptomsByPhase, margin, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    for (const entry of phasesWithData) {
      const phaseName = labels.phases[entry.phase] || entry.phase
      const items = entry.topItems
        .slice(0, 3)
        .map((item) => `${item.emoji} ${item.label} (${item.count}×)`)
        .join(', ')
      y = addWrappedText(doc, `${phaseName}: ${items}`, margin, y, contentWidth, 4.5)
      if (y > 270) {
        doc.addPage()
        y = margin
      }
    }
    y += 4
  }

  const recentSymptoms = [...symptoms]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)

  if (recentSymptoms.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(labels.recentSymptoms, margin, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    for (const s of recentSymptoms) {
      const { selectedIds, comment } = parseSymptomNotes(s.notes)
      const category = getCategoryLabel(s.symptom_type, lang)
      const options = selectedIds
        .map((id) => `${getOptionEmoji(s.symptom_type, id)} ${getOptionLabel(s.symptom_type, id, lang)}`)
        .join(', ')
      let line = `${formatDate(s.date, locale)} · ${category}`
      if (options) line += `: ${options}`
      if (s.intensity) line += ` · ${labels.intensity} ${s.intensity}/3`
      if (comment) line += ` · ${comment}`
      y = addWrappedText(doc, `• ${line}`, margin, y, contentWidth, 4.5)
      if (y > 270) {
        doc.addPage()
        y = margin
      }
    }
    y += 4
  }

  const notesWithContent = dayNotes.filter((n) => n.content).slice(0, 10)
  if (notesWithContent.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(labels.dayNotes, margin, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    for (const note of notesWithContent) {
      y = addWrappedText(doc, `${formatDate(note.date, locale)}: ${note.content}`, margin, y, contentWidth, 4.5)
      if (y > 270) {
        doc.addPage()
        y = margin
      }
    }
    y += 4
  }

  doc.setFontSize(8)
  doc.setTextColor(120)
  y = Math.min(Math.max(y, 250), 285)
  addWrappedText(doc, labels.disclaimer, margin, y, contentWidth, 3.5)

  const datePart = new Date().toISOString().split('T')[0]
  doc.save(`cycleflow-doctor-report-${datePart}.pdf`)
}