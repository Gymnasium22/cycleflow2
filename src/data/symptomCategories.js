import {
  Smile,
  Activity,
  Heart,
  Droplets,
  Utensils,
  Baby,
  Dna,
  Dumbbell,
  MoreHorizontal,
} from 'lucide-react'

export const SYMPTOM_CATEGORIES = {
  mood: {
    id: 'mood',
    mode: 'single',
    hasIntensity: false,
    icon: Smile,
    labels: {
      ru: 'Настроение',
      en: 'Mood',
    },
    options: [
      { id: 'happy', emoji: '😊', labels: { ru: 'Счастливая', en: 'Happy' } },
      { id: 'calm', emoji: '😌', labels: { ru: 'Спокойная', en: 'Calm' } },
      { id: 'energetic', emoji: '⚡', labels: { ru: 'Энергичная', en: 'Energetic' } },
      { id: 'tired', emoji: '😴', labels: { ru: 'Уставшая', en: 'Tired' } },
      { id: 'irritable', emoji: '😤', labels: { ru: 'Раздражённая', en: 'Irritable' } },
      { id: 'sad', emoji: '😔', labels: { ru: 'Грустная', en: 'Sad' } },
      { id: 'anxious', emoji: '😰', labels: { ru: 'Тревожная', en: 'Anxious' } },
      { id: 'sensitive', emoji: '🥺', labels: { ru: 'Ранимая', en: 'Sensitive' } },
    ],
  },
  symptoms: {
    id: 'symptoms',
    mode: 'multiple',
    hasIntensity: true,
    icon: Activity,
    labels: {
      ru: 'Симптомы',
      en: 'Symptoms',
    },
    intensityLabels: {
      ru: ['Слабо', 'Средне', 'Сильно'],
      en: ['Mild', 'Moderate', 'Severe'],
    },
    options: [
      { id: 'headache', emoji: '🤕', labels: { ru: 'Головная боль', en: 'Headache' } },
      { id: 'cramps', emoji: '😣', labels: { ru: 'Спазмы', en: 'Cramps' } },
      { id: 'bloating', emoji: '🎈', labels: { ru: 'Вздутие', en: 'Bloating' } },
      { id: 'acne', emoji: '🔴', labels: { ru: 'Акне', en: 'Acne' } },
      { id: 'breast_pain', emoji: '🍈', labels: { ru: 'Боль в груди', en: 'Breast pain' } },
      { id: 'back_pain', emoji: '🦴', labels: { ru: 'Боль в пояснице', en: 'Back pain' } },
      { id: 'nausea', emoji: '🤢', labels: { ru: 'Тошнота', en: 'Nausea' } },
      { id: 'dizziness', emoji: '💫', labels: { ru: 'Головокружение', en: 'Dizziness' } },
      { id: 'insomnia', emoji: '🌙', labels: { ru: 'Бессонница', en: 'Insomnia' } },
      { id: 'cravings', emoji: '🍫', labels: { ru: 'Тяга к еде', en: 'Cravings' } },
    ],
  },
  sex: {
    id: 'sex',
    mode: 'multiple',
    hasIntensity: false,
    icon: Heart,
    labels: {
      ru: 'Секс',
      en: 'Sex',
    },
    options: [
      { id: 'protected', emoji: '🛡️', labels: { ru: 'Защищённый', en: 'Protected' } },
      { id: 'unprotected', emoji: '💔', labels: { ru: 'Незащищённый', en: 'Unprotected' } },
      { id: 'oral', emoji: '👄', labels: { ru: 'Оральный', en: 'Oral' } },
      { id: 'anal', emoji: '🍑', labels: { ru: 'Анальный', en: 'Anal' } },
      { id: 'petting', emoji: '💋', labels: { ru: 'Петтинг', en: 'Petting' } },
      { id: 'masturbation', emoji: '✋', labels: { ru: 'Мастурбация', en: 'Masturbation' } },
      { id: 'orgasm', emoji: '✨', labels: { ru: 'Был оргазм', en: 'Had orgasm' } },
      { id: 'no_orgasm', emoji: '⭕', labels: { ru: 'Не было оргазма', en: 'No orgasm' } },
      { id: 'high_libido', emoji: '🔥', labels: { ru: 'Высокое либидо', en: 'High libido' } },
      { id: 'low_libido', emoji: '❄️', labels: { ru: 'Низкое либидо', en: 'Low libido' } },
      { id: 'none', emoji: '🚫', labels: { ru: 'Не было', en: 'None' } },
    ],
  },
  discharge: {
    id: 'discharge',
    mode: 'single',
    hasIntensity: false,
    icon: Droplets,
    labels: {
      ru: 'Выделения',
      en: 'Discharge',
    },
    options: [
      { id: 'none', emoji: '🚫', labels: { ru: 'Нет', en: 'None' } },
      { id: 'spotting', emoji: '🩸', labels: { ru: 'Мажущие', en: 'Spotting' } },
      { id: 'creamy', emoji: '🤍', labels: { ru: 'Светлые', en: 'Creamy' } },
      { id: 'sticky', emoji: '🍯', labels: { ru: 'Липкие', en: 'Sticky' } },
      { id: 'eggwhite', emoji: '🥚', labels: { ru: 'Яичные', en: 'Eggwhite' } },
      { id: 'heavy', emoji: '💧', labels: { ru: 'Обильные', en: 'Heavy' } },
    ],
  },
  digestion: {
    id: 'digestion',
    mode: 'multiple',
    hasIntensity: false,
    icon: Utensils,
    labels: {
      ru: 'Питание и стул',
      en: 'Digestion',
    },
    options: [
      { id: 'sweet_craving', emoji: '🧁', labels: { ru: 'Тяга к сладкому', en: 'Sweet craving' } },
      { id: 'salty_craving', emoji: '🍟', labels: { ru: 'Тяга к солёному', en: 'Salty craving' } },
      { id: 'constipation', emoji: '🚧', labels: { ru: 'Запор', en: 'Constipation' } },
      { id: 'diarrhea', emoji: '💩', labels: { ru: 'Понос', en: 'Diarrhea' } },
      { id: 'appetite_loss', emoji: '🍽️', labels: { ru: 'Потеря аппетита', en: 'Appetite loss' } },
    ],
  },
  pregnancy_test: {
    id: 'pregnancy_test',
    mode: 'single',
    hasIntensity: false,
    icon: Baby,
    labels: {
      ru: 'Тест на беременность',
      en: 'Pregnancy test',
    },
    options: [
      { id: 'negative', emoji: '➖', labels: { ru: 'Отрицательный', en: 'Negative' } },
      { id: 'positive', emoji: '➕', labels: { ru: 'Положительный', en: 'Positive' } },
      { id: 'faint', emoji: '〰️', labels: { ru: 'Слабая полоска', en: 'Faint line' } },
      { id: 'not_taken', emoji: '❓', labels: { ru: 'Не делала', en: 'Not taken' } },
    ],
  },
  ovulation_test: {
    id: 'ovulation_test',
    mode: 'single',
    hasIntensity: false,
    icon: Dna,
    labels: {
      ru: 'Тест на овуляцию',
      en: 'Ovulation test',
    },
    options: [
      { id: 'negative', emoji: '➖', labels: { ru: 'Отрицательный', en: 'Negative' } },
      { id: 'positive', emoji: '➕', labels: { ru: 'Положительный', en: 'Positive' } },
      { id: 'faint', emoji: '〰️', labels: { ru: 'Слабая полоска', en: 'Faint line' } },
      { id: 'not_taken', emoji: '❓', labels: { ru: 'Не делала', en: 'Not taken' } },
    ],
  },
  activity: {
    id: 'activity',
    mode: 'multiple',
    hasIntensity: false,
    icon: Dumbbell,
    labels: {
      ru: 'Активность',
      en: 'Activity',
    },
    options: [
      { id: 'walk', emoji: '🚶', labels: { ru: 'Прогулка', en: 'Walk' } },
      { id: 'run', emoji: '🏃', labels: { ru: 'Бег', en: 'Run' } },
      { id: 'yoga', emoji: '🧘', labels: { ru: 'Йога', en: 'Yoga' } },
      { id: 'gym', emoji: '🏋️', labels: { ru: 'Тренажёрный зал', en: 'Gym' } },
      { id: 'swim', emoji: '🏊', labels: { ru: 'Плавание', en: 'Swim' } },
      { id: 'rest', emoji: '🛋️', labels: { ru: 'Отдых', en: 'Rest' } },
    ],
  },
  other: {
    id: 'other',
    mode: 'multiple',
    hasIntensity: false,
    icon: MoreHorizontal,
    labels: {
      ru: 'Другое',
      en: 'Other',
    },
    options: [
      { id: 'massage', emoji: '💆', labels: { ru: 'Массаж', en: 'Massage' } },
      { id: 'little_sleep', emoji: '😪', labels: { ru: 'Мало спала', en: 'Little sleep' } },
      { id: 'much_sleep', emoji: '😴', labels: { ru: 'Много спала', en: 'Much sleep' } },
      { id: 'stress', emoji: '😫', labels: { ru: 'Стресс', en: 'Stress' } },
      { id: 'travel', emoji: '✈️', labels: { ru: 'Поездка', en: 'Travel' } },
      { id: 'sick', emoji: '🤒', labels: { ru: 'Болела', en: 'Sick' } },
    ],
  },
}

export const SYMPTOM_CATEGORY_ORDER = [
  'mood',
  'symptoms',
  'sex',
  'discharge',
  'digestion',
  'pregnancy_test',
  'ovulation_test',
  'activity',
  'other',
]

const CUSTOM_STORAGE_KEY = 'cicle_custom_symptoms'

function readCustomList() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function findCustomTag(optionId) {
  return readCustomList().find((s) => s.id === optionId) || null
}

/**
 * @param {string} categoryId
 * @param {string} lang
 * @param {Record<string, any>} [categories] — optional merge map (e.g. with custom tags)
 */
export function getCategoryLabel(categoryId, lang = 'ru', categories = SYMPTOM_CATEGORIES) {
  const fromMap = categories[categoryId]?.labels?.[lang] || categories[categoryId]?.labels?.en
  if (fromMap) return fromMap
  if (categoryId === 'custom') return lang === 'ru' ? 'Мои теги' : 'My tags'
  return categoryId
}

export function getOptionLabel(categoryId, optionId, lang = 'ru', categories = SYMPTOM_CATEGORIES) {
  const option = categories[categoryId]?.options?.find((o) => o.id === optionId)
  if (option?.labels?.[lang] || option?.labels?.en) {
    return option.labels[lang] || option.labels.en
  }
  // Custom tags live in localStorage (history/analytics don't pass merged map)
  if (categoryId === 'custom' || String(optionId || '').startsWith('custom_')) {
    const tag = findCustomTag(optionId)
    if (tag?.label) return tag.label
  }
  return optionId
}

export function getOptionEmoji(categoryId, optionId, categories = SYMPTOM_CATEGORIES) {
  const option = categories[categoryId]?.options?.find((o) => o.id === optionId)
  if (option?.emoji) return option.emoji
  if (categoryId === 'custom' || String(optionId || '').startsWith('custom_')) {
    const tag = findCustomTag(optionId)
    if (tag?.emoji) return tag.emoji
  }
  return ''
}

/**
 * Format selected options for history/PDF — prefers labels stored in notes.optionMeta
 * (so custom tags keep readable names even if renamed later).
 */
export function formatSymptomOptionText(symptom, lang = 'ru', categories = SYMPTOM_CATEGORIES) {
  let selectedIds = []
  let optionMeta = null
  try {
    const parsed = JSON.parse(symptom?.notes || '{}')
    if (Array.isArray(parsed)) {
      selectedIds = parsed
    } else {
      selectedIds = Array.isArray(parsed.selectedIds) ? parsed.selectedIds : []
      optionMeta = Array.isArray(parsed.optionMeta) ? parsed.optionMeta : null
    }
  } catch {
    selectedIds = []
  }

  if (optionMeta?.length) {
    return optionMeta
      .map((m) => `${m.emoji || ''} ${m.label || m.id}`.trim())
      .filter(Boolean)
      .join(' · ')
  }

  return selectedIds
    .map(
      (id) =>
        `${getOptionEmoji(symptom.symptom_type, id, categories)} ${getOptionLabel(symptom.symptom_type, id, lang, categories)}`.trim()
    )
    .filter(Boolean)
    .join(' · ')
}
