/**
 * Pure helpers for settings auto-save (testable without React).
 */

export const DEFAULT_SETTINGS_DRAFT = {
  notify_period: true,
  notify_ovulation: false,
  notify_time: '09:00',
  period_reminder_days: 2,
  ovulation_reminder_days: 1,
}

export function mergeSettingsDraft(base, updates) {
  return {
    ...(base || DEFAULT_SETTINGS_DRAFT),
    ...updates,
  }
}

/**
 * Compare notification-related fields (ignore ids / timestamps).
 */
export function settingsDraftChanged(a, b) {
  if (!a && !b) return false
  if (!a || !b) return true
  const keys = [
    'notify_period',
    'notify_ovulation',
    'notify_time',
    'period_reminder_days',
    'ovulation_reminder_days',
  ]
  return keys.some((k) => a[k] !== b[k])
}

/**
 * Normalize notify_time from DB (may be "09:00:00") to "HH:MM" for inputs.
 */
export function normalizeNotifyTime(time) {
  if (!time || typeof time !== 'string') return '09:00'
  const m = time.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return '09:00'
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

/**
 * Debounce controller used by Settings: schedule save, flush on leave.
 */
export function createDebouncedSaver(saveFn, delayMs = 400) {
  let timer = null
  let pending = null
  let lastSaved = null

  return {
    schedule(payload) {
      pending = payload
      if (timer) clearTimeout(timer)
      timer = setTimeout(async () => {
        const toSave = pending
        pending = null
        timer = null
        if (toSave == null) return
        lastSaved = await saveFn(toSave)
      }, delayMs)
    },
    /** Call on unmount / tab leave — must not cancel the save */
    async flush() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (pending == null) return lastSaved
      const toSave = pending
      pending = null
      lastSaved = await saveFn(toSave)
      return lastSaved
    },
    cancel() {
      if (timer) clearTimeout(timer)
      timer = null
      pending = null
    },
    getPending() {
      return pending
    },
  }
}
