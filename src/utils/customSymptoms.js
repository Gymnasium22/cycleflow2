import { Sparkles } from 'lucide-react'

const STORAGE_KEY = 'cicle_custom_symptoms'
export const CUSTOM_CATEGORY_ID = 'custom'
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

/**
 * Build a SymptomPicker category from user-defined tags so they can be
 * selected, given intensity, saved and shown in "logged today".
 */
export function buildCustomCategory(list = []) {
  const options = (list || [])
    .filter((s) => s?.id && s?.label)
    .map((s) => ({
      id: s.id,
      emoji: s.emoji || '✨',
      labels: {
        ru: s.label,
        en: s.label,
      },
    }))

  return {
    id: CUSTOM_CATEGORY_ID,
    mode: 'multiple',
    hasIntensity: true,
    icon: Sparkles,
    labels: {
      ru: 'Мои теги',
      en: 'My tags',
    },
    intensityLabels: {
      ru: ['Слабо', 'Средне', 'Сильно'],
      en: ['Mild', 'Moderate', 'Severe'],
    },
    options,
  }
}

export function resolveCustomOptionLabel(optionId, list = []) {
  const item = (list || []).find((s) => s.id === optionId)
  return item?.label || optionId
}

export function resolveCustomOptionEmoji(optionId, list = []) {
  const item = (list || []).find((s) => s.id === optionId)
  return item?.emoji || '✨'
}
