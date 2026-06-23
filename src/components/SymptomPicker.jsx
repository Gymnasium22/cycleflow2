import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Check } from 'lucide-react'
import { Spinner } from './Spinner'
import {
  SYMPTOM_CATEGORIES,
  SYMPTOM_CATEGORY_ORDER,
  getCategoryLabel,
  getOptionLabel,
  getOptionEmoji,
} from '../data/symptomCategories'

const categoryColors = {
  mood: 'bg-amber-100 text-amber-600 border-amber-200',
  symptoms: 'bg-rose-100 text-rose-600 border-rose-200',
  sex: 'bg-pink-100 text-pink-600 border-pink-200',
  discharge: 'bg-sky-100 text-sky-600 border-sky-200',
  digestion: 'bg-orange-100 text-orange-600 border-orange-200',
  pregnancy_test: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  ovulation_test: 'bg-violet-100 text-violet-600 border-violet-200',
  activity: 'bg-blue-100 text-blue-600 border-blue-200',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
}

function getSelectedSummary(categoryId, selection, lang) {
  if (!selection?.selectedIds?.length) return ''
  return selection.selectedIds
    .map((id) => `${getOptionEmoji(categoryId, id)} ${getOptionLabel(categoryId, id, lang)}`)
    .join(' · ')
}

export function SymptomPicker({
  isOpen,
  onClose,
  initialSelections = {},
  onSaveCategory,
  onDeleteCategory,
  loading,
  defaultOpenCategory = null,
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'ru' ? 'ru' : 'en'

  const [draft, setDraft] = useState({})
  const [activeCategory, setActiveCategory] = useState(null)
  const [savingCategory, setSavingCategory] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setDraft(JSON.parse(JSON.stringify(initialSelections)))
      setActiveCategory(defaultOpenCategory || SYMPTOM_CATEGORY_ORDER[0])
      setSavingCategory(null)
    }
  }, [isOpen, initialSelections, defaultOpenCategory])

  const toggleOption = useCallback((categoryId, optionId) => {
    setDraft((prev) => {
      const cat = SYMPTOM_CATEGORIES[categoryId]
      const current = prev[categoryId] || { selectedIds: [], intensity: null, comment: '' }
      const selected = new Set(current.selectedIds)

      if (cat.mode === 'single') {
        if (selected.has(optionId)) {
          selected.delete(optionId)
        } else {
          selected.clear()
          selected.add(optionId)
        }
      } else {
        if (selected.has(optionId)) {
          selected.delete(optionId)
        } else {
          selected.add(optionId)
        }
      }

      return {
        ...prev,
        [categoryId]: {
          ...current,
          selectedIds: Array.from(selected),
        },
      }
    })
  }, [])

  const setIntensity = useCallback((categoryId, intensity) => {
    setDraft((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || { selectedIds: [] }),
        intensity,
      },
    }))
  }, [])

  const setComment = useCallback((categoryId, comment) => {
    setDraft((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || { selectedIds: [] }),
        comment,
      },
    }))
  }, [])

  async function handleSaveCategory(categoryId) {
    const selection = draft[categoryId]
    const hasSelection = selection && selection.selectedIds.length > 0

    setSavingCategory(categoryId)
    if (hasSelection) {
      await onSaveCategory(categoryId, selection.selectedIds, selection.intensity, selection.comment || '')
    } else {
      await onDeleteCategory(categoryId)
    }
    setSavingCategory(null)
  }

  const changedCategories = useMemo(() => {
    const changed = new Set()
    for (const categoryId of SYMPTOM_CATEGORY_ORDER) {
      const initial = initialSelections[categoryId] || { selectedIds: [], intensity: null, comment: '' }
      const current = draft[categoryId] || { selectedIds: [], intensity: null, comment: '' }
      const initialIds = initial.selectedIds.slice().sort().join(',')
      const currentIds = current.selectedIds.slice().sort().join(',')
      if (
        initialIds !== currentIds ||
        initial.intensity !== current.intensity ||
        (initial.comment || '') !== (current.comment || '')
      ) {
        changed.add(categoryId)
      }
    }
    return changed
  }, [draft, initialSelections])

  async function handleSaveAll() {
    for (const categoryId of changedCategories) {
      await handleSaveCategory(categoryId)
    }
    onClose()
  }

  if (!isOpen || !activeCategory) return null

  const category = SYMPTOM_CATEGORIES[activeCategory]
  const selection = draft[activeCategory] || { selectedIds: [], intensity: null, comment: '' }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md max-h-[92vh] rounded-t-3xl bg-[var(--tg-theme-bg-color,#ffffff)] flex flex-col animate-slide-in-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--tg-theme-hint-color,#d1d5db)]/20">
          <div>
            <h3 className="text-lg font-bold text-[var(--tg-theme-text-color,#111827)]">
              {lang === 'ru' ? 'Самочувствие' : 'How do you feel?'}
            </h3>
            <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
              {getSelectedSummary(activeCategory, selection, lang) || (lang === 'ru' ? 'Выберите категорию' : 'Select a category')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors"
          >
            <X size={20} className="text-[var(--tg-theme-hint-color,#6b7280)]" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="px-4 pt-3 pb-1 border-b border-[var(--tg-theme-hint-color,#d1d5db)]/10">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {SYMPTOM_CATEGORY_ORDER.map((categoryId) => {
              const cat = SYMPTOM_CATEGORIES[categoryId]
              const Icon = cat.icon
              const isActive = activeCategory === categoryId
              const hasSelection = (draft[categoryId]?.selectedIds?.length || 0) > 0
              const colorClass = categoryColors[categoryId] || 'bg-slate-100 text-slate-600 border-slate-200'

              return (
                <button
                  key={categoryId}
                  onClick={() => setActiveCategory(categoryId)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                    isActive
                      ? `${colorClass} ring-2 ring-offset-1 ring-[var(--tg-theme-button-color,#e11d48)]/30`
                      : hasSelection
                      ? 'bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] border-[var(--tg-theme-hint-color,#d1d5db)]/20'
                      : 'bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-hint-color,#6b7280)] border-[var(--tg-theme-hint-color,#d1d5db)]/20 hover:bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]'
                  }`}
                >
                  <Icon size={14} />
                  <span>{getCategoryLabel(categoryId, lang)}</span>
                  {hasSelection && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--tg-theme-button-color,#e11d48)]" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {category.options.map((option) => {
              const selected = selection.selectedIds.includes(option.id)
              return (
                <button
                  key={option.id}
                  onClick={() => toggleOption(activeCategory, option.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-all border ${
                    selected
                      ? 'bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] border-transparent shadow-sm'
                      : 'bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] border-[var(--tg-theme-hint-color,#d1d5db)]/20 hover:border-[var(--tg-theme-button-color,#e11d48)]/30'
                  }`}
                >
                  <span className="text-lg">{option.emoji}</span>
                  <span className="truncate">{option.labels[lang]}</span>
                  {selected && category.mode === 'multiple' && (
                    <Check size={14} className="ml-auto shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          {category.hasIntensity && selection.selectedIds.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--tg-theme-hint-color,#6b7280)]">
                {lang === 'ru' ? 'Интенсивность' : 'Intensity'}
              </p>
              <div className="flex gap-2">
                {[1, 2, 3].map((level) => {
                  const labels = category.intensityLabels[lang]
                  const active = selection.intensity === level
                  const color = level === 1 ? 'bg-emerald-500' : level === 2 ? 'bg-amber-500' : 'bg-rose-500'
                  return (
                    <button
                      key={level}
                      onClick={() => setIntensity(activeCategory, level)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                        active
                          ? `${color} text-white border-transparent`
                          : 'bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] border-[var(--tg-theme-hint-color,#d1d5db)]/30 hover:border-[var(--tg-theme-button-color,#e11d48)]/30'
                      }`}
                    >
                      {labels[level - 1]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selection.selectedIds.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[var(--tg-theme-hint-color,#6b7280)]">
                {lang === 'ru' ? 'Заметка' : 'Note'}
              </p>
              <textarea
                value={selection.comment || ''}
                onChange={(e) => setComment(activeCategory, e.target.value)}
                placeholder={lang === 'ru' ? 'Особенности...' : 'Details...'}
                rows={2}
                className="w-full px-3 py-2 rounded-xl text-sm border border-[var(--tg-theme-hint-color,#d1d5db)]/30 bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] resize-none focus:outline-none focus:border-[var(--tg-theme-button-color,#e11d48)]"
              />
            </div>
          )}

          <button
            onClick={() => handleSaveCategory(activeCategory)}
            disabled={savingCategory === activeCategory || loading}
            className="w-full py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {savingCategory === activeCategory && <Spinner size={18} />}
            {lang === 'ru' ? 'Сохранить' : 'Save'}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--tg-theme-hint-color,#d1d5db)]/20">
          <button
            onClick={handleSaveAll}
            disabled={changedCategories.size === 0 || loading}
            className="w-full py-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Spinner size={18} />}
            {lang === 'ru' ? `Готово (${changedCategories.size})` : `Done (${changedCategories.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}
