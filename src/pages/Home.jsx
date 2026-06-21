import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Droplets, Sparkles, Calendar, ChevronRight, X, Pencil, Trash2, Heart, Check, Share2 } from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useTelegram } from '../context/TelegramContext'
import { useAuth } from '../context/AuthContext'
import { useCycles, isPeriodActive, getActivePeriodDay } from '../hooks/useCycles'
import { useSymptoms } from '../hooks/useSymptoms'
import { useShareForecast } from '../hooks/useShareForecast'
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

const symptomTypes = ['mood', 'energy', 'pain', 'discharge']

export function Home() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const { cycles, addCycle, updateCycle, deleteCycle, isLoading: cyclesLoading } = useCycles()

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const { symptoms, saveSymptom, deleteSymptom, updateSymptom, isLoading: symptomsLoading } = useSymptoms(todayStr)

  const [showSymptoms, setShowSymptoms] = useState(false)
  const [selectedSymptoms, setSelectedSymptoms] = useState({})
  const [symptomNotes, setSymptomNotes] = useState('')
  const [editingSymptom, setEditingSymptom] = useState(null)

  const shareTitle = i18n.language === 'ru' ? 'Мой прогноз Cicle' : 'My Cicle forecast'
  const shareText = i18n.language === 'ru'
    ? `Мой цикл сегодня: ${phase ? t(`home.phase.${phaseInfo.key}`) : ''}`
    : `My cycle today: ${phase ? t(`home.phase.${phaseInfo.key}`) : ''}`
  const { share: shareForecast, isSharing: isSharingForecast } = useShareForecast({
    title: shareTitle,
    text: shareText,
    filename: 'cicle-forecast.png',
  })

  const fallbackCycleLength = profile?.cycle_length || DEFAULT_CYCLE_LENGTH
  const fallbackPeriodLength = profile?.period_length || DEFAULT_PERIOD_LENGTH

  const avgCycleLength = getAverageCycleLength(cycles, fallbackCycleLength)
  const avgPeriodLength = getAveragePeriodLength(cycles, fallbackPeriodLength)

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, destructive: false })

  const { hapticFeedback } = useTelegram()

  function handleShareForecast() {
    hapticFeedback.impact('light')
    shareForecast({ profile, cycles, lang: i18n.language === 'ru' ? 'ru' : 'en' })
  }

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

  function openSymptomModal() {
    hapticFeedback.impact('light')
    setEditingSymptom(null)
    setSelectedSymptoms({})
    setSymptomNotes('')
    setShowSymptoms(true)
  }

  function openEditSymptom(symptom) {
    hapticFeedback.impact('light')
    setEditingSymptom(symptom)
    setSelectedSymptoms({ [symptom.symptom_type]: symptom.intensity })
    setSymptomNotes(symptom.notes || '')
    setShowSymptoms(true)
  }

  async function handleSaveSymptoms() {
    if (editingSymptom) {
      const type = editingSymptom.symptom_type
      const intensity = selectedSymptoms[type]
      if (intensity) {
        await updateSymptom(editingSymptom.id, {
          intensity,
          notes: symptomNotes,
        })
      } else {
        // Если интенсивность сброшена — удалить
        await deleteSymptom(editingSymptom.id)
      }
    } else {
      for (const [type, value] of Object.entries(selectedSymptoms)) {
        if (value) {
          await saveSymptom({
            symptom_type: type,
            intensity: value,
            notes: symptomNotes,
          })
        }
      }
    }
    setShowSymptoms(false)
    setEditingSymptom(null)
    setSelectedSymptoms({})
    setSymptomNotes('')
    hapticFeedback.notification('success')
  }

  async function handleDeleteSymptom(id) {
    openConfirmDialog({
      title: i18n.language === 'ru' ? 'Удалить симптом' : 'Delete symptom',
      message: i18n.language === 'ru' ? 'Удалить этот симптом?' : 'Delete this symptom?',
      confirmText: i18n.language === 'ru' ? 'Удалить' : 'Delete',
      cancelText: i18n.language === 'ru' ? 'Отмена' : 'Cancel',
      destructive: true,
      onConfirm: async () => {
        closeConfirmDialog()
        await deleteSymptom(id)
        hapticFeedback.notification('success')
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

          {/* Share forecast */}
          <button
            onClick={handleShareForecast}
            disabled={isSharingForecast}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors disabled:opacity-60"
          >
            {isSharingForecast ? <Spinner size={18} /> : <Share2 size={18} />}
            {i18n.language === 'ru' ? 'Поделиться прогнозом' : 'Share forecast'}
          </button>

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
        <div className="rounded-3xl p-8 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-400 to-violet-500 flex items-center justify-center text-white shadow-lg">
            <Heart size={32} />
          </div>
          <h2 className="text-xl font-bold">
            {i18n.language === 'ru' ? 'Пока нет данных' : 'No data yet'}
          </h2>
          <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)]">
            {i18n.language === 'ru'
              ? 'Нажмите кнопку ниже, когда начнутся месячные, или введите данные вручную.'
              : 'Tap the button below when your period starts, or enter data manually.'}
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">{t('home.logSymptoms')}</h2>
        <button
          onClick={openSymptomModal}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white">
              <Calendar size={20} />
            </div>
            <div>
              <p className="font-semibold text-[var(--tg-theme-text-color,#111827)]">{t('symptoms.title')}</p>
              <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)]">{t('symptoms.notes')}</p>
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
            {symptoms.map((s) => (
              <button
                key={s.id}
                onClick={() => openEditSymptom(s)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/30 text-[var(--tg-theme-text-color,#111827)] flex items-center gap-2 group hover:opacity-80 transition-opacity"
              >
                <Pencil size={12} className="opacity-50 group-hover:opacity-100" />
                <span>{t(`symptoms.${s.symptom_type}`)}: {s.intensity}/5</span>
                <span
                  onClick={(e) => { e.stopPropagation(); handleDeleteSymptom(s.id) }}
                  className="text-red-500 hover:text-red-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity px-1"
                  title={i18n.language === 'ru' ? 'Удалить' : 'Delete'}
                >
                  <Trash2 size={12} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Symptom modal (add / edit) */}
      {showSymptoms && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-[var(--tg-theme-bg-color,#ffffff)] p-6 space-y-4 animate-slide-in-bottom">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingSymptom
                  ? (i18n.language === 'ru' ? 'Изменить самочувствие' : 'Edit symptom')
                  : t('symptoms.title')}
              </h3>
              <button onClick={() => setShowSymptoms(false)} className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20">
                <X size={20} />
              </button>
            </div>

            {symptomTypes.map((type) => {
              // При редактировании показываем только тот тип, который редактируем
              if (editingSymptom && editingSymptom.symptom_type !== type) return null

              return (
                <div key={type} className="space-y-2">
                  <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">{t(`symptoms.${type}`)}</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() => setSelectedSymptoms((prev) => ({ ...prev, [type]: level }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          selectedSymptoms[type] === level
                            ? 'bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)]'
                            : 'bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">
                {i18n.language === 'ru' ? 'Заметки' : 'Notes'}
              </label>
              <textarea
                value={symptomNotes}
                onChange={(e) => setSymptomNotes(e.target.value)}
                placeholder={i18n.language === 'ru' ? 'Что ещё чувствуете?' : 'Anything else?'}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-sm resize-none"
              />
            </div>

            <button
              onClick={handleSaveSymptoms}
              disabled={symptomsLoading}
              className="w-full py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {symptomsLoading && <Spinner size={18} />}
              {t('symptoms.save')}
            </button>
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
