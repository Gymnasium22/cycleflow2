import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Check } from 'lucide-react'
import { Spinner } from './Spinner'
import { IntensitySlider } from './IntensitySlider'
import { ModalPortal } from './ModalPortal'
import { CATEGORY_GRADIENTS } from '../utils/phaseTheme'
import {
  SYMPTOM_CATEGORIES,
  SYMPTOM_CATEGORY_ORDER,
  getCategoryLabel,
  getOptionLabel,
  getOptionEmoji,
} from '../data/symptomCategories'
import { CUSTOM_CATEGORY_ID, buildCustomCategory, loadCustomSymptoms } from '../utils/customSymptoms'

function getSelectedSummary(categoryId, selection, lang, categories) {
  if (!selection?.selectedIds?.length) return ''
  return selection.selectedIds
    .map((id) => `${getOptionEmoji(categoryId, id, categories)} ${getOptionLabel(categoryId, id, lang, categories)}`)
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
  /** Optional list of custom tags; if omitted, loads from localStorage */
  customSymptoms: customSymptomsProp = null,
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'ru' ? 'ru' : 'en'

  const customList = useMemo(() => {
    if (Array.isArray(customSymptomsProp)) return customSymptomsProp
    return loadCustomSymptoms()
  }, [customSymptomsProp, isOpen])

  const categories = useMemo(() => {
    const map = { ...SYMPTOM_CATEGORIES }
    if (customList.length > 0) {
      map[CUSTOM_CATEGORY_ID] = buildCustomCategory(customList)
    }
    return map
  }, [customList])

  const categoryOrder = useMemo(() => {
    const order = SYMPTOM_CATEGORY_ORDER.filter((id) => categories[id])
    if (categories[CUSTOM_CATEGORY_ID]?.options?.length) {
      order.push(CUSTOM_CATEGORY_ID)
    }
    return order
  }, [categories])

  const [draft, setDraft] = useState({})
  const [savedBaseline, setSavedBaseline] = useState({})
  const [activeCategory, setActiveCategory] = useState(null)
  const [savingCategory, setSavingCategory] = useState(null)
  const [savedCategory, setSavedCategory] = useState(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const snapshot = JSON.parse(JSON.stringify(initialSelections))
      setDraft(snapshot)
      setSavedBaseline(snapshot)
      const initial =
        defaultOpenCategory && categories[defaultOpenCategory]
          ? defaultOpenCategory
          : categoryOrder[0]
      setActiveCategory(initial)
      setSavingCategory(null)
      setSavedCategory(null)
    }
    wasOpenRef.current = isOpen
  }, [isOpen, defaultOpenCategory, initialSelections, categories, categoryOrder])

  const toggleOption = useCallback((categoryId, optionId) => {
    setDraft((prev) => {
      const cat = categories[categoryId]
      const current = prev[categoryId] || { selectedIds: [], intensity: null, comment: '' }
      const selected = new Set(current.selectedIds)

      if (cat?.mode === 'single') {
        if (selected.has(optionId)) selected.delete(optionId)
        else {
          selected.clear()
          selected.add(optionId)
        }
      } else {
        if (selected.has(optionId)) selected.delete(optionId)
        else selected.add(optionId)
      }

      return { ...prev, [categoryId]: { ...current, selectedIds: Array.from(selected) } }
    })
  }, [categories])

  const setIntensity = useCallback((categoryId, intensity) => {
    setDraft((prev) => ({
      ...prev,
      [categoryId]: { ...(prev[categoryId] || { selectedIds: [] }), intensity },
    }))
  }, [])

  const setComment = useCallback((categoryId, comment) => {
    setDraft((prev) => ({
      ...prev,
      [categoryId]: { ...(prev[categoryId] || { selectedIds: [] }), comment },
    }))
  }, [])

  async function handleSaveCategory(categoryId) {
    const selection = draft[categoryId]
    const hasSelection = selection && selection.selectedIds.length > 0

    setSavingCategory(categoryId)
    if (hasSelection) {
      await onSaveCategory(categoryId, selection.selectedIds, selection.intensity, selection.comment || '')
      setSavedBaseline((prev) => ({
        ...prev,
        [categoryId]: {
          selectedIds: [...selection.selectedIds],
          intensity: selection.intensity,
          comment: selection.comment || '',
        },
      }))
    } else {
      await onDeleteCategory(categoryId)
      setSavedBaseline((prev) => {
        const next = { ...prev }
        delete next[categoryId]
        return next
      })
    }
    setSavingCategory(null)
    setSavedCategory(categoryId)
    setTimeout(() => setSavedCategory((c) => (c === categoryId ? null : c)), 2000)
  }

  const changedCategories = useMemo(() => {
    const changed = new Set()
    for (const categoryId of categoryOrder) {
      const initial = savedBaseline[categoryId] || { selectedIds: [], intensity: null, comment: '' }
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
  }, [draft, savedBaseline, categoryOrder])

  async function handleSaveAll() {
    for (const categoryId of changedCategories) {
      await handleSaveCategory(categoryId)
    }
    onClose()
  }

  if (!isOpen || !activeCategory) return null

  const category = categories[activeCategory]
  if (!category) return null

  const selection = draft[activeCategory] || { selectedIds: [], intensity: null, comment: '' }

  return (
    <ModalPortal onEscape={onClose}>
      <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm">
        <div
          className="w-full max-w-md max-h-[min(92vh,100dvh)] rounded-t-3xl bg-[var(--surface-elevated)] flex flex-col animate-slide-in-bottom elevation-3 mb-0"
          role="dialog"
          aria-modal="true"
          aria-label={t('symptoms.pickerTitle')}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="font-display text-lg font-semibold">{t('symptoms.pickerTitle')}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {getSelectedSummary(activeCategory, selection, lang, categories) ||
                  t('symptoms.selectCategory')}
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-black/5" aria-label={t('common.cancel')}>
              <X size={20} className="text-[var(--text-muted)]" />
            </button>
          </div>

          <div className="px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              {categoryOrder.map((categoryId) => {
                const cat = categories[categoryId]
                if (!cat) return null
                const Icon = cat.icon
                const isActive = activeCategory === categoryId
                const hasSelection = (draft[categoryId]?.selectedIds?.length || 0) > 0
                const grad = CATEGORY_GRADIENTS[categoryId] || 'from-slate-200/80 to-slate-300/60'

                return (
                  <button
                    key={categoryId}
                    type="button"
                    onClick={() => setActiveCategory(categoryId)}
                    className={`snap-start flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                      isActive
                        ? `bg-gradient-to-br ${grad} category-pill-active text-[var(--tg-theme-text-color)] scale-105`
                        : hasSelection
                          ? 'glass-panel text-[var(--tg-theme-text-color)]'
                          : 'text-[var(--text-muted)] hover:bg-black/[0.04]'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{getCategoryLabel(categoryId, lang, categories)}</span>
                    {hasSelection && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--tg-theme-button-color)] animate-bounce-in" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeCategory === CUSTOM_CATEGORY_ID && (
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {t('customSymptoms.pickerHint')}
              </p>
            )}

            {category.options.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-6">
                {t('customSymptoms.empty')}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {category.options.map((option) => {
                  const selected = selection.selectedIds.includes(option.id)
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(activeCategory, option.id)}
                      className={`flex items-center gap-2 p-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
                        selected
                          ? 'symptom-chip-selected animate-bounce-in'
                          : 'card-elevated hover:elevation-2 text-[var(--tg-theme-text-color)]'
                      }`}
                    >
                      <span className="text-lg">{option.emoji}</span>
                      <span className="truncate text-left">{option.labels[lang] || option.labels.en}</span>
                      {selected && category.mode === 'multiple' && (
                        <Check size={14} className="ml-auto shrink-0 opacity-80" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {category.hasIntensity && selection.selectedIds.length > 0 && (
              <div className="space-y-2 card-elevated p-4">
                <p className="label-caps text-[var(--text-muted)]">{t('symptoms.intensity')}</p>
                <IntensitySlider
                  value={selection.intensity || 1}
                  onChange={(level) => setIntensity(activeCategory, level)}
                  labels={category.intensityLabels[lang]}
                />
              </div>
            )}

            {selection.selectedIds.length > 0 && (
              <div className="space-y-1.5">
                <p className="label-caps text-[var(--text-muted)]">{t('symptoms.note')}</p>
                <textarea
                  value={selection.comment || ''}
                  onChange={(e) => setComment(activeCategory, e.target.value)}
                  placeholder={t('symptoms.notePlaceholder')}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-[var(--border-subtle)] bg-[var(--surface-elevated)] resize-none focus:outline-none focus:border-[var(--tg-theme-button-color)]"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSaveCategory(activeCategory)}
              disabled={savingCategory === activeCategory || loading}
              className="w-full py-3.5 rounded-2xl bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 elevation-1"
            >
              {savingCategory === activeCategory && <Spinner size={18} />}
              {savedCategory === activeCategory ? t('common.saved') : t('symptoms.save')}
            </button>
          </div>

          <div className="p-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={changedCategories.size === 0 || loading}
              className="w-full py-3.5 rounded-2xl glass-panel font-semibold hover:elevation-1 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Spinner size={18} />}
              {t('symptoms.done', { count: changedCategories.size })}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
