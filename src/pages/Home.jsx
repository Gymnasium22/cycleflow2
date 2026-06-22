import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Droplets, Sparkles, Calendar, ChevronRight, X, Trash2, Heart, Check } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SymptomPicker } from '../components/SymptomPicker'
import { useTelegram } from '../context/TelegramContext'
import { useAuth } from '../context/AuthContext'
import { useCycles, isPeriodActive, getActivePeriodDay } from '../hooks/useCycles'
import { useSymptoms } from '../hooks/useSymptoms'
import {
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
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'

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

export function Home() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const { cycles, addCycle, updateCycle, deleteCycle, isLoading: cyclesLoading } = useCycles()

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const { symptoms, selections, saveCategorySelection, deleteCategory, isLoading: symptomsLoading } = useSymptoms(todayStr)

  const [showSymptomPicker, setShowSymptomPicker] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, destructive: false })

  const { hapticFeedback } = useTelegram()

  const fallbackCycleLength = profile?.cycle_length || DEFAULT_CYCLE_LENGTH
  const fallbackPeriodLength = profile?.period_length || DEFAULT_PERIOD_LENGTH

  const avgCycleLength = getAverageCycleLength(cycles, fallbackCycleLength)
  const avgPeriodLength = getAveragePeriodLength(cycles, fallbackPeriodLength)

  const lastCycle = cycles[0]
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

  const activePeriod = isPeriodActive(lastCycle)
  const activePeriodDay = activePeriod ? getActivePeriodDay(lastCycle) : null
  const isPeriodStartedToday = lastCycle?.start_date === todayStr

  function openConfirmDialog({ title, message, confirmText, cancelText, onConfirm, destructive = false }) {
    hapticFeedback.impact('medium')
    setConfirmDialog({ isOpen: true, title, message, confirmText, cancelText, onConfirm, destructive })
  }

  function closeConfirmDialog() {
    setConfirmDialog({ isOpen: false, title: '', message: '', confirmText: '', cancelText: '', onConfirm: null, destructive: false })
  }

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
      title: i18n.language === 'ru' ? 'Окончание месячных' : 'Period ended',
      message: i18n.language === 'ru' ? 'Отметить окончание месячных?' : 'Mark period as ended?',
      confirmText: i18n.language === 'ru' ? 'Отметить' : 'Mark',
      cancelText: i18n.language === 'ru' ? 'Отмена' : 'Cancel',
      onConfirm: async () => {
        closeConfirmDialog()
        await updateCycle(lastCycle.id, { end_date: todayStr })
        hapticFeedback.notification('success')
      },
    })
  }

  async function handleCancelPeriod() {
    openConfirmDialog({
      title: i18n.language === 'ru' ? 'Отменить начало' : 'Cancel start',
      message: i18n.language === 'ru' ? 'Отменить начало месячных?' : 'Cancel period start?',
      confirmText: i18n.language === 'ru' ? 'Отменить' : 'Cancel',
      cancelText: i18n.language === 'ru' ? 'Нет' : 'No',
      destructive: true,
      onConfirm: async () => {
        closeConfirmDialog()
        await deleteCycle(lastCycle.id)
        hapticFeedback.notification('success')
      },
    })
  }

  function openSymptomPicker() {
    hapticFeedback.impact('light')
    setShowSymptomPicker(true)
  }

  async function handleSaveCategory(categoryId, selectedIds, intensity) {
    await saveCategorySelection(categoryId, selectedIds, intensity)
    hapticFeedback.notification('success')
  }

  async function handleDeleteCategory(categoryId) {
    await deleteCategory(categoryId)
    hapticFeedback.notification('success')
  }

  async function handleDeleteSymptomCategory(categoryId) {
    openConfirmDialog({
      title: i18n.language === 'ru' ? 'Удалить запись' : 'Delete record',
      message: i18n.language === 'ru'
        ? `Удалить запись «${getCategoryLabel(categoryId, i18n.language)}»?`
        : `Delete «${getCategoryLabel(categoryId, i18n.language)}» record?`,
      confirmText: i18n.language === 'ru' ? 'Удалить' : 'Delete',
      cancelText: i18n.language === 'ru' ? 'Отмена' : 'Cancel',
      destructive: true,
      onConfirm: async () => {
        closeConfirmDialog()
        await handleDeleteCategory(categoryId)
      },
    })
  }

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('app.title')}</h1>
        <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)] mt-1">{t('home.today')}: {formatDate(new Date(), locale)}</p>
      </header>

      {hasCycles && phaseInfo ? (
        <>
          {/* Main cycle card */}
          <div className={`relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br ${phaseInfo.gradient} shadow-xl`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium uppercase tracking-wider">
                  {activePeriod
                    ? (i18n.language === 'ru' ? 'День месячных' : 'Period day')
                    : t('home.dayOfCycle')}
                </p>
                <p className="text-6xl font-bold mt-1">{activePeriod ? activePeriodDay : cycleDay}</p>
                <p className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm`}>
                  {activePeriod
                    ? (i18n.language === 'ru' ? 'Месячные' : 'Menstruation')
                    : t(`home.phase.${phaseInfo.key}`)}
                </p>
              </div>

              <div className="relative w-32 h-32">
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
                    strokeDasharray={`${((activePeriod ? activePeriodDay : cycleDay) / (activePeriod ? avgPeriodLength : avgCycleLength)) * 264} 264`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white/90">
                  {activePeriod ? avgPeriodLength : avgCycleLength} {t('analytics.days')}
                </div>
              </div>
            </div>
          </div>

          {/* Forecast cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl p-4 bg-rose-500/10 border border-rose-500/10">
              <div className="flex items-center gap-2 text-rose-600 mb-2">
                <Droplets size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">{t('home.nextPeriod')}</span>
              </div>
              <p className="text-lg font-bold text-[var(--tg-theme-text-color,#111827)]">{formatDate(nextPeriod, locale)}</p>
              <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)] mt-1">
                {i18n.language === 'ru' ? `через ${daysUntilPeriod} дн.` : `in ${daysUntilPeriod} days`}
              </p>
            </div>

            <div className="rounded-2xl p-4 bg-violet-500/10 border border-violet-500/10">
              <div className="flex items-center gap-2 text-violet-600 mb-2">
                <Sparkles size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">{t('home.ovulation')}</span>
              </div>
              <p className="text-lg font-bold text-[var(--tg-theme-text-color,#111827)]">{formatDate(ovulation, locale)}</p>
              <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)] mt-1">
                {i18n.language === 'ru' ? `через ${daysUntilOvulation} дн.` : `in ${daysUntilOvulation} days`}
              </p>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Heart}
          title={i18n.language === 'ru' ? 'Пока нет данных' : 'No data yet'}
          description={i18n.language === 'ru'
            ? 'Нажмите кнопку ниже, когда начнутся месячные, или введите данные вручную.'
            : 'Tap the button below when your period starts, or enter data manually.'}
        />
      )}

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">{t('home.logSymptoms')}</h2>
        <button
          onClick={openSymptomPicker}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white">
              <Calendar size={20} />
            </div>
            <div>
              <p className="font-semibold text-[var(--tg-theme-text-color,#111827)]">{t('symptoms.title')}</p>
              <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)]">{t('symptoms.hint')}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-[var(--tg-theme-hint-color,#6b7280)]" />
        </button>

        {activePeriod ? (
          <button
            onClick={handleEndPeriod}
            disabled={cyclesLoading}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-teal-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {cyclesLoading ? <Spinner size={20} /> : <Check size={18} />}
            {i18n.language === 'ru' ? 'Месячные закончились' : 'Period ended'}
          </button>
        ) : isPeriodStartedToday ? (
          <button
            onClick={handleCancelPeriod}
            disabled={cyclesLoading}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-red-500/10 hover:text-red-600 transition-colors border border-[var(--tg-theme-hint-color,#d1d5db)]/30 disabled:opacity-60"
          >
            {cyclesLoading ? <Spinner size={20} /> : <X size={18} />}
            {i18n.language === 'ru' ? 'Отменить начало месячных' : 'Cancel period start'}
          </button>
        ) : (
          <button
            onClick={handleStartPeriod}
            disabled={cyclesLoading}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {cyclesLoading ? <Spinner size={20} /> : <Droplets size={18} />}
            {i18n.language === 'ru' ? 'Месячные начались' : 'Period started'}
          </button>
        )}
      </div>

      {/* Today's logged symptoms */}
      {symptoms.length > 0 && (
        <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]">
          <p className="text-sm font-semibold mb-2 text-[var(--tg-theme-text-color,#111827)]">{t('symptoms.title')}</p>
          <div className="flex flex-wrap gap-2">
            {symptoms.map((s) => {
              const selectedIds = (() => {
                try {
                  const parsed = JSON.parse(s.notes || '[]')
                  return Array.isArray(parsed) ? parsed : []
                } catch {
                  return []
                }
              })()
              const labels = selectedIds.map((id) => `${getOptionEmoji(s.symptom_type, id)} ${getOptionLabel(s.symptom_type, id, i18n.language)}`)
              if (s.intensity) {
                labels.push(`${s.intensity}/3`)
              }
              return (
                <button
                  key={s.id}
                  onClick={() => openSymptomPicker()}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/30 text-[var(--tg-theme-text-color,#111827)] flex items-center gap-2 group hover:opacity-80 transition-opacity"
                >
                  <span className="font-semibold">{getCategoryLabel(s.symptom_type, i18n.language)}:</span>
                  <span>{labels.join(' · ') || '—'}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); handleDeleteSymptomCategory(s.symptom_type) }}
                    className="text-red-500 hover:text-red-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity px-1"
                    title={i18n.language === 'ru' ? 'Удалить' : 'Delete'}
                  >
                    <Trash2 size={12} />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <SymptomPicker
        isOpen={showSymptomPicker}
        onClose={() => setShowSymptomPicker(false)}
        initialSelections={selections}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
        loading={symptomsLoading}
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
