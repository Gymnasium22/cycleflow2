import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Droplets, Sparkles, CalendarDays, X } from 'lucide-react'
import { getPhaseTheme, getSeasonalClass, PHASE_THEMES } from '../utils/phaseTheme'
import { useTelegram } from '../context/TelegramContext'

const PHASE_KEYS = Object.keys(PHASE_THEMES)
const CIRCUMFERENCE = 264
const OUTER_CIRCUMFERENCE = 290

function phaseGradient(phase) {
  return `linear-gradient(135deg, var(--phase-${phase}-start, #E8A0A8), var(--phase-${phase}-end, #C45C6A))`
}

export function CycleRingHero({
  phase,
  displayDay,
  displayDayLabel,
  phaseLabel,
  progressTotal,
  cycleProgress,
  ringCenterPrimary,
  ringCenterSecondary,
  forecast,
  periodAction,
  expandedContent,
  onNavigateToCalendar,
}) {
  const { t } = useTranslation()
  const { hapticFeedback } = useTelegram()
  const cardRef = useRef(null)
  const longPressTimer = useRef(null)
  const [animated, setAnimated] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [phaseHint, setPhaseHint] = useState(null)
  const [bgPhase, setBgPhase] = useState(phase)
  const [fadePhase, setFadePhase] = useState(null)
  const [fadeOpacity, setFadeOpacity] = useState(0)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [phasePulse, setPhasePulse] = useState(false)

  const theme = getPhaseTheme(phase)
  const seasonal = getSeasonalClass()

  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(t)
  }, [displayDay, phase])

  useEffect(() => {
    if (phase === bgPhase) return
    setFadePhase(bgPhase)
    setFadeOpacity(1)
    setBgPhase(phase)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeOpacity(0))
    })
    setPhasePulse(true)
    const fadeTimer = setTimeout(() => setFadePhase(null), 750)
    const pulseTimer = setTimeout(() => setPhasePulse(false), 700)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(fadeTimer)
      clearTimeout(pulseTimer)
    }
  }, [phase, bgPhase])

  const innerOffset = CIRCUMFERENCE - (animated ? ((displayDay || 0) / progressTotal) * CIRCUMFERENCE : CIRCUMFERENCE)
  const outerOffset = OUTER_CIRCUMFERENCE - (animated ? (cycleProgress || 0) * OUTER_CIRCUMFERENCE : OUTER_CIRCUMFERENCE)

  const toggleExpanded = useCallback(() => {
    hapticFeedback.impact('light')
    setExpanded((v) => !v)
  }, [hapticFeedback])

  const toggleLegend = useCallback(() => {
    hapticFeedback.impact('light')
    setShowLegend((v) => !v)
    setPhaseHint(null)
  }, [hapticFeedback])

  const openCalendar = useCallback(() => {
    hapticFeedback.impact('medium')
    onNavigateToCalendar?.()
  }, [hapticFeedback, onNavigateToCalendar])

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleRingTouchStart = useCallback(() => {
    clearLongPress()
    longPressTimer.current = setTimeout(() => {
      hapticFeedback.impact('medium')
      setPhaseHint(phase)
      setShowLegend(true)
      longPressTimer.current = null
    }, 480)
  }, [clearLongPress, hapticFeedback, phase])

  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0]
    const el = cardRef.current
    if (!touch || !el) return
    const rect = el.getBoundingClientRect()
    const px = (touch.clientX - rect.left) / rect.width - 0.5
    const py = (touch.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -8, y: px * 8 })
  }, [])

  const handleTouchEnd = useCallback(() => {
    setTilt({ x: 0, y: 0 })
    clearLongPress()
  }, [clearLongPress])

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-2xl text-white elevation-2 phase-glow phase-${phase} hero-shimmer ${seasonal} ${
        phasePulse ? 'hero-phase-pulse' : ''
      }`}
      style={{
        transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.45s var(--ease-premium)' : 'transform 0.08s linear',
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Phase crossfade layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: phaseGradient(bgPhase) }}
        aria-hidden
      />
      {fadePhase && (
        <div
          className="absolute inset-0 transition-opacity duration-700 ease-premium pointer-events-none"
          style={{ background: phaseGradient(fadePhase), opacity: fadeOpacity }}
          aria-hidden
        />
      )}

      {/* Mesh blobs */}
      <div
        className="absolute -top-8 -right-8 w-44 h-44 rounded-full blur-3xl opacity-70 animate-mesh-drift pointer-events-none"
        style={{ background: theme.meshA }}
      />
      <div
        className="absolute top-1/2 -left-12 w-36 h-36 rounded-full blur-2xl opacity-50 animate-mesh-drift-reverse pointer-events-none"
        style={{ background: theme.meshB }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-28 h-28 rounded-full blur-2xl opacity-40 pointer-events-none"
        style={{ background: theme.meshC }}
      />
      <div className="absolute inset-0 noise-overlay pointer-events-none" />

      <div className="relative z-10 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="label-caps text-white/75">{displayDayLabel}</p>
            <p className="font-display text-7xl font-semibold mt-0.5 tabular-nums leading-none tracking-tight">
              {displayDay}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/18 backdrop-blur-md border border-white/20">
              {phaseLabel}
            </p>
          </div>

          <button
            type="button"
            className="relative w-32 h-32 shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.96] transition-transform"
            onClick={toggleLegend}
            onTouchStart={handleRingTouchStart}
            onTouchEnd={clearLongPress}
            onMouseDown={handleRingTouchStart}
            onMouseUp={clearLongPress}
            onMouseLeave={clearLongPress}
            aria-label={t('home.hero.ringAria')}
          >
            <svg className="w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={OUTER_CIRCUMFERENCE}
                strokeDashoffset={outerOffset}
                className="transition-all duration-[900ms] ease-premium"
              />
              <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="7" />
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="white"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={innerOffset}
                className={`ring-glow transition-all duration-[900ms] ease-premium ${phasePulse ? 'hero-ring-pulse' : ''}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 pointer-events-none">
              <span className="text-[10px] font-medium text-white/70 uppercase tracking-wider leading-tight line-clamp-2">
                {ringCenterPrimary}
              </span>
              <span className="text-sm font-semibold text-white tabular-nums mt-0.5">{ringCenterSecondary}</span>
            </div>
          </button>
        </div>

        {/* Forecast glass chips */}
        {forecast && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-2.5 bg-white/14 backdrop-blur-md border border-white/20 min-w-0">
              <div className="flex items-center gap-1 text-white/80 mb-0.5">
                <Droplets size={12} />
                <span className="text-[10px] font-semibold uppercase tracking-wide truncate">{forecast.period.label}</span>
              </div>
              <p className="text-xs font-bold truncate">{forecast.period.date}</p>
              <p className="text-[11px] text-white/65 mt-0.5 truncate">{forecast.period.until}</p>
            </div>
            <div className="rounded-xl px-3 py-2.5 bg-white/14 backdrop-blur-md border border-white/20 min-w-0">
              <div className="flex items-center gap-1 text-white/80 mb-0.5">
                <Sparkles size={12} />
                <span className="text-[10px] font-semibold uppercase tracking-wide truncate">{forecast.ovulation.label}</span>
              </div>
              <p className="text-xs font-bold truncate">{forecast.ovulation.date}</p>
              <p className="text-[11px] text-white/65 mt-0.5 truncate">{forecast.ovulation.until}</p>
            </div>
          </div>
        )}

        {/* Period action — always visible */}
        {periodAction && <div className="pt-0.5">{periodAction}</div>}

        {/* Phase legend overlay */}
        {showLegend && (
          <div className="rounded-xl bg-black/25 backdrop-blur-md border border-white/20 p-3 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{t('home.hero.phaseLegend')}</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={openCalendar}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
                  aria-label={t('home.hero.openCalendar')}
                >
                  <CalendarDays size={14} />
                </button>
                <button
                  type="button"
                  onClick={toggleLegend}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
                  aria-label={t('common.cancel')}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PHASE_KEYS.map((key) => {
                const isCurrent = key === phase
                return (
                  <div
                    key={key}
                    className={`rounded-lg px-2.5 py-2 text-xs transition-all ${
                      isCurrent ? 'bg-white/28 border border-white/35 font-semibold' : 'bg-white/10 border border-white/10'
                    }`}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                      style={{ background: `var(--phase-${key}-deep)` }}
                    />
                    {t(`home.phase.${key}`)}
                  </div>
                )
              })}
            </div>
            {(phaseHint || showLegend) && (
              <p className="text-xs text-white/75 leading-relaxed border-t border-white/15 pt-2">
                {t(`home.hero.phaseHint.${phaseHint || phase}`)}
              </p>
            )}
          </div>
        )}

        {/* Collapsible details */}
        {expandedContent && (
          <>
            <button
              type="button"
              onClick={toggleExpanded}
              className="w-full flex items-center justify-between gap-2 py-2 px-1 rounded-xl text-xs font-semibold text-white/85 hover:bg-white/10 transition-colors"
            >
              <span>{expanded ? t('home.hero.collapseDetails') : t('home.hero.expandDetails')}</span>
              <ChevronDown size={16} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
            </button>
            <div
              className={`grid transition-all duration-500 ease-premium ${
                expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="pt-1 border-t border-white/18 space-y-3">{expandedContent}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}