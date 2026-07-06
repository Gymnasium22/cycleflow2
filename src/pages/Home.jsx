import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Droplets, Sparkles, Calendar, ChevronRight, X, Trash2, Heart, Check, Pill, Settings2 } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SymptomPicker } from '../components/SymptomPicker'
import { MedicationManageModal } from '../components/MedicationManageModal'
import { MedicationWidget } from '../components/MedicationWidget'
import { DayNoteEditor } from '../components/DayNoteEditor'
import { useTelegram } from '../context/TelegramContext'
import { useAuth } from '../context/AuthContext'
import { useCycles, isPeriodActive, getActivePeriodDay, isPeriodOverdue, getActiveCycle } from '../hooks/useCycles'
import { useSymptoms } from '../hooks/useSymptoms'
import { useMedications } from '../hooks/useMedications'

import {
  SYMPTOM_CATEGORIES,
  getCategoryLabel,
  getOptionLabel,
  getOptionEmoji,
} from '../data/symptomCategories'
import {
  getAverageCycleLength,
  getAveragePeriodLength,
  getNextPeriodDateFromHistory,
  getOvulationDateFromHistory,
  getPhaseForDate,
  getCycleDayForDate,
  formatDate,
  getDaysUntil,
  toISODateString,
  getLastCycle,
  isDateInPeriodRange,
  isCycleDelayed,
  getCycleDelayDays,
  shouldSuggestPeriodEnd,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'
import { formatDaysUntilI18n } from '../utils/formatDaysUntil'

const phaseConfig = {
  menstruation: {
    key: 'menstruation',
    gradient: 'from-rose-400 to-rose-600',
    bg: 'bg-rose-500/10',
    text: 'text-rose-600',
  },
  follicular: {
    key: 'follicular',
    gradient: 'from-amber-300 to-amber-500',
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
  },
  ovulation: {
    key: 'ovulation',
    gradient: 'from-violet-400 to-violet-600',
    bg: 'bg-violet-500/10',
    text: 'text-violet-600',
  },
  luteal: {
    key: 'luteal',
    gradient: 'from-teal-400 to-teal-600',
    bg: 'bg-teal-500/10',
    text: 'text-teal-600',
  },
}

const PRIMARY_SYMPTOM_CHIPS = ['mood', 'symptoms', 'sex', 'activity']
const TEST_SYMPTOM_CHIPS = ['ovulation_test', 'pregnancy_test']

export function Home() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const { cycles, addCycle, updateCycle, deleteCycle, isLoading: cyclesLoading } = useCycles()
  const {
    medications,
    loading: medicationsLoading,
    isLoading: medicationsSaving,
    saveMedication,
    deleteMedication,
    toggleReminder,
  } = useMedications()

  const todayStr = useMemo(() => toISODateString(new Date()), [])
  const { symptoms, selections, saveCategorySelection, deleteCategory, isLoading: symptomsLoading } = useSymptoms(todayStr)

  const [showSymptomPicker, setShowSymptomPicker] = useState(false)
  const [symptomPickerCategory, setSymptomPickerCategory] = useState(null)
  const [showMedicationManage, setShowMedicationManage] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, destructive: false })

  const { hapticFeedback } = useTelegram()

  const fallbackCycleLength = profile?.cycle_length || DEFAULT_CYCLE_LENGTH
  const fallbackPeriodLength = profile?.period_length || DEFAULT_PERIOD_LENGTH

  const avgCycleLength = getAverageCycleLength(cycles, fallbackCycleLength)
  const avgPeriodLength = getAveragePeriodLength(cycles, fallbackPeriodLength)

  const lastCycle = getLastCycle(cycles)
  const activeCycle = getActiveCycle(cycles)
  const lastPeriodStart = lastCycle?.start_date || null

  const hasCycles = cycles.length > 0
  const cycleDay = lastPeriodStart ? getCycleDayForDate(new Date(), lastPeriodStart, avgCycleLength) : null
  const phase = hasCycles ? getPhaseForDate(new Date(), cycles, avgCycleLength, avgPeriodLength) : null
  const phaseInfo = phase ? phaseConfig[phase] : null
  const nextPeriod = hasCycles ? getNextPeriodDateFromHistory(cycles, avgCycleLength) : null
  const ovulation = hasCycles ? getOvulationDateFromHistory(cycles, avgCycleLength) : null
  const daysUntilPeriod = nextPeriod ? getDaysUntil(nextPeriod) : null
  const daysUntilOvulation = ovulation ? getDaysUntil(ovulation) : null
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US'

  const periodTrackingOpen = isPeriodActive(activeCycle)
  const inMenstruationToday = activeCycle && isDateInPeriodRange(new Date(), activeCycle, avgPeriodLength)
  const activePeriodDay = periodTrackingOpen ? getActivePeriodDay(activeCycle) : null
  const periodOverdue = isPeriodOverdue(activeCycle, avgPeriodLength)
  const isPeriodStartedToday = activeCycle?.start_date === todayStr
  const displayDay = inMenstruationToday ? activePeriodDay : cycleDay
  const displayDayLabel = inMenstruationToday ? t('home.periodDay') : t('home.dayOfCycle')
  const progressTotal = inMenstruationToday ? avgPeriodLength : avgCycleLength
  const cycleDelayed = hasCycles && isCycleDelayed(cycles, avgCycleLength)
  const cycleDelayDays = cycleDelayed ? getCycleDelayDays(cycles, avgCycleLength) : 0

  function openConfirmDialog({ title, message, confirmText, cancelText, onConfirm, destructive = false }) {
    hapticFeedback.impact('medium')
    setConfirmDialog({ isOpen: true, title, message, confirmText, cancelText, onConfirm, destructive })
  }

  function closeConfirmDialog() {
    setConfirmDialog({ isOpen: false, title: '', message: '', confirmText: '', cancelText: '', onConfirm: null, destructive: false })
  }

  useEffect(() => {
    if (!periodTrackingOpen || !activeCycle) return
    if (!shouldSuggestPeriodEnd(activeCycle, avgPeriodLength)) return

    const promptKey = `cicle_period_end_prompt_${todayStr}`
    if (sessionStorage.getItem(promptKey)) return

    sessionStorage.setItem(promptKey, '1')
    openConfirmDialog({
      title: t('home.periodEndPromptTitle'),
      message: t('home.periodEndPromptMessage', { day: activePeriodDay }),
      confirmText: t('home.periodEndConfirm'),
      cancelText: t('home.periodEndDismiss'),
      onConfirm: async () => {
        closeConfirmDialog()
        await updateCycle(activeCycle.id, { end_date: todayStr })
        hapticFeedback.notification('success')
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodTrackingOpen, activeCycle?.id, activePeriodDay, avgPeriodLength, todayStr])

  async function handleStartPeriod() {
    hapticFeedback.impact('light')
    await addCycle({
      start_date: todayStr,
      period_length: fallbackPeriodLength,
      cycle_length: fallbackCycleLength,
    })
    hapticFeedback.notification('success')
  }

  async function handleEndPeriod() {
    openConfirmDialog({
      title: t('home.dialogs.endPeriodTitle'),
      message: t('home.dialogs.endPeriodMessage'),
      confirmText: t('home.dialogs.endPeriodConfirm'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        closeConfirmDialog()
        await updateCycle(activeCycle.id, { end_date: todayStr })
        hapticFeedback.notification('success')
      },
    })
  }

  async function handleCancelPeriod() {
    openConfirmDialog({
      title: t('home.dialogs.cancelStartTitle'),
      message: t('home.dialogs.cancelStartMessage'),
      confirmText: t('home.dialogs.cancelStartConfirm'),
      cancelText: t('home.dialogs.cancelStartNo'),
      destructive: true,
      onConfirm: async () => {
        closeConfirmDialog()
        await deleteCycle(activeCycle.id)
        hapticFeedback.notification('success')
      },
    })
  }

  function openSymptomPicker(category = null) {
    hapticFeedback.impact('light')
    setSymptomPickerCategory(category)
    setShowSymptomPicker(true)
  }

  async function handleSaveCategory(categoryId, selectedIds, intensity, comment) {
    await saveCategorySelection(categoryId, selectedIds, intensity, comment)
    hapticFeedback.notification('success')
  }

  async function handleDeleteCategory(categoryId) {
    await deleteCategory(categoryId)
    hapticFeedback.notification('success')
  }

  async function handleDeleteSymptomCategory(categoryId) {
    openConfirmDialog({
      title: t('home.dialogs.deleteSymptomTitle'),
      message: t('home.dialogs.deleteSymptomMessage', { category: getCategoryLabel(categoryId, i18n.language) }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        closeConfirmDialog()
        await handleDeleteCategory(categoryId)
      },
    })
  }

  function openMedicationManage() {
    hapticFeedback.impact('light')
    setShowMedicationManage(true)
  }

  function renderSymptomChip(catId) {
    const cat = SYMPTOM_CATEGORIES[catId]
    if (!cat) return null
    const Icon = cat.icon
    return (
      <button
        key={catId}
        onClick={() => openSymptomPicker(catId)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 text-[var(--tg-theme-text-color,#111827)] hover:border-[var(--tg-theme-button-color,#e11d48)]/30 transition-colors"
      >
        <Icon size={14} />
        {getCategoryLabel(catId, i18n.language)}
      </button>
    )
  }

  function renderPeriodButton() {
    if (periodTrackingOpen) {
      return (
        <button
          onClick={handleEndPeriod}
          disabled={cyclesLoading}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-teal-500 text-white font-semibold hover:opacity-90 active:scale-[0.99] transition-all shadow-md shadow-teal-500/15 disabled:opacity-60"
        >
          {cyclesLoading ? <Spinner size={20} /> : <Check size={18} />}
          {t('home.periodEnded')}
        </button>
      )
    }
    if (isPeriodStartedToday) {
      return (
        <button
          onClick={handleCancelPeriod}
          disabled={cyclesLoading}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-red-500/10 hover:text-red-600 border border-[var(--tg-theme-hint-color,#d1d5db)]/30 active:scale-[0.99] transition-all disabled:opacity-60"
        >
          {cyclesLoading ? <Spinner size={20} /> : <X size={18} />}
          {t('home.cancelPeriodStart')}
        </button>
      )
    }
    return (
      <button
        onClick={handleStartPeriod}
        disabled={cyclesLoading || !!activeCycle}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 active:scale-[0.99] transition-all shadow-md shadow-red-500/15 disabled:opacity-60"
      >
        {cyclesLoading ? <Spinner size={20} /> : <Droplets size={18} />}
        {t('home.periodStarted')}
      </button>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('app.title')}</h1>
        <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)] mt-1">
          {formatDate(new Date(), locale)}
        </p>
      </header>

      {hasCycles && phaseInfo ? (
        <>
          <div className={`relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br ${phaseInfo.gradient} shadow-xl`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium uppercase tracking-wider">
                  {displayDayLabel}
                </p>
                <p className="text-6xl font-bold mt-1">{displayDay}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm">
                  {t(`home.phase.${phaseInfo.key}`)}
                </p>
              </div>

              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="white"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${((displayDay || 0) / progressTotal) * 264} 264`}
                    className="drop-shadow-[0_0_8px_rgba(255,255,255,0.75)] transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                  {progressTotal} {t('analytics.days')}
                </div>
              </div>
            </div>

            <div className="relative mt-4 pt-4 border-t border-white/20 space-y-3">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={openMedicationManage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/15 border border-white/25 text-white hover:bg-white/25 transition-colors"
                >
                  <Pill size={14} />
                  {t('todayWidget.manageMedications')}
                  <Settings2 size={12} className="text-white/70" />
                </button>
              </div>
              <MedicationWidget inverted />
              {medications.length === 0 && (
                <p className="text-xs text-white/60 -mt-1">
                  {t('todayWidget.noMedicationsHint')}
                </p>
              )}
              <DayNoteEditor date={todayStr} compact inverted />
            </div>
          </div>

          {renderPeriodButton()}

          {cycleDelayed && (
            <div className="warning-banner-orange rounded-2xl p-4 bg-orange-500/10 border border-orange-500/20 space-y-2">
              <p className="text-sm font-semibold text-orange-800">{t('home.cycleDelayed')}</p>
              <p className="text-sm text-orange-700">{t('home.cycleDelayedHint', { count: cycleDelayDays })}</p>
              <button
                onClick={handleStartPeriod}
                disabled={cyclesLoading || !!activeCycle}
                className="w-full py-2.5 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {t('home.periodStarted')}
              </button>
            </div>
          )}

          <div className="rounded-2xl p-3 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]/80 border border-[var(--tg-theme-hint-color,#d1d5db)]/15 flex">
            <div className="flex-1 px-2 min-w-0">
              <div className="flex items-center gap-1.5 text-rose-600 mb-1">
                <Droplets size={14} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">{t('home.nextPeriod')}</span>
              </div>
              <p className="text-sm font-bold text-[var(--tg-theme-text-color,#111827)] truncate">{formatDate(nextPeriod, locale)}</p>
              <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)] mt-0.5">
                {formatDaysUntilI18n(daysUntilPeriod)}
              </p>
            </div>
            <div className="w-px bg-[var(--tg-theme-hint-color,#d1d5db)]/20 shrink-0" />
            <div className="flex-1 px-2 min-w-0">
              <div className="flex items-center gap-1.5 text-violet-600 mb-1">
                <Sparkles size={14} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">{t('home.ovulation')}</span>
              </div>
              <p className="text-sm font-bold text-[var(--tg-theme-text-color,#111827)] truncate">{formatDate(ovulation, locale)}</p>
              <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)] mt-0.5">
                {formatDaysUntilI18n(daysUntilOvulation)}
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <EmptyState
            icon={Heart}
            title={t('home.noData')}
            description={t('home.noDataHint')}
          />
          {renderPeriodButton()}
        </>
      )}

      {periodOverdue && (
        <p className="text-sm warning-banner-amber text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
          {t('home.periodOverdueHint')}
        </p>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-bold">{t('home.logSymptoms')}</h2>
        <button
          onClick={() => openSymptomPicker()}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]/80 hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 border border-[var(--tg-theme-hint-color,#d1d5db)]/10 shadow-sm transition-all duration-200 active:scale-[0.99] text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white shadow-md">
              <Calendar size={20} />
            </div>
            <div>
              <p className="font-semibold text-[var(--tg-theme-text-color,#111827)]">{t('symptoms.title')}</p>
              <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)]">{t('symptoms.hint')}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-[var(--tg-theme-hint-color,#6b7280)]" />
        </button>

        <div className="flex flex-wrap gap-2">
          {PRIMARY_SYMPTOM_CHIPS.map(renderSymptomChip)}
        </div>
        <div className="flex flex-wrap gap-2">
          {TEST_SYMPTOM_CHIPS.map(renderSymptomChip)}
        </div>

        {symptoms.length > 0 && (
          <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tg-theme-hint-color,#6b7280)]">
              {t('home.loggedToday')}
            </p>
            <div className="flex flex-wrap gap-2">
              {symptoms.map((s) => {
                const parsedNotes = (() => {
                  try {
                    const parsed = JSON.parse(s.notes || '{}')
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
                const labels = parsedNotes.selectedIds.map((id) => `${getOptionEmoji(s.symptom_type, id)} ${getOptionLabel(s.symptom_type, id, i18n.language)}`)
                if (s.intensity) labels.push(`${s.intensity}/3`)
                if (parsedNotes.comment) labels.push(`💬 ${parsedNotes.comment}`)

                return (
                  <div
                    key={s.id}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/30 text-[var(--tg-theme-text-color,#111827)] flex items-center gap-2 group"
                  >
                    <button
                      type="button"
                      onClick={() => openSymptomPicker(s.symptom_type)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                    >
                      <span className="font-semibold shrink-0">{getCategoryLabel(s.symptom_type, i18n.language)}:</span>
                      <span className="truncate max-w-[200px]">{labels.join(' · ') || '—'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSymptomCategory(s.symptom_type)}
                      className="text-red-500 hover:text-red-700 opacity-70 group-hover:opacity-100 transition-opacity p-0.5 shrink-0"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <SymptomPicker
        isOpen={showSymptomPicker}
        onClose={() => {
          setShowSymptomPicker(false)
          setSymptomPickerCategory(null)
        }}
        defaultOpenCategory={symptomPickerCategory}
        initialSelections={selections}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
        loading={symptomsLoading}
      />

      <MedicationManageModal
        isOpen={showMedicationManage}
        onClose={() => setShowMedicationManage(false)}
        medications={medications}
        isLoading={medicationsLoading || medicationsSaving}
        onSaveMedication={saveMedication}
        onDeleteMedication={deleteMedication}
        onToggleReminder={toggleReminder}
      />

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