import {
  getPhaseForDate,
  getCycleForDate,
  getCycleDayForDate,
  getNextPeriodDateFromHistory,
  getOvulationDateFromHistory,
  getAverageCycleLength,
  getAveragePeriodLength,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from './cycle'

const PHASE_CONFIG = {
  ru: {
    menstruation: { label: 'Менструация', emoji: '🩸', color: '#e11d48', bgFrom: '#fff1f2', bgTo: '#ffe4e6' },
    follicular: { label: 'Фолликулярная фаза', emoji: '☀️', color: '#d97706', bgFrom: '#fffbeb', bgTo: '#fef3c7' },
    ovulation: { label: 'Овуляция', emoji: '✨', color: '#7c3aed', bgFrom: '#f5f3ff', bgTo: '#ede9fe' },
    luteal: { label: 'Лютеиновая фаза', emoji: '🌙', color: '#0d9488', bgFrom: '#f0fdfa', bgTo: '#ccfbf1' },
  },
  en: {
    menstruation: { label: 'Menstruation', emoji: '🩸', color: '#e11d48', bgFrom: '#fff1f2', bgTo: '#ffe4e6' },
    follicular: { label: 'Follicular phase', emoji: '☀️', color: '#d97706', bgFrom: '#fffbeb', bgTo: '#fef3c7' },
    ovulation: { label: 'Ovulation', emoji: '✨', color: '#7c3aed', bgFrom: '#f5f3ff', bgTo: '#ede9fe' },
    luteal: { label: 'Luteal phase', emoji: '🌙', color: '#0d9488', bgFrom: '#f0fdfa', bgTo: '#ccfbf1' },
  },
}

function formatCardDate(date, locale) {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const width = ctx.measureText(currentLine + ' ' + word).width
    if (width < maxWidth) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  lines.push(currentLine)
  return lines
}

export function drawForecastCard(canvas, { profile, cycles, lang = 'ru' }) {
  const ctx = canvas.getContext('2d')
  const size = 1080
  canvas.width = size
  canvas.height = size

  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const today = new Date()

  const fallbackCycleLength = profile?.cycle_length || DEFAULT_CYCLE_LENGTH
  const fallbackPeriodLength = profile?.period_length || DEFAULT_PERIOD_LENGTH
  const avgCycleLength = getAverageCycleLength(cycles, fallbackCycleLength)
  const avgPeriodLength = getAveragePeriodLength(cycles, fallbackPeriodLength)

  const phase = getPhaseForDate(today, cycles, avgCycleLength, avgPeriodLength) || 'follicular'
  const currentCycle = getCycleForDate(today, cycles)
  const cycleLength = currentCycle?.cycle_length || avgCycleLength || DEFAULT_CYCLE_LENGTH
  const cycleDay = currentCycle ? getCycleDayForDate(today, currentCycle.start_date, cycleLength) : null

  const nextPeriod = getNextPeriodDateFromHistory(cycles, avgCycleLength)
  const ovulation = getOvulationDateFromHistory(cycles, avgCycleLength)

  const phaseInfo = PHASE_CONFIG[lang][phase] || PHASE_CONFIG[lang].follicular

  const labels = {
    ru: {
      day: 'день цикла',
      nextPeriod: 'Следующие месячные',
      ovulation: 'Овуляция',
      avgCycle: 'Средний цикл',
      days: 'дн.',
      fromApp: 'из приложения Cicle',
    },
    en: {
      day: 'cycle day',
      nextPeriod: 'Next period',
      ovulation: 'Ovulation',
      avgCycle: 'Average cycle',
      days: 'days',
      fromApp: 'from Cicle app',
    },
  }[lang]

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, phaseInfo.bgFrom)
  gradient.addColorStop(1, phaseInfo.bgTo)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  // Header
  const padding = 80
  const logoSize = 56
  const logoRadius = 16

  // Logo circle
  ctx.fillStyle = phaseInfo.color
  roundRect(ctx, padding, padding, logoSize, logoSize, logoRadius)
  ctx.fill()

  // Logo letter
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 28px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('C', padding + logoSize / 2, padding + logoSize / 2 + 2)

  // App name
  ctx.fillStyle = '#111827'
  ctx.textAlign = 'left'
  ctx.font = '800 36px system-ui, -apple-system, sans-serif'
  ctx.fillText('Cicle', padding + logoSize + 16, padding + 28)

  ctx.fillStyle = '#6b7280'
  ctx.font = '400 22px system-ui, -apple-system, sans-serif'
  ctx.fillText(labels.fromApp, padding + logoSize + 16, padding + 54)

  // Date
  ctx.textAlign = 'right'
  ctx.fillStyle = '#6b7280'
  ctx.font = '400 24px system-ui, -apple-system, sans-serif'
  ctx.fillText(formatCardDate(today, locale), size - padding, padding + 36)

  // Main content
  const centerY = size / 2 - 40

  // Emoji
  ctx.textAlign = 'center'
  ctx.font = '140px system-ui, -apple-system, sans-serif'
  ctx.fillText(phaseInfo.emoji, size / 2, centerY - 40)

  // Phase label
  ctx.fillStyle = phaseInfo.color
  ctx.font = '800 52px system-ui, -apple-system, sans-serif'
  const phaseLines = wrapText(ctx, phaseInfo.label, size - padding * 2)
  let phaseY = centerY + 80
  phaseLines.forEach((line) => {
    ctx.fillText(line, size / 2, phaseY)
    phaseY += 64
  })

  // Cycle day
  if (cycleDay) {
    ctx.fillStyle = '#374151'
    ctx.font = '600 40px system-ui, -apple-system, sans-serif'
    ctx.fillText(`${cycleDay} ${labels.day}`, size / 2, phaseY + 30)
  }

  // Footer cards
  const cardY = size - padding - 220
  const cardWidth = (size - padding * 2 - 48) / 3
  const cardHeight = 220
  const cardRadius = 28

  const footerItems = [
    { label: labels.nextPeriod, value: formatCardDate(nextPeriod, locale) },
    { label: labels.ovulation, value: formatCardDate(ovulation, locale) },
    { label: labels.avgCycle, value: `${avgCycleLength} ${labels.days}` },
  ]

  footerItems.forEach((item, index) => {
    const x = padding + index * (cardWidth + 24)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    roundRect(ctx, x, cardY, cardWidth, cardHeight, cardRadius)
    ctx.fill()

    ctx.fillStyle = '#6b7280'
    ctx.font = '400 22px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'

    const labelLines = wrapText(ctx, item.label, cardWidth - 32)
    let labelY = cardY + 50
    labelLines.forEach((line) => {
      ctx.fillText(line, x + cardWidth / 2, labelY)
      labelY += 28
    })

    ctx.fillStyle = '#111827'
    ctx.font = '700 32px system-ui, -apple-system, sans-serif'
    const valueLines = wrapText(ctx, item.value, cardWidth - 32)
    let valueY = cardY + 130
    valueLines.forEach((line) => {
      ctx.fillText(line, x + cardWidth / 2, valueY)
      valueY += 40
    })
  })

  return canvas
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}
