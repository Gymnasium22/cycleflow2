import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronDown, Check } from 'lucide-react'
import { Spinner } from './Spinner'
import {
  SYMPTOM_CATEGORIES,
  SYMPTOM_CATEGORY_ORDER,
  getCategoryLabel,
  getOptionLabel,
  getOptionEmoji,
} from '../data/symptomCategories'

const categoryColors = {
  mood: 'bg-amber-100 text-amber-600',
  symptoms: 'bg-rose-100 text-rose-600',
  sex: 'bg-pink-100 text-pink-600',
  discharge: 'bg-sky-100 text-sky-600',
  digestion: 'bg-orange-100 text-orange-600',
  pregnancy_test: 'bg-emerald-100 text-emerald-600',
  ovulation_test: 'bg-violet-100 text-violet-600',
  activity: 'bg-blue-100 text-blue-600',
  other: 'bg-slate-100 text-slate-600',
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
  const [openCategory, setOpenCategory] = useState(null)
  const [savingCategory, setSavingCategory] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setDraft(JSON.parse(JSON.stringify(initialSelections)))
      setOpenCategory(defaultOpenCategory)
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

  function handleClose() {
    onClose()
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
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md max-h-[90vh] rounded-t-3xl bg-[var(--tg-theme-bg-color,#ffffff)] flex flex-col animate-slide-in-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--tg-theme-hint-color,#d1d5db)]/20">
          <h3 className="text-lg font-bold text-[var(--tg-theme-text-color,#111827)]">
            {lang === 'ru' ? 'Самочувствие' : 'How do you feel?'}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors"
          >
            <X size={20} className="text-[var(--tg-theme-hint-color,#6b7280)]" />
          </button>
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {SYMPTOM_CATEGORY_ORDER.map((categoryId) => {
            const category = SYMPTOM_CATEGORIES[categoryId]
            const Icon = category.icon
            const isOpenCat = openCategory === categoryId
            const selection = draft[categoryId] || { selectedIds: [], intensity: null }
            const selectedCount = selection.selectedIds.length
            const colorClass = categoryColors[categoryId] || 'bg-slate-100 text-slate-600'

            return (
              <div
                key={categoryId}
                className={`rounded-2xl border transition-all ${
                  isOpenCat
                    ? 'border-[var(--tg-theme-button-color,#e11d48)]/30 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]'
                    : 'border-[var(--tg-theme-hint-color,#d1d5db)]/20 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]'
                }`}
              >
                <button
                  onClick={() => setOpenCategory(isOpenCat ? null : categoryId)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--tg-theme-text-color,#111827)]">
                        {getCategoryLabel(categoryId, lang)}
                      </p>
                      {selectedCount > 0 && (
                        <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
                          {selection.selectedIds
                            .map((id) => `${getOptionEmoji(categoryId, id)} ${getOptionLabel(categoryId, id, lang)}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-[var(--tg-theme-hint-color,#6b7280)] transition-transform ${isOpenCat ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpenCat && (
                  <div className="px-3 pb-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {category.options.map((option) => {
                        const selected = selection.selectedIds.includes(option.id)
                        return (
                          <button
                            key={option.id}
                            onClick={() => toggleOption(categoryId, option.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl text-sm font-medium transition-all border ${
                              selected
                                ? 'bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] border-transparent'
                                : 'bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] border-[var(--tg-theme-hint-color,#d1d5db)]/30 hover:border-[var(--tg-theme-button-color,#e11d48)]/30'
                            }`}
                          >
                            <span className="text-base">{option.emoji}</span>
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
                        <p className="text-xs font-medium text-[var(--tg-theme-hint-color,#6b7280)]">
                          {lang === 'ru' ? 'Интенсивность' : 'Intensity'}
                        </p>
                        <div className="flex gap-2">
                          {[1, 2, 3].map((level) => {
                            const labels = category.intensityLabels[lang]
                            const active = selection.intensity === level
                            const color =
                              level === 1
                                ? 'bg-emerald-500'
                                : level === 2
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            return (
                              <button
                                key={level}
                                onClick={() => setIntensity(categoryId, level)}
                                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${
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
                          onChange={(e) => setComment(categoryId, e.target.value)}
                          placeholder={lang === 'ru' ? 'Особенности этого симптома...' : 'Details about this symptom...'}
                          rows={2}
                          className="w-full px-3 py-2 rounded-xl text-sm border border-[var(--tg-theme-hint-color,#d1d5db)]/30 bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] resize-none focus:outline-none focus:border-[var(--tg-theme-button-color,#e11d48)]"
                        />
                      </div>
                    )}

                    <button
                      onClick={() => handleSaveCategory(categoryId)}
                      disabled={savingCategory === categoryId || loading}
                      className="w-full py-2.5 rounded-xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {savingCategory === categoryId && <Spinner size={16} />}
                      {lang === 'ru' ? 'Сохранить' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--tg-theme-hint-color,#d1d5db)]/20">
          <button
            onClick={handleSaveAll}
            disabled={changedCategories.size === 0 || loading}
            className="w-full py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Spinner size={18} />}
            {lang === 'ru' ? 'Готово' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
