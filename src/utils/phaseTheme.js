/** Premium phase palette — dusty, muted tones for 2026/27 */
export const PHASE_THEMES = {
  menstruation: {
    key: 'menstruation',
    gradient: 'from-[#E8A0A8] via-[#D4788A] to-[#C45C6A]',
    meshA: 'rgba(255,200,210,0.45)',
    meshB: 'rgba(196,92,106,0.35)',
    meshC: 'rgba(255,240,245,0.25)',
    glow: 'rgba(232,160,168,0.55)',
    text: 'text-[var(--phase-menstruation-deep)]',
    bg: 'bg-[var(--phase-menstruation)]/12',
    ring: 'var(--phase-menstruation-deep)',
    calendarRing: 'ring-[var(--phase-menstruation)]',
    todayGlow: 'shadow-[0_0_12px_rgba(232,160,168,0.55)]',
  },
  follicular: {
    key: 'follicular',
    gradient: 'from-[#F5D9A8] via-[#E8C078] to-[#D4A84A]',
    meshA: 'rgba(255,230,180,0.4)',
    meshB: 'rgba(212,168,74,0.3)',
    meshC: 'rgba(255,248,235,0.2)',
    glow: 'rgba(245,217,168,0.5)',
    text: 'text-[var(--phase-follicular-deep)]',
    bg: 'bg-[var(--phase-follicular)]/12',
    ring: 'var(--phase-follicular-deep)',
    calendarRing: 'ring-[var(--phase-follicular)]',
    todayGlow: 'shadow-[0_0_12px_rgba(245,217,168,0.5)]',
  },
  ovulation: {
    key: 'ovulation',
    gradient: 'from-[#C4B5FD] via-[#A78BFA] to-[#8B6FE0]',
    meshA: 'rgba(196,181,253,0.45)',
    meshB: 'rgba(139,111,224,0.35)',
    meshC: 'rgba(240,235,255,0.25)',
    glow: 'rgba(167,139,250,0.55)',
    text: 'text-[var(--phase-ovulation-deep)]',
    bg: 'bg-[var(--phase-ovulation)]/12',
    ring: 'var(--phase-ovulation-deep)',
    calendarRing: 'ring-[var(--phase-ovulation)]',
    todayGlow: 'shadow-[0_0_12px_rgba(167,139,250,0.55)]',
  },
  luteal: {
    key: 'luteal',
    gradient: 'from-[#9DD4C4] via-[#6BB8A8] to-[#4A9A88]',
    meshA: 'rgba(157,212,196,0.4)',
    meshB: 'rgba(74,154,136,0.3)',
    meshC: 'rgba(235,250,245,0.2)',
    glow: 'rgba(107,184,168,0.5)',
    text: 'text-[var(--phase-luteal-deep)]',
    bg: 'bg-[var(--phase-luteal)]/12',
    ring: 'var(--phase-luteal-deep)',
    calendarRing: 'ring-[var(--phase-luteal)]',
    todayGlow: 'shadow-[0_0_12px_rgba(107,184,168,0.5)]',
  },
}

const SEASONAL_SHIFT = {
  winter: { months: [11, 0, 1], lutealCool: 0.08 },
  summer: { months: [5, 6, 7], follicularWarm: 0.06 },
}

export function getPhaseTheme(phase) {
  return PHASE_THEMES[phase] || PHASE_THEMES.follicular
}

/** Subtle seasonal tint on hero card (item 12) */
export function getSeasonalClass() {
  const month = new Date().getMonth()
  if (SEASONAL_SHIFT.winter.months.includes(month)) return 'season-winter'
  if (SEASONAL_SHIFT.summer.months.includes(month)) return 'season-summer'
  return ''
}

export const CATEGORY_GRADIENTS = {
  mood: 'from-amber-200/80 to-amber-400/60',
  symptoms: 'from-rose-200/80 to-rose-400/60',
  sex: 'from-pink-200/80 to-pink-400/60',
  discharge: 'from-sky-200/80 to-sky-400/60',
  digestion: 'from-orange-200/80 to-orange-400/60',
  pregnancy_test: 'from-emerald-200/80 to-emerald-400/60',
  ovulation_test: 'from-violet-200/80 to-violet-400/60',
  activity: 'from-blue-200/80 to-blue-400/60',
  other: 'from-slate-200/80 to-slate-400/60',
}