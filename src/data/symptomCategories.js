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
      { id: 'cravings', emoji: '🍫', labels: { ru: 'Переедание', en: 'Cravings' } },
    ],
  },
  sex: {
    id: 'sex',
    mode: 'single',
    hasIntensity: false,
    icon: Heart,
    labels: {
      ru: 'Секс',
      en: 'Sex',
    },
    options: [
      { id: 'protected', emoji: '🛡️', labels: { ru: 'Защищённый', en: 'Protected' } },
      { id: 'unprotected', emoji: '💔', labels: { ru: 'Незащищённый', en: 'Unprotected' } },
      { id: 'masturbation', emoji: '✋', labels: { ru: 'Мастурбация', en: 'Masturbation' } },
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
      { id: 'overeating', emoji: '🍔', labels: { ru: 'Переедание', en: 'Overeating' } },
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

export function getCategoryLabel(categoryId, lang = 'ru') {
  return SYMPTOM_CATEGORIES[categoryId]?.labels[lang] || categoryId
}

export function getOptionLabel(categoryId, optionId, lang = 'ru') {
  const option = SYMPTOM_CATEGORIES[categoryId]?.options.find((o) => o.id === optionId)
  return option?.labels[lang] || optionId
}

export function getOptionEmoji(categoryId, optionId) {
  const option = SYMPTOM_CATEGORIES[categoryId]?.options.find((o) => o.id === optionId)
  return option?.emoji || ''
}
