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

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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

function buildReportHtml({
  cycles,
  symptoms,
  dayNotes,
  profile,
  lang,
  labels,
}) {
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const fallbackCycle = profile?.cycle_length || DEFAULT_CYCLE_LENGTH
  const fallbackPeriod = profile?.period_length || DEFAULT_PERIOD_LENGTH
  const avgCycle = getAverageCycleLength(cycles, fallbackCycle)
  const avgPeriod = getAveragePeriodLength(cycles, fallbackPeriod)
  const regularity = computeRegularity(cycles)
  const phaseCorrelations = getSymptomPhaseCorrelations(symptoms, cycles, avgCycle, avgPeriod, lang)
  const recentCycles = sortCyclesByDateDesc(cycles).slice(0, 12)
  const phasesWithData = phaseCorrelations.filter((p) => p.topItems.length > 0)
  const recentSymptoms = [...symptoms].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
  const notesWithContent = dayNotes.filter((n) => n.content).slice(0, 10)

  const summaryRows = [
    [labels.avgCycle, `${avgCycle} ${labels.days}`],
    [labels.avgPeriod, `${avgPeriod} ${labels.days}`],
    [labels.cyclesCount, String(cycles.length)],
  ]
  if (regularity) {
    summaryRows.push([
      labels.regularity,
      `±${regularity.stdDev} ${labels.days} (${regularity.min}–${regularity.max})`,
    ])
  }

  const cyclesHtml = recentCycles.length
    ? recentCycles
        .map((cycle) => {
          const periodLen = getActualPeriodLength(cycle)
          const end = cycle.end_date ? formatDate(cycle.end_date, locale) : labels.ongoing
          const note = cycle.notes
            ? `<div class="sub">${escapeHtml(labels.note)}: ${escapeHtml(cycle.notes)}</div>`
            : ''
          return `<li><strong>${escapeHtml(formatDate(cycle.start_date, locale))}</strong> — ${escapeHtml(end)} · ${escapeHtml(labels.period)}: ${periodLen} ${escapeHtml(labels.days)}${note}</li>`
        })
        .join('')
    : `<li class="muted">${escapeHtml(labels.noCycles)}</li>`

  const phasesHtml = phasesWithData.length
    ? phasesWithData
        .map((entry) => {
          const phaseName = labels.phases[entry.phase] || entry.phase
          const items = entry.topItems
            .slice(0, 3)
            .map((item) => `${item.emoji} ${escapeHtml(item.label)} (${item.count}×)`)
            .join(', ')
          return `<li><strong>${escapeHtml(phaseName)}</strong>: ${items}</li>`
        })
        .join('')
    : ''

  const symptomsHtml = recentSymptoms.length
    ? recentSymptoms
        .map((s) => {
          const { selectedIds, comment } = parseSymptomNotes(s.notes)
          const category = getCategoryLabel(s.symptom_type, lang)
          const options = selectedIds
            .map((id) => `${getOptionEmoji(s.symptom_type, id)} ${escapeHtml(getOptionLabel(s.symptom_type, id, lang))}`)
            .join(', ')
          const parts = [escapeHtml(formatDate(s.date, locale)), escapeHtml(category)]
          if (options) parts.push(options)
          if (s.intensity) parts.push(`${escapeHtml(labels.intensity)} ${s.intensity}/3`)
          if (comment) parts.push(escapeHtml(comment))
          return `<li>${parts.join(' · ')}</li>`
        })
        .join('')
    : ''

  const notesHtml = notesWithContent.length
    ? notesWithContent
        .map((note) => `<li><strong>${escapeHtml(formatDate(note.date, locale))}</strong>: ${escapeHtml(note.content)}</li>`)
        .join('')
    : ''

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap&subset=cyrillic,cyrillic-ext,latin');
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px;
      color: #1a1a1f;
      font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      background: #fff;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 700;
      color: #8e4a5a;
    }
    .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
    h2 {
      margin: 20px 0 10px;
      font-size: 14px;
      font-weight: 700;
      color: #374151;
      border-bottom: 1px solid #ece8ef;
      padding-bottom: 6px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    td { padding: 6px 0; vertical-align: top; }
    td:first-child { color: #6b7280; width: 46%; padding-right: 12px; }
    td:last-child { font-weight: 600; }
    ul { margin: 0; padding-left: 18px; }
    li { margin-bottom: 8px; }
    li.muted { color: #6b7280; list-style: none; margin-left: -18px; }
    .sub { margin-top: 4px; color: #6b7280; font-size: 12px; font-weight: 400; }
    .disclaimer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #ece8ef;
      color: #9ca3af;
      font-size: 11px;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(labels.title)}</h1>
  <p class="meta">${escapeHtml(labels.generated)}: ${escapeHtml(formatDate(new Date(), locale))}</p>

  <h2>${escapeHtml(labels.summary)}</h2>
  <table>
    ${summaryRows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}
  </table>

  <h2>${escapeHtml(labels.cyclesTable)}</h2>
  <ul>${cyclesHtml}</ul>

  ${phasesHtml ? `<h2>${escapeHtml(labels.symptomsByPhase)}</h2><ul>${phasesHtml}</ul>` : ''}
  ${symptomsHtml ? `<h2>${escapeHtml(labels.recentSymptoms)}</h2><ul>${symptomsHtml}</ul>` : ''}
  ${notesHtml ? `<h2>${escapeHtml(labels.dayNotes)}</h2><ul>${notesHtml}</ul>` : ''}

  <p class="disclaimer">${escapeHtml(labels.disclaimer)}</p>
</body>
</html>`
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
  const html = buildReportHtml({ cycles, symptoms, dayNotes, profile, lang, labels })

  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;pointer-events:none;'
  host.innerHTML = html
  document.body.appendChild(host)

  const sheet = host.querySelector('body') || host

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

    await doc.html(sheet, {
      margin: [12, 14, 14, 14],
      autoPaging: 'text',
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
      },
      width: 182,
      windowWidth: 794,
    })

    const slug = appName.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '') || 'report'
    const datePart = new Date().toISOString().split('T')[0]
    doc.save(`${slug}-doctor-report-${datePart}.pdf`)
  } finally {
    document.body.removeChild(host)
  }
}