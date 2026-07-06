import { useEffect, useState } from 'react'
import { getPhaseTheme, getSeasonalClass } from '../utils/phaseTheme'

const CIRCUMFERENCE = 264
const OUTER_CIRCUMFERENCE = 290

export function CycleRingHero({
  phase,
  displayDay,
  displayDayLabel,
  phaseLabel,
  progressTotal,
  cycleProgress,
  cycleProgressLabel,
  children,
}) {
  const theme = getPhaseTheme(phase)
  const seasonal = getSeasonalClass()
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(t)
  }, [displayDay, phase])

  const innerOffset = CIRCUMFERENCE - (animated ? ((displayDay || 0) / progressTotal) * CIRCUMFERENCE : CIRCUMFERENCE)
  const outerOffset = OUTER_CIRCUMFERENCE - (animated ? (cycleProgress || 0) * OUTER_CIRCUMFERENCE : OUTER_CIRCUMFERENCE)

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 text-white elevation-2 phase-glow phase-${phase} ${seasonal}`}
      style={{
        background: `linear-gradient(135deg, var(--phase-${phase}-start, #E8A0A8), var(--phase-${phase}-end, #C45C6A))`,
      }}
    >
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
      {/* Noise overlay */}
      <div className="absolute inset-0 noise-overlay pointer-events-none" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-white/75">{displayDayLabel}</p>
          <p className="font-display text-7xl font-semibold mt-0.5 tabular-nums leading-none tracking-tight">
            {displayDay}
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-white/18 backdrop-blur-md border border-white/20">
            {phaseLabel}
          </p>
        </div>

        <div className="relative w-32 h-32 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
            {/* Outer ring — cycle position */}
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
            {/* Inner ring — phase progress */}
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
              className="ring-glow transition-all duration-[900ms] ease-premium"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
            <span className="text-[10px] font-medium text-white/70 uppercase tracking-wider leading-tight">
              {cycleProgressLabel}
            </span>
            <span className="text-sm font-semibold text-white tabular-nums">{progressTotal}</span>
          </div>
        </div>
      </div>

      {children && (
        <div className="relative mt-4 pt-4 border-t border-white/18 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}