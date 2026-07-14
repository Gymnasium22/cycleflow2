/**
 * Frontend catalog mirroring supabase/functions/_shared/products.ts
 * Keep prices in sync when changing Stars amounts.
 */

export const PRODUCTS = {
  premium_1d: {
    id: 'premium_1d',
    titleKey: 'premium.products.premium_1d.title',
    descKey: 'premium.products.premium_1d.desc',
    stars: 50,
    kind: 'one_time',
    premiumDays: 1,
    badge: 'test',
  },
  premium_1m: {
    id: 'premium_1m',
    titleKey: 'premium.products.premium_1m.title',
    descKey: 'premium.products.premium_1m.desc',
    stars: 250,
    kind: 'one_time',
    premiumDays: 30,
    badge: 'popular',
  },
  premium_3m: {
    id: 'premium_3m',
    titleKey: 'premium.products.premium_3m.title',
    descKey: 'premium.products.premium_3m.desc',
    stars: 600,
    kind: 'one_time',
    premiumDays: 90,
    badge: 'value',
  },
  doctor_report: {
    id: 'doctor_report',
    titleKey: 'premium.products.doctor_report.title',
    descKey: 'premium.products.doctor_report.desc',
    stars: 75,
    kind: 'one_time',
    reportCredits: 1,
  },
}

/** 1-day test first so it is easy to find in the paywall */
export const PREMIUM_PRODUCTS = [PRODUCTS.premium_1d, PRODUCTS.premium_1m, PRODUCTS.premium_3m]

/** Free tier: last N cycles visible in history without Premium */
export const FREE_HISTORY_CYCLE_LIMIT = 6

/** Free tier: doctor PDF uses credits OR active premium */
export function canExportDoctorReport(profile) {
  if (!profile) return false
  if (isPremiumActive(profile)) return true
  return (profile.doctor_report_credits || 0) > 0
}

export function isPremiumActive(profile) {
  if (!profile?.premium_until) return false
  return new Date(profile.premium_until) > new Date()
}

export function premiumDaysLeft(profile) {
  if (!isPremiumActive(profile)) return 0
  const ms = new Date(profile.premium_until) - new Date()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}
