const STORAGE_KEY = 'cicle_custom_symptoms'
export const MAX_CUSTOM_SYMPTOMS_FREE = 0
export const MAX_CUSTOM_SYMPTOMS_PREMIUM = 20

export function loadCustomSymptoms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveCustomSymptoms(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []))
}

export function createCustomSymptom({ label, emoji = '✨' }) {
  const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    emoji: emoji || '✨',
    label: (label || '').trim().slice(0, 40),
    created_at: new Date().toISOString(),
  }
}
