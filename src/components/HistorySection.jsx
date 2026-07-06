import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, X, Calendar, Clock, FileText, ChevronRight } from 'lucide-react'
import { Spinner } from './Spinner'
import { ConfirmDialog } from './ConfirmDialog'
import { SymptomPicker } from './SymptomPicker'
import { useTelegram } from '../context/TelegramContext'
import { useCycles } from '../hooks/useCycles'
import { useSymptoms } from '../hooks/useSymptoms'
import { EmptyState } from './EmptyState'
import { ModalPortal } from './ModalPortal'
import { getCategoryLabel, getOptionLabel, getOptionEmoji } from '../data/symptomCategories'
import {
  formatDate,
  getActualPeriodLength,
  daysBetween,
  toISODateString,
  getLastCycle,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'

export function HistorySection() {
  const { t, i18n } = useTranslation()
  const { cycles, addCycle, updateCycle, deleteCycle, isLoading: cyclesLoading } = useCycles()
  const { hapticFeedback } = useTelegram()
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US'

  const [showCycleModal, setShowCycleModal] = useState(false)
  const [editingCycle, setEditingCycle] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [periodLength, setPeriodLength] = useState(5)
  const [cycleNotes, setCycleNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => toISODateString(new Date()))
  const {
    symptoms: selectedSymptoms,
    selections,
    saveCategorySelection,
    deleteCategory,
    deleteSymptom,
    isLoading: symptomsLoading,
  } = useSymptoms(selectedDate)
  const [showSymptomPicker, setShowSymptomPicker] = useState(false)
  const [symptomPickerCategory, setSymptomPickerCategory] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, destructive: false })

  const fallbackPeriodLength = useMemo(() => {
    return getLastCycle(cycles)?.period_length || DEFAULT_PERIOD_LENGTH
  }, [cycles])

  function openConfirmDialog(opts) {
    hapticFeedback.impact('medium')
    setConfirmDialog({ isOpen: true, ...opts })
  }

  function closeConfirmDialog() {
    setConfirmDialog({ isOpen: false, title: '', message: '', confirmText: '', cancelText: '', onConfirm: null, destructive: false })
  }

  function openAddCycle() {
    hapticFeedback.impact('light')
    setEditingCycle(null)
    setStartDate(toISODateString(new Date()))
    setEndDate('')
    setPeriodLength(fallbackPeriodLength)
    setCycleNotes('')
    setShowCycleModal(true)
  }

  function openEditCycle(cycle) {
    hapticFeedback.impact('light')
    setEditingCycle(cycle)
    setStartDate(cycle.start_date)
    setEndDate(cycle.end_date || '')
    setPeriodLength(cycle.period_length || fallbackPeriodLength)
    setCycleNotes(cycle.notes || '')
    setShowCycleModal(true)
  }

  async function handleSaveCycle() {
    if (!startDate) return
    const payload = {
      start_date: startDate,
      end_date: endDate || null,
      period_length: periodLength,
      notes: cycleNotes.trim() || null,
    }
    if (editingCycle) await updateCycle(editingCycle.id, payload)
    else await addCycle(payload)
    setShowCycleModal(false)
    setEditingCycle(null)
    hapticFeedback.notification('success')
  }

  function handleDeleteCycle(cycle) {
    openConfirmDialog({
      title: t('common.delete'),
      message: t('history.deleteRecordMessage', { date: formatDate(new Date(cycle.start_date), locale) }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        closeConfirmDialog()
        await deleteCycle(cycle.id)
        hapticFeedback.notification('success')
      },
    })
  }

  function openSymptomPicker(category = null) {
    hapticFeedback.impact('light')
    setSymptomPickerCategory(category)
    setShowSymptomPicker(true)
  }

  function handleDeleteSymptom(symptom) {
    openConfirmDialog({
      title: t('common.delete'),
      message: t('history.deleteSymptomMessage', {
        category: getCategoryLabel(symptom.symptom_type, i18n.language),
        date: formatDate(new Date(symptom.date), locale),
      }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        closeConfirmDialog()
        await deleteSymptom(symptom.id)
        hapticFeedback.notification('success')
      },
    })
  }

  const sortedCycles = useMemo(
    () => [...cycles].sort((a, b) => new Date(b.start_date) - new Date(a.start_date)),
    [cycles]
  )

  return (
    <div className="space-y-4">
      <div className="card-elevated p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{t('history.periods')}</p>
          <button onClick={openAddCycle} className="p-2 rounded-xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)]">
            <Plus size={18} />
          </button>
        </div>
        {sortedCycles.length === 0 ? (
          <EmptyState illustration="cycle" title={t('history.noPeriods')} description={t('history.noPeriodsHint')} />
        ) : (
          <div className="space-y-2">
            {sortedCycles.map((cycle) => (
              <div key={cycle.id} className="p-3 rounded-xl glass-panel">
                <div className="flex items-start justify-between">
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-rose-500" />
                      <span className="font-medium">{formatDate(new Date(cycle.start_date), locale)}</span>
                      {cycle.end_date && (
                        <>
                          <ChevronRight size={14} className="text-[var(--tg-theme-hint-color,#6b7280)]" />
                          <span>{formatDate(new Date(cycle.end_date), locale)}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
                      <Clock size={14} />
                      <span>{getActualPeriodLength(cycle)} {t('common.daysShort')}</span>
                      {cycle.end_date && (
                        <span>· {daysBetween(new Date(cycle.start_date), new Date(cycle.end_date)) + 1} {t('history.daysActual')}</span>
                      )}
                    </div>
                    {cycle.notes && (
                      <div className="flex items-start gap-2 mt-2 text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
                        <FileText size={14} className="mt-0.5 shrink-0" />
                        <span>{cycle.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditCycle(cycle)} className="p-2 rounded-lg bg-blue-500/10 text-blue-600"><Pencil size={14} /></button>
                    <button onClick={() => handleDeleteCycle(cycle)} className="p-2 rounded-lg bg-red-500/10 text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-elevated p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-semibold">{t('history.symptomsForDate')}</label>
          <button onClick={() => openSymptomPicker()} className="p-2 rounded-xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)]">
            <Plus size={18} />
          </button>
        </div>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-bg-color,#ffffff)]" />
        {selectedSymptoms.length === 0 ? (
          <EmptyState illustration="wellness" title={t('history.noSymptoms')} description={t('history.noSymptomsHint')} />
        ) : (
          <div className="space-y-2">
            {selectedSymptoms.map((symptom) => {
              const parsed = (() => {
                try {
                  const p = JSON.parse(symptom.notes || '{}')
                  return Array.isArray(p) ? { selectedIds: p, comment: '' } : { selectedIds: p.selectedIds || [], comment: p.comment || '' }
                } catch { return { selectedIds: [], comment: '' } }
              })()
              const optionsText = parsed.selectedIds.map((id) => `${getOptionEmoji(symptom.symptom_type, id)} ${getOptionLabel(symptom.symptom_type, id, i18n.language)}`).join(' · ')
              return (
                <div key={symptom.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-medium">{getCategoryLabel(symptom.symptom_type, i18n.language)}{symptom.intensity ? ` · ${symptom.intensity}/3` : ''}</p>
                    {optionsText && <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)] mt-1">{optionsText}</p>}
                    {parsed.comment && <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)] italic mt-1 truncate">💬 {parsed.comment}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openSymptomPicker(symptom.symptom_type)} className="p-2 rounded-lg bg-blue-500/10 text-blue-600"><Pencil size={14} /></button>
                    <button onClick={() => handleDeleteSymptom(symptom)} className="p-2 rounded-lg bg-red-500/10 text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCycleModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4" onClick={() => setShowCycleModal(false)} role="presentation">
          <div
            className="w-full max-w-md max-h-[min(88vh,720px)] overflow-y-auto rounded-2xl bg-[var(--surface-elevated)] p-6 space-y-4 animate-slide-in-bottom elevation-3 border border-[var(--border-subtle)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingCycle ? t('history.editRecord') : t('history.addRecord')}</h3>
              <button onClick={() => setShowCycleModal(false)} className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20"><X size={20} /></button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('calendar.startDate')}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('calendar.endDate')}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('calendar.expectedDuration')}</label>
              <input type="range" min="2" max="8" value={periodLength} onChange={(e) => setPeriodLength(Number(e.target.value))} className="w-full accent-[var(--tg-theme-button-color,#e11d48)]" />
              <div className="flex justify-between text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
                <span>2</span>
                <span className="font-bold">{periodLength} {t('common.daysShort')}</span>
                <span>8</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('history.notes')}</label>
              <textarea value={cycleNotes} onChange={(e) => setCycleNotes(e.target.value)} placeholder={t('history.notesPlaceholder')} rows={3} className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-sm resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCycleModal(false)} className="flex-1 py-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] font-semibold">{t('common.cancel')}</button>
              <button onClick={handleSaveCycle} disabled={cyclesLoading || !startDate} className="flex-1 py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                {cyclesLoading && <Spinner size={18} />}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      <SymptomPicker isOpen={showSymptomPicker} onClose={() => { setShowSymptomPicker(false); setSymptomPickerCategory(null) }} defaultOpenCategory={symptomPickerCategory} initialSelections={selections} onSaveCategory={async (a, b, c, d) => { await saveCategorySelection(a, b, c, d); hapticFeedback.notification('success') }} onDeleteCategory={async (id) => { await deleteCategory(id); hapticFeedback.notification('success') }} loading={symptomsLoading} />
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} confirmText={confirmDialog.confirmText} cancelText={confirmDialog.cancelText} destructive={confirmDialog.destructive} onConfirm={confirmDialog.onConfirm} onCancel={closeConfirmDialog} />
    </div>
  )
}