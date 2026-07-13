const STORAGE_KEY = 'cicle_partner_share'

/**
 * Partner mode (Premium): local share payload + token.
 * Live remote sync can be added later; link works as startapp deep-link payload.
 */
export function loadPartnerShare() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function savePartnerShare(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearPartnerShare() {
  localStorage.removeItem(STORAGE_KEY)
}

export function generatePartnerToken() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
}

export function buildPartnerSnapshot({ cycles, avgCycle, avgPeriod, nextPeriod, ovulation, phase, streak }) {
  return {
    version: 1,
    updated_at: new Date().toISOString(),
    avg_cycle: avgCycle,
    avg_period: avgPeriod,
    next_period: nextPeriod ? String(nextPeriod).slice(0, 10) : null,
    ovulation: ovulation ? String(ovulation).slice(0, 10) : null,
    phase: phase || null,
    streak: streak || 0,
    cycles_count: cycles?.length || 0,
    // No notes / symptoms for privacy
  }
}
