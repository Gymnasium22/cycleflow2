/** Line-art illustrations for premium empty states & onboarding */

export function CycleRingIllustration({ className = 'w-40 h-40' }) {
  return (
    <svg className={className} viewBox="0 0 160 160" fill="none" aria-hidden>
      <circle cx="80" cy="80" r="58" stroke="url(#ringGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray="280 80" className="animate-ring-draw" />
      <circle cx="80" cy="80" r="42" stroke="rgba(196,92,106,0.35)" strokeWidth="3" strokeDasharray="8 6" />
      <circle cx="80" cy="80" r="70" fill="url(#glowGrad)" opacity="0.35" />
      <text x="80" y="88" textAnchor="middle" className="fill-[var(--tg-theme-button-color,#e11d48)]" fontSize="28" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="700">12</text>
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="160" y2="160">
          <stop stopColor="#E8A0A8" />
          <stop offset="0.5" stopColor="#A78BFA" />
          <stop offset="1" stopColor="#6BB8A8" />
        </linearGradient>
        <radialGradient id="glowGrad">
          <stop stopColor="#f43f5e" stopOpacity="0.2" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
    </svg>
  )
}

export function CalendarIllustration({ className = 'w-36 h-36' }) {
  return (
    <svg className={className} viewBox="0 0 144 144" fill="none" aria-hidden>
      <rect x="24" y="32" width="96" height="88" rx="14" fill="var(--surface-elevated)" stroke="var(--border-subtle)" strokeWidth="1.5" />
      <rect x="24" y="32" width="96" height="24" rx="14" fill="url(#calHeader)" />
      <rect x="24" y="44" width="96" height="12" fill="url(#calHeader)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={40 + (i % 3) * 28} cy={72 + Math.floor(i / 3) * 22} r="5" fill={i === 2 ? 'var(--phase-menstruation-deep)' : 'var(--text-muted)'} opacity={i === 2 ? 1 : 0.35} />
      ))}
      <circle cx="96" cy="94" r="8" stroke="var(--phase-ovulation-deep)" strokeWidth="2" fill="none" opacity="0.7" />
      <defs>
        <linearGradient id="calHeader" x1="24" y1="32" x2="120" y2="56">
          <stop stopColor="#E8A0A8" />
          <stop offset="1" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function WellnessIllustration({ className = 'w-36 h-36' }) {
  return (
    <svg className={className} viewBox="0 0 144 144" fill="none" aria-hidden>
      <path d="M72 28 C72 28 48 52 48 72 C48 86 58 96 72 96 C86 96 96 86 96 72 C96 52 72 28 72 28Z" fill="url(#heartGrad)" opacity="0.85" />
      <path d="M40 100 Q72 120 104 100" stroke="var(--phase-luteal-deep)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
      <circle cx="56" cy="68" r="4" fill="white" opacity="0.6" />
      <defs>
        <linearGradient id="heartGrad" x1="48" y1="28" x2="96" y2="96">
          <stop stopColor="#E8A0A8" />
          <stop offset="1" stopColor="#C45C6A" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function AnalyticsIllustration({ className = 'w-36 h-36' }) {
  return (
    <svg className={className} viewBox="0 0 144 144" fill="none" aria-hidden>
      <rect x="28" y="88" width="16" height="32" rx="6" fill="var(--phase-menstruation)" opacity="0.7" />
      <rect x="52" y="64" width="16" height="56" rx="6" fill="var(--phase-ovulation)" opacity="0.7" />
      <rect x="76" y="48" width="16" height="72" rx="6" fill="var(--phase-luteal)" opacity="0.7" />
      <rect x="100" y="72" width="16" height="48" rx="6" fill="var(--phase-follicular)" opacity="0.7" />
      <path d="M36 40 L72 24 L108 40" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}