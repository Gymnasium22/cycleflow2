import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, X, Calendar, Clock, FileText, ChevronRight, ClipboardList, FileX } from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useTelegram } from '../context/TelegramContext'
import { useCycles } from '../hooks/useCycles'
import { useSymptoms } from '../hooks/useSymptoms'
import { EmptyState } from '../components/EmptyState'
import {
  getCategoryLabel,
  getOptionLabel,
  getOptionEmoji,
} from '../data/symptomCategories'
import {
  formatDate,
  getActualPeriodLength,
  daysBetween,
  toISODateString,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'

export function History() {
  const { i18n } = useTranslation()
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
  const { symptoms: selectedSymptoms, deleteSymptom } = useSymptoms(selectedDate)

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, destructive: false })

  const fallbackPeriodLength = useMemo(() => {
    const last = cycles[0]
    return last?.period_length || DEFAULT_PERIOD_LENGTH
  }, [cycles])

  function openConfirmDialog({ title, message, confirmText, cancelText, onConfirm, destructive = false }) {
    hapticFeedback.impact('medium')
    setConfirmDialog({ isOpen: true, title, message, confirmText, cancelText, onConfirm, destructive })
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

    if (editingCycle) {
      await updateCycle(editingCycle.id, payload)
    } else {
      await addCycle(payload)
    }

    setShowCycleModal(false)
    setEditingCycle(null)
    hapticFeedback.notification('success')
  }

  function handleDeleteCycle(cycle) {
    openConfirmDialog({
      title: i18n.language === 'ru' ? 'Удалить запись' : 'Delete record',
      message: i18n.language === 'ru'
        ? `Удалить запись от ${formatDate(new Date(cycle.start_date), locale)}?`
        : `Delete record from ${formatDate(new Date(cycle.start_date), locale)}?`,
      confirmText: i18n.language === 'ru' ? 'Удалить' : 'Delete',
      cancelText: i18n.language === 'ru' ? 'Отмена' : 'Cancel',
      destructive: true,
      onConfirm: async () => {
        closeConfirmDialog()
        await deleteCycle(cycle.id)
        hapticFeedback.notification('success')
      },
    })
  }

  function handleDeleteSymptom(symptom) {
    const categoryName = getCategoryLabel(symptom.symptom_type, i18n.language)
    openConfirmDialog({
      title: i18n.language === 'ru' ? 'Удалить запись' : 'Delete record',
      message: i18n.language === 'ru'
        ? `Удалить запись «${categoryName}» за ${formatDate(new Date(symptom.date), locale)}?`
        : `Delete «${categoryName}» record for ${formatDate(new Date(symptom.date), locale)}?`,
      confirmText: i18n.language === 'ru' ? 'Удалить' : 'Delete',
      cancelText: i18n.language === 'ru' ? 'Отмена' : 'Cancel',
      destructive: true,
      onConfirm: async () => {
        closeConfirmDialog()
        await deleteSymptom(symptom.id)
        hapticFeedback.notification('success')
      },
    })
  }

  const sortedCycles = useMemo(() => {
    return [...cycles].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
  }, [cycles])

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {i18n.language === 'ru' ? 'История' : 'History'}
        </h1>
        <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)] mt-1">
          {i18n.language === 'ru' ? 'Все записи о циклах и самочувствии' : 'All cycle and symptom records'}
        </p>
      </header>

      {/* Period history */}
      <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--tg-theme-text-color,#111827)]">
            {i18n.language === 'ru' ? 'Менструации' : 'Periods'}
          </p>
          <button
            onClick={openAddCycle}
            className="p-2 rounded-xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] hover:opacity-90"
          >
            <Plus size={18} />
          </button>
        </div>

        {sortedCycles.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={i18n.language === 'ru' ? 'Пока нет записей' : 'No records yet'}
            description={i18n.language === 'ru'
              ? 'Здесь будет история ваших циклов. Нажмите +, чтобы добавить первый.'
              : 'Your cycle history will appear here. Tap + to add the first one.'}
          />
        ) : (
          <div className="space-y-2">
            {sortedCycles.map((cycle) => (
              <div
                key={cycle.id}
                className="p-3 rounded-xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-rose-500" />
                      <span className="font-medium text-[var(--tg-theme-text-color,#111827)]">
                        {formatDate(new Date(cycle.start_date), locale)}
                      </span>
                      {cycle.end_date && (
                        <>
                          <ChevronRight size={14} className="text-[var(--tg-theme-hint-color,#6b7280)]" />
                          <span className="text-[var(--tg-theme-text-color,#111827)]">
                            {formatDate(new Date(cycle.end_date), locale)}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
                      <Clock size={14} />
                      <span>
                        {getActualPeriodLength(cycle)} {i18n.language === 'ru' ? 'дн.' : 'days'}
                      </span>
                      {cycle.end_date && (
                        <span>
                          · {daysBetween(new Date(cycle.start_date), new Date(cycle.end_date)) + 1} {i18n.language === 'ru' ? 'дн. фактически' : 'days actual'}
                        </span>
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
                    <button
                      onClick={() => openEditCycle(cycle)}
                      className="p-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteCycle(cycle)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Symptom history */}
      <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--tg-theme-text-color,#111827)]">
            {i18n.language === 'ru' ? 'Симптомы за дату' : 'Symptoms for date'}
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-bg-color,#ffffff)]"
          />
        </div>

        {selectedSymptoms.length === 0 ? (
          <EmptyState
            icon={FileX}
            title={i18n.language === 'ru' ? 'Нет записей' : 'No records'}
            description={i18n.language === 'ru'
              ? 'За выбранную дату нет симптомов. Добавьте их на главной странице.'
              : 'No symptoms logged for this date. Add them from the home page.'}
          />
        ) : (
          <div className="space-y-2">
            {selectedSymptoms.map((symptom) => {
              const parsedNotes = (() => {
                try {
                  const parsed = JSON.parse(symptom.notes || '{}')
                  if (Array.isArray(parsed)) {
                    return { selectedIds: parsed, comment: '' }
                  }
                  return {
                    selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds : [],
                    comment: parsed.comment || '',
                  }
                } catch {
                  return { selectedIds: [], comment: '' }
                }
              })()
              const selectedIds = parsedNotes.selectedIds
              const comment = parsedNotes.comment

              const optionsText = selectedIds
                .map((id) => `${getOptionEmoji(symptom.symptom_type, id)} ${getOptionLabel(symptom.symptom_type, id, i18n.language)}`)
                .join(' · ')
              return (
                <div
                  key={symptom.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">
                      {getCategoryLabel(symptom.symptom_type, i18n.language)}
                      {symptom.intensity ? ` · ${symptom.intensity}/3` : ''}
                    </p>
                    {optionsText && (
                      <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)] mt-1">{optionsText}</p>
                    )}
                    {comment && (
                      <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)] font-medium italic mt-1 truncate">
                        💬 {comment}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSymptom(symptom)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cycle modal */}
      {showCycleModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-[var(--tg-theme-bg-color,#ffffff)] p-6 space-y-4 animate-slide-in-bottom">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingCycle
                  ? (i18n.language === 'ru' ? 'Изменить запись' : 'Edit record')
                  : (i18n.language === 'ru' ? 'Добавить запись' : 'Add record')}
              </h3>
              <button onClick={() => setShowCycleModal(false)} className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">
                {i18n.language === 'ru' ? 'Дата начала' : 'Start date'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">
                {i18n.language === 'ru' ? 'Дата окончания' : 'End date'}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">
                {i18n.language === 'ru' ? 'Ожидаемая длительность' : 'Expected duration'}
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={periodLength}
                onChange={(e) => setPeriodLength(Number(e.target.value))}
                className="w-full accent-[var(--tg-theme-button-color,#e11d48)]"
              />
              <div className="flex justify-between text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
                <span>2</span>
                <span className="font-bold text-[var(--tg-theme-text-color,#111827)]">{periodLength} {i18n.language === 'ru' ? 'дн.' : 'days'}</span>
                <span>8</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">
                {i18n.language === 'ru' ? 'Заметки' : 'Notes'}
              </label>
              <textarea
                value={cycleNotes}
                onChange={(e) => setCycleNotes(e.target.value)}
                placeholder={i18n.language === 'ru' ? 'Особенности этого цикла...' : 'Notes about this cycle...'}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-sm resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCycleModal(false)}
                className="flex-1 py-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:opacity-75"
              >
                {i18n.language === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveCycle}
                disabled={cyclesLoading || !startDate}
                className="flex-1 py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {cyclesLoading && <Spinner size={18} />}
                {i18n.language === 'ru' ? 'Сохранить' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        destructive={confirmDialog.destructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
      />
    </div>
  )
}
