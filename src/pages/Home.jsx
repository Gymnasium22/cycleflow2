import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Droplets, Calendar, ChevronRight, X, Trash2, Check, Pill, Settings2, Crown } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SymptomPicker } from '../components/SymptomPicker'
import { MedicationManageModal } from '../components/MedicationManageModal'
import { MedicationWidget } from '../components/MedicationWidget'
import { DayNoteEditor } from '../components/DayNoteEditor'
import { CycleRingHero } from '../components/CycleRingHero'
import { StreakBadge } from '../components/StreakBadge'
import { PremiumPaywall } from '../components/PremiumPaywall'
import { TodaySummaryCard } from '../components/TodaySummaryCard'
import { InsightsCard } from '../components/InsightsCard'
import { getPhaseTheme, CATEGORY_GRADIENTS } from '../utils/phaseTheme'
import { useTelegram } from '../context/TelegramContext'
import { useAuth } from '../context/AuthContext'
import { useCycles, isPeriodActive, getActivePeriodDay, isPeriodOverdue, getActiveCycle } from '../hooks/useCycles'
import { useSymptoms } from '../hooks/useSymptoms'
import { useMedications } from '../hooks/useMedications'
import { useMedicationLogs } from '../hooks/useMedicationLogs'
import { useStreak } from '../hooks/useStreak'
import { usePremium } from '../hooks/usePremium'
import { buildCycleInsights, filterInsightsForPlan } from '../utils/insights'
import { computeMedicationStreak } from '../utils/medStreak'
import {
  loadCustomSymptoms,
  CUSTOM_CATEGORY_ID,
  buildCustomCategory,
} from '../utils/customSymptoms'

import {
  SYMPTOM_CATEGORIES,
  getCategoryLabel,
  formatSymptomOptionText,
} from '../data/symptomCategories'
import {
  getAverageCycleLength,
  getAveragePeriodLength,
  getNextPeriodDateFromHistory,
  getUpcomingOvulationDateFromHistory,
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
import { formatDaysUntilI18n, formatForecastDaysUntil } from '../utils/formatDaysUntil'

const PRIMARY_SYMPTOM_CHIPS = ['mood', 'symptoms', 'sex', 'activity']
const TEST_SYMPTOM_CHIPS = ['ovulation_test', 'pregnancy_test']

export function Home({ onNavigateToCalendar }) {
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
  const { streak, recordActivity } = useStreak()
  const { premium } = usePremium()
  const { logs: medLogs } = useMedicationLogs()
  const medStreakInfo = useMemo(() => computeMedicationStreak(medLogs), [medLogs])
  const allInsights = useMemo(() => buildCycleInsights(cycles), [cycles])
  const visibleInsights = useMemo(
    () => filterInsightsForPlan(allInsights, premium),
    [allInsights, premium]
  )
  const [showSymptomPicker, setShowSymptomPicker] = useState(false)
  const [symptomPickerCategory, setSymptomPickerCategory] = useState(null)
  const [showMedicationManage, setShowMedicationManage] = useState(false)
  const [showPremium, setShowPremium] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, destructive: false })
  const [customTick, setCustomTick] = useState(0)

  // Reload custom tags when list may have changed (settings) or after logging
  const customSymptoms = useMemo(
    () => (premium ? loadCustomSymptoms() : []),
    [premium, symptoms.length, customTick, showSymptomPicker]
  )
  const labelCategories = useMemo(() => {
    const map = { ...SYMPTOM_CATEGORIES }
    if (customSymptoms.length > 0) {
      map[CUSTOM_CATEGORY_ID] = buildCustomCategory(customSymptoms)
    }
    return map
  }, [customSymptoms])

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
  const phaseInfo = phase ? getPhaseTheme(phase) : null
  const cycleProgress = cycleDay && avgCycleLength ? Math.min(cycleDay / avgCycleLength, 1) : 0
  const nextPeriod = hasCycles ? getNextPeriodDateFromHistory(cycles, avgCycleLength) : null
  const ovulation = hasCycles ? getUpcomingOvulationDateFromHistory(cycles, avgCycleLength) : null
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
    await recordActivity()
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
    await recordActivity()
    hapticFeedback.notification('success')
  }

  async function handleDeleteCategory(categoryId) {
    await deleteCategory(categoryId)
    hapticFeedback.notification('success')
  }

  async function handleDeleteSymptomCategory(categoryId) {
    openConfirmDialog({
      title: t('home.dialogs.deleteSymptomTitle'),
      message: t('home.dialogs.deleteSymptomMessage', {
        category: getCategoryLabel(categoryId, i18n.language, labelCategories),
      }),
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
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium glass-panel text-[var(--tg-theme-text-color,#111827)] hover:elevation-1 active:scale-[0.97] bg-gradient-to-br ${CATEGORY_GRADIENTS[catId] || ''}`}
      >
        <Icon size={14} />
        {getCategoryLabel(catId, i18n.language)}
      </button>
    )
  }

  const ringCenter = useMemo(() => {
    if (inMenstruationToday) {
      return {
        primary: t('home.periodDay'),
        secondary: `${activePeriodDay}/${avgPeriodLength}`,
      }
    }
    if (daysUntilOvulation !== null && daysUntilOvulation >= 0 && daysUntilOvulation <= 3) {
      return {
        primary: formatForecastDaysUntil(daysUntilOvulation),
        secondary: t('home.ovulation'),
      }
    }
    if (daysUntilPeriod !== null && daysUntilPeriod >= 0 && daysUntilPeriod <= 7) {
      return {
        primary: formatDaysUntilI18n(daysUntilPeriod, { allowOverdue: cycleDelayed }),
        secondary: t('home.nextPeriod'),
      }
    }
    return {
      primary: t('home.dayOfCycle'),
      secondary: `${displayDay}/${progressTotal}`,
    }
  }, [
    inMenstruationToday,
    activePeriodDay,
    avgPeriodLength,
    daysUntilOvulation,
    daysUntilPeriod,
    cycleDelayed,
    displayDay,
    progressTotal,
    t,
  ])

  function renderPeriodButton({ variant = 'default' } = {}) {
    const hero = variant === 'hero'
    const base = hero
      ? 'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold active:scale-[0.98] transition-all disabled:opacity-60'
      : 'w-full flex items-center justify-center gap-2 p-4 rounded-2xl font-semibold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60'

    // Started today: show Cancel (primary) + optional End if tracking is open
    if (periodTrackingOpen && isPeriodStartedToday) {
      return (
        <div className={hero ? 'w-full space-y-2' : 'w-full space-y-2'}>
          <button
            onClick={handleCancelPeriod}
            disabled={cyclesLoading}
            className={`${base} ${
              hero
                ? 'bg-white/20 border border-white/35 text-white hover:bg-white/28'
                : 'glass-panel hover:bg-red-500/8 hover:text-red-600'
            }`}
          >
            {cyclesLoading ? <Spinner size={20} /> : <X size={18} />}
            {t('home.cancelPeriodStart')}
          </button>
          <button
            onClick={handleEndPeriod}
            disabled={cyclesLoading}
            className={`${base} ${hero ? 'bg-white text-[var(--phase-menstruation-deep)] shadow-lg shadow-black/10' : 'btn-secondary-action hover:opacity-90'}`}
          >
            {cyclesLoading ? <Spinner size={20} /> : <Check size={18} />}
            {t('home.periodEnded')}
          </button>
        </div>
      )
    }
    if (periodTrackingOpen) {
      return (
        <button
          onClick={handleEndPeriod}
          disabled={cyclesLoading}
          className={`${base} ${hero ? 'bg-white text-[var(--phase-menstruation-deep)] shadow-lg shadow-black/10' : 'btn-secondary-action hover:opacity-90'}`}
        >
          {cyclesLoading ? <Spinner size={20} /> : <Check size={18} />}
          {t('home.periodEnded')}
        </button>
      )
    }
    return (
      <button
        onClick={handleStartPeriod}
        disabled={cyclesLoading || !!activeCycle}
        className={`${base} ${
          hero
            ? 'bg-white text-[var(--phase-menstruation-deep)] shadow-lg shadow-black/10 hover:bg-white/95'
            : 'bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] shadow-md shadow-red-500/15 hover:opacity-90'
        }`}
      >
        {cyclesLoading ? <Spinner size={20} /> : <Droplets size={18} />}
        {t('home.periodStarted')}
      </button>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{t('app.title')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 tabular-nums">
            {formatDate(new Date(), locale)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StreakBadge streak={streak} />
          {!premium && (
            <button
              type="button"
              onClick={() => {
                hapticFeedback.impact('light')
                setShowPremium(true)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400/20 to-rose-400/20 text-amber-800 border border-amber-500/25"
            >
              <Crown size={12} />
              {t('premium.upgrade')}
            </button>
          )}
        </div>
      </header>

      {hasCycles && phaseInfo ? (
        <>
          <CycleRingHero
            phase={phase}
            displayDay={displayDay}
            displayDayLabel={displayDayLabel}
            phaseLabel={t(`home.phase.${phaseInfo.key}`)}
            progressTotal={progressTotal}
            cycleProgress={inMenstruationToday ? (activePeriodDay || 0) / avgCycleLength : cycleProgress}
            ringCenterPrimary={ringCenter.primary}
            ringCenterSecondary={ringCenter.secondary}
            onNavigateToCalendar={onNavigateToCalendar}
            forecast={{
              period: {
                label: t('home.nextPeriod'),
                date: formatDate(nextPeriod, locale),
                until: formatDaysUntilI18n(daysUntilPeriod, { allowOverdue: cycleDelayed }),
              },
              ovulation: {
                label: t('home.ovulation'),
                date: formatDate(ovulation, locale),
                until: formatForecastDaysUntil(daysUntilOvulation),
              },
            }}
            periodAction={renderPeriodButton({ variant: 'hero' })}
            expandedContent={
              <>
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
              </>
            }
          />

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

        </>
      ) : (
        <>
          <EmptyState
            illustration="cycle"
            title={t('home.noData')}
            description={t('home.noDataHint')}
          />
          {renderPeriodButton()}
        </>
      )}

      {periodOverdue && (
        <p className="text-sm warning-banner-amber text-amber-800 bg-amber-500/15 border border-amber-500/30 rounded-2xl px-4 py-3">
          {t('home.periodOverdueHint')}
        </p>
      )}

      {hasCycles && phaseInfo && (
        <TodaySummaryCard
          phaseLabel={t(`home.phase.${phaseInfo.key}`)}
          phaseHint={t(`home.hero.phaseHint.${phaseInfo.key}`)}
          streak={streak}
          medStreak={medStreakInfo.streak}
          onLogWellbeing={() => openSymptomPicker()}
        />
      )}

      {visibleInsights.length > 0 && (
        <InsightsCard
          insights={visibleInsights}
          isPremium={premium}
          onUnlock={() => setShowPremium(true)}
        />
      )}

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">{t('home.logSymptoms')}</h2>
        <button
          onClick={() => openSymptomPicker()}
          className="w-full flex items-center justify-between p-4 rounded-2xl card-elevated hover:elevation-2 transition-all duration-200 active:scale-[0.99] text-left"
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

        {customSymptoms.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
              {t('customSymptoms.homeHint')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openSymptomPicker(CUSTOM_CATEGORY_ID)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium glass-panel text-[var(--tg-theme-text-color,#111827)] hover:elevation-1 active:scale-[0.97] bg-gradient-to-br ${CATEGORY_GRADIENTS.custom || ''}`}
              >
                ✨ {t('customSymptoms.categoryChip')}
              </button>
              {customSymptoms.slice(0, 6).map((cs) => (
                <button
                  key={cs.id}
                  type="button"
                  onClick={() => openSymptomPicker(CUSTOM_CATEGORY_ID)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium chip-contrast active:scale-[0.97]"
                >
                  <span aria-hidden>{cs.emoji}</span>
                  {cs.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {symptoms.length > 0 && (
          <div className="card-elevated p-4 space-y-2">
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
                const optionLine = formatSymptomOptionText(
                  s,
                  i18n.language === 'ru' ? 'ru' : 'en',
                  labelCategories
                )
                const labels = []
                if (optionLine) labels.push(optionLine)
                if (s.intensity) labels.push(`${s.intensity}/3`)
                if (parsedNotes.comment) labels.push(`💬 ${parsedNotes.comment}`)

                return (
                  <div
                    key={s.id}
                    className="px-3 py-1.5 rounded-full text-xs font-medium chip-contrast flex items-center gap-2 group"
                  >
                    <button
                      type="button"
                      onClick={() => openSymptomPicker(s.symptom_type)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                    >
                      <span className="font-semibold shrink-0">
                        {getCategoryLabel(s.symptom_type, i18n.language, labelCategories)}:
                      </span>
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
          setCustomTick((n) => n + 1)
        }}
        defaultOpenCategory={symptomPickerCategory}
        initialSelections={selections}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
        loading={symptomsLoading}
        customSymptoms={customSymptoms}
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

      <PremiumPaywall isOpen={showPremium} onClose={() => setShowPremium(false)} mode="premium" />
    </div>
  )
}