import { useMemo } from 'react'
import {
  getPhaseForDate,
  getCycleForDate,
  getCycleDayForDate,
  getNextPeriodDateFromHistory,
  getOvulationDateFromHistory,
  getAverageCycleLength,
  getAveragePeriodLength,
  formatDate,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'

const PHASE_CONFIG = {
  ru: {
    menstruation: { label: 'Менструация', emoji: '🩸', color: '#e11d48', bg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)' },
    follicular: { label: 'Фолликулярная фаза', emoji: '☀️', color: '#d97706', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' },
    ovulation: { label: 'Овуляция', emoji: '✨', color: '#7c3aed', bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' },
    luteal: { label: 'Лютеиновая фаза', emoji: '🌙', color: '#0d9488', bg: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)' },
  },
  en: {
    menstruation: { label: 'Menstruation', emoji: '🩸', color: '#e11d48', bg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)' },
    follicular: { label: 'Follicular phase', emoji: '☀️', color: '#d97706', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' },
    ovulation: { label: 'Ovulation', emoji: '✨', color: '#7c3aed', bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' },
    luteal: { label: 'Luteal phase', emoji: '🌙', color: '#0d9488', bg: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)' },
  },
}

export function CycleShareCard({ profile, cycles, lang = 'ru' }) {
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'

  const data = useMemo(() => {
    const today = new Date()
    const fallbackCycleLength = profile?.cycle_length || DEFAULT_CYCLE_LENGTH
    const fallbackPeriodLength = profile?.period_length || DEFAULT_PERIOD_LENGTH
    const avgCycleLength = getAverageCycleLength(cycles, fallbackCycleLength)
    const avgPeriodLength = getAveragePeriodLength(cycles, fallbackPeriodLength)

    const phase = getPhaseForDate(today, cycles, avgCycleLength, avgPeriodLength) || 'follicular'
    const currentCycle = getCycleForDate(today, cycles)
    const cycleLength = currentCycle?.cycle_length || avgCycleLength || DEFAULT_CYCLE_LENGTH
    const cycleDay = currentCycle
      ? getCycleDayForDate(today, currentCycle.start_date, cycleLength)
      : null

    const nextPeriod = getNextPeriodDateFromHistory(cycles, avgCycleLength)
    const ovulation = getOvulationDateFromHistory(cycles, avgCycleLength)

    return {
      phase,
      cycleDay,
      nextPeriod,
      ovulation,
      avgCycleLength,
    }
  }, [profile, cycles])

  const phaseInfo = PHASE_CONFIG[lang][data.phase] || PHASE_CONFIG[lang].follicular

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

  return (
    <div
      style={{
        width: '1080px',
        height: '1080px',
        padding: '80px',
        boxSizing: 'border-box',
        background: phaseInfo.bg,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: phaseInfo.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '28px',
              fontWeight: 700,
            }}
          >
            C
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: '#111827' }}>Cicle</div>
            <div style={{ fontSize: '22px', color: '#6b7280' }}>{labels.fromApp}</div>
          </div>
        </div>
        <div style={{ fontSize: '24px', color: '#6b7280' }}>
          {formatDate(new Date(), locale)}
        </div>
      </div>

      {/* Main */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '160px', lineHeight: 1, marginBottom: '24px' }}>{phaseInfo.emoji}</div>
        <div
          style={{
            fontSize: '52px',
            fontWeight: 800,
            color: phaseInfo.color,
            marginBottom: '16px',
          }}
        >
          {phaseInfo.label}
        </div>
        {data.cycleDay && (
          <div style={{ fontSize: '40px', color: '#374151', fontWeight: 600 }}>
            {data.cycleDay} {labels.day}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '28px',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '22px', color: '#6b7280', marginBottom: '8px' }}>{labels.nextPeriod}</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
            {data.nextPeriod ? formatDate(data.nextPeriod, locale) : '—'}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '28px',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '22px', color: '#6b7280', marginBottom: '8px' }}>{labels.ovulation}</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
            {data.ovulation ? formatDate(data.ovulation, locale) : '—'}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '28px',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '22px', color: '#6b7280', marginBottom: '8px' }}>{labels.avgCycle}</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
            {data.avgCycleLength} {labels.days}
          </div>
        </div>
      </div>
    </div>
  )
}
