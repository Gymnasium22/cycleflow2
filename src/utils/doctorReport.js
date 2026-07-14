import {
  getAverageCycleLength,
  getAveragePeriodLength,
  getActualPeriodLength,
  sortCyclesByDateDesc,
  formatDate,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from './cycle'
import { getCategoryLabel, getOptionLabel } from '../data/symptomCategories'
import { getSymptomPhaseCorrelations } from './symptomPhaseCorrelation'

const PDF_FONT = 'ReportFont'
const PDF_FONT_FILE = 'Roboto-Regular.ttf'
const PAGE_BOTTOM = 285

function pdfText(text) {
  return String(text ?? '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

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

async function setupPdfFont(doc) {
  const { robotoRegularBase64 } = await import('../assets/pdfFonts/roboto-regular.js')
  doc.addFileToVFS(PDF_FONT_FILE, robotoRegularBase64)
  doc.addFont(PDF_FONT_FILE, PDF_FONT, 'normal')
  doc.setFont(PDF_FONT, 'normal')
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 5) {
  const lines = doc.splitTextToSize(pdfText(text), maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function ensureSpace(doc, y, margin, needed = 12) {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage()
    doc.setFont(PDF_FONT, 'normal')
    return margin
  }
  return y
}

function writeSectionTitle(doc, text, margin, y) {
  y = ensureSpace(doc, y, margin, 14)
  doc.setFontSize(12)
  doc.setTextColor(55, 65, 81)
  doc.text(pdfText(text), margin, y)
  return y + 7
}

export async function downloadDoctorReport({
  cycles = [],
  symptoms = [],
  dayNotes = [],
  profile = {},
  lang = 'ru',
  labels,
  appName = 'Колечко',
}) {
  const { jsPDF } = await import('jspdf')
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  await setupPdfFont(doc)

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

  doc.setFontSize(16)
  doc.setTextColor(142, 74, 90)
  doc.text(pdfText(labels.title), margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  doc.text(pdfText(`${labels.generated}: ${formatDate(new Date(), locale)}`), margin, y)
  y += 10
  doc.setTextColor(26, 26, 31)

  y = writeSectionTitle(doc, labels.summary, margin, y)
  doc.setFontSize(10)
  doc.setTextColor(26, 26, 31)

  const summaryLines = [
    `${labels.avgCycle}: ${avgCycle} ${labels.days}`,
    `${labels.avgPeriod}: ${avgPeriod} ${labels.days}`,
    `${labels.cyclesCount}: ${cycles.length}`,
  ]
  if (regularity) {
    summaryLines.push(
      `${labels.regularity}: ±${regularity.stdDev} ${labels.days} (${regularity.min}–${regularity.max})`,
    )
  }
  for (const line of summaryLines) {
    y = ensureSpace(doc, y, margin, 6)
    doc.text(pdfText(line), margin, y)
    y += 5
  }
  y += 4

  y = writeSectionTitle(doc, labels.cyclesTable, margin, y)
  doc.setFontSize(9)
  doc.setTextColor(26, 26, 31)

  const recentCycles = sortCyclesByDateDesc(cycles).slice(0, 12)
  if (!recentCycles.length) {
    y = addWrappedText(doc, labels.noCycles, margin, y, contentWidth)
    y += 4
  } else {
    for (const cycle of recentCycles) {
      const periodLen = getActualPeriodLength(cycle)
      const end = cycle.end_date ? formatDate(cycle.end_date, locale) : labels.ongoing
      const line = `• ${formatDate(cycle.start_date, locale)} — ${end} · ${labels.period}: ${periodLen} ${labels.days}`
      y = ensureSpace(doc, y, margin, 8)
      y = addWrappedText(doc, line, margin, y, contentWidth, 4.5)
      if (cycle.notes) {
        y = addWrappedText(doc, `  ${labels.note}: ${cycle.notes}`, margin + 2, y, contentWidth - 2, 4.5)
      }
    }
    y += 4
  }

  const phasesWithData = phaseCorrelations.filter((p) => p.topItems.length > 0)
  if (phasesWithData.length > 0) {
    y = writeSectionTitle(doc, labels.symptomsByPhase, margin, y)
    doc.setFontSize(9)
    doc.setTextColor(26, 26, 31)

    for (const entry of phasesWithData) {
      const phaseName = labels.phases[entry.phase] || entry.phase
      const items = entry.topItems
        .slice(0, 3)
        .map((item) => `${item.label} (${item.count}x)`)
        .join(', ')
      y = ensureSpace(doc, y, margin, 8)
      y = addWrappedText(doc, `${phaseName}: ${items}`, margin, y, contentWidth, 4.5)
    }
    y += 4
  }

  const recentSymptoms = [...symptoms].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
  if (recentSymptoms.length > 0) {
    y = writeSectionTitle(doc, labels.recentSymptoms, margin, y)
    doc.setFontSize(9)
    doc.setTextColor(26, 26, 31)

    for (const s of recentSymptoms) {
      const { selectedIds, comment } = parseSymptomNotes(s.notes)
      const category = getCategoryLabel(s.symptom_type, lang)
      const options = selectedIds
        .map((id) => getOptionLabel(s.symptom_type, id, lang))
        .filter(Boolean)
        .join(', ')
      let line = `${formatDate(s.date, locale)} · ${category}`
      if (options) line += `: ${options}`
      if (s.intensity) line += ` · ${labels.intensity} ${s.intensity}/3`
      if (comment) line += ` · ${comment}`
      y = ensureSpace(doc, y, margin, 8)
      y = addWrappedText(doc, `• ${line}`, margin, y, contentWidth, 4.5)
    }
    y += 4
  }

  const notesWithContent = dayNotes.filter((n) => n.content).slice(0, 10)
  if (notesWithContent.length > 0) {
    y = writeSectionTitle(doc, labels.dayNotes, margin, y)
    doc.setFontSize(9)
    doc.setTextColor(26, 26, 31)

    for (const note of notesWithContent) {
      y = ensureSpace(doc, y, margin, 8)
      y = addWrappedText(doc, `${formatDate(note.date, locale)}: ${note.content}`, margin, y, contentWidth, 4.5)
    }
    y += 4
  }

  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175)
  y = ensureSpace(doc, Math.min(Math.max(y, 250), PAGE_BOTTOM - 20), margin, 20)
  addWrappedText(doc, labels.disclaimer, margin, y, contentWidth, 3.5)

  const slug = appName.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '') || 'report'
  const datePart = new Date().toISOString().split('T')[0]
  const filename = `${slug}-doctor-report-${datePart}.pdf`

  // Telegram WebView often ignores doc.save() — use blob + share/download fallbacks
  const blob = doc.output('blob')
  return savePdfBlob(blob, filename)
}

/**
 * Save/share PDF in browser and Telegram Mini App environments.
 */
export async function savePdfBlob(blob, filename) {
  const file = new File([blob], filename, { type: 'application/pdf' })

  // 1) Web Share Level 2 (works in many mobile WebViews including some Telegram builds)
  try {
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: filename,
      })
      return 'shared'
    }
  } catch (err) {
    // User cancelled share or unsupported — continue
    if (err?.name === 'AbortError') return 'cancelled'
  }

  const url = URL.createObjectURL(blob)

  // 2) Classic <a download> (desktop + some Android Telegram)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch (err) {
    console.warn('[pdf] anchor download failed', err)
  }

  // 3) Open blob in same/new context so user can "Share" / "Save" from viewer
  try {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null
    // Prefer opening the blob URL; openLink only accepts http(s) remote URLs
    const opened = window.open(url, '_blank')
    if (!opened && tg) {
      // Popup blocked — leave object URL and show no throw; caller shows toast
      console.warn('[pdf] window.open blocked in WebView')
    }
  } catch (err) {
    console.warn('[pdf] open blob failed', err)
  }

  // Revoke later so open/download can finish
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }, 60_000)

  return 'download'
}