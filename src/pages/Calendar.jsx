import { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, X, Pencil, Trash2, Check, Plus, Heart, StickyNote } from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SymptomPicker } from '../components/SymptomPicker'
import { CalendarSkeleton } from '../components/CalendarSkeleton'
import { ModalPortal } from '../components/ModalPortal'
import { useAuth } from '../context/AuthContext'
import { useTelegram } from '../context/TelegramContext'
import { useCycles, getActiveCycle } from '../hooks/useCycles'
import { useSymptomHistory } from '../hooks/useSymptomHistory'
import { useSymptoms } from '../hooks/useSymptoms'
import { useDayNotesForMonth } from '../hooks/useDayNotesForMonth'
import { EmptyState } from '../components/EmptyState'
import { HistorySection } from '../components/HistorySection'
import { DayNoteEditor } from '../components/DayNoteEditor'
import { getPhaseTheme } from '../utils/phaseTheme'
import {
  generateCalendarDays,
  getAverageCycleLength,
  getAveragePeriodLength,
  getPhaseForDate,
  getCycleForDate,
  getCycleDayForDate,
  isSameDay,
  formatDate,
  toISODateString,
  isDateInPeriodRange,
  getNextPeriodDateFromHistory,
  getPredictedPeriodDateSet,
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'

const monthNames = {
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

const weekDays = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

export function Calendar() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuth()
  const { cycles, addCycle, updateCycle, deleteCycle, isLoading: cyclesLoading } = useCycles()
  const { hapticFeedback } = useTelegram()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('calendar')
  const [selectedDate, setSelectedDate] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showSymptomPicker, setShowSymptomPicker] = useState(false)
  const [monthAnimKey, setMonthAnimKey] = useState(0)
  const [headerOffset, setHeaderOffset] = useState(0)
  const touchStartXRef = useRef(null)

  const monthStartStr = useMemo(() => {
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`
  }, [currentDate])
  const monthEndStr = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    return toISODateString(d)
  }, [currentDate])
  const { symptoms: monthSymptoms } = useSymptomHistory(monthStartStr, monthEndStr)
  const { noteDates } = useDayNotesForMonth(monthStartStr, monthEndStr)

  const selectedDateStr = selectedDate ? toISODateString(selectedDate) : null
  const {
    selections: daySelections,
    saveCategorySelection,
    deleteCategory,
    isLoading: daySymptomsLoading,
  } = useSymptoms(selectedDateStr)

  const sexDates = useMemo(() => {
    const set = new Set()
    for (const s of monthSymptoms) {
      if (s.symptom_type !== 'sex') continue
      const selectedIds = (() => {
        try {
          const parsed = JSON.parse(s.notes || '[]')
          if (Array.isArray(parsed)) return parsed
          if (parsed && Array.isArray(parsed.selectedIds)) return parsed.selectedIds
          return []
        } catch {
          return []
        }
      })()
      if (selectedIds.length > 0 && !selectedIds.includes('none')) {
        set.add(s.date)
      }
    }
    return set
  }, [monthSymptoms])

  const symptomDates = useMemo(() => {
    const set = new Set()
    for (const s of monthSymptoms) {
      set.add(s.date)
    }
    return set
  }, [monthSymptoms])

  const [showEditCycle, setShowEditCycle] = useState(false)
  const [editingCycle, setEditingCycle] = useState(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editPeriodLength, setEditPeriodLength] = useState(5)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, destructive: false })

  const fallbackCycleLength = profile?.cycle_length || DEFAULT_CYCLE_LENGTH
  const fallbackPeriodLength = profile?.period_length || DEFAULT_PERIOD_LENGTH

  const avgCycleLength = useMemo(() => getAverageCycleLength(cycles, fallbackCycleLength), [cycles, fallbackCycleLength])
  const avgPeriodLength = useMemo(() => getAveragePeriodLength(cycles, fallbackPeriodLength), [cycles, fallbackPeriodLength])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const days = generateCalendarDays(year, month)
  const lang = i18n.language === 'ru' ? 'ru' : 'en'
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US'

  const todayPhase = useMemo(
    () => getPhaseForDate(new Date(), cycles, avgCycleLength, avgPeriodLength),
    [cycles, avgCycleLength, avgPeriodLength]
  )
  const todayPhaseTheme = getPhaseTheme(todayPhase)

  const nextPeriodDate = useMemo(
    () => (cycles.length > 0 ? getNextPeriodDateFromHistory(cycles, avgCycleLength) : null),
    [cycles, avgCycleLength]
  )

  const predictedPeriodDates = useMemo(
    () => getPredictedPeriodDateSet(cycles, avgCycleLength, avgPeriodLength),
    [cycles, avgCycleLength, avgPeriodLength]
  )

  useEffect(() => {
    setMonthAnimKey((k) => k + 1)
    setHeaderOffset(0)
  }, [year, month])

  const prevMonth = () => {
    hapticFeedback.impact('light')
    setHeaderOffset(-8)
    setCurrentDate(new Date(year, month - 1, 1))
  }
  const nextMonth = () => {
    hapticFeedback.impact('light')
    setHeaderOffset(8)
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function handleCalendarTouchStart(e) {
    touchStartXRef.current = e.touches[0].clientX
  }

  function handleCalendarTouchMove(e) {
    if (touchStartXRef.current === null) return
    const diff = e.touches[0].clientX - touchStartXRef.current
    setHeaderOffset(Math.max(-12, Math.min(12, diff * 0.08)))
  }

  function handleCalendarTouchEnd(e) {
    if (touchStartXRef.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartXRef.current
    if (Math.abs(diff) > 50) {
      if (diff < 0) nextMonth()
      else prevMonth()
    } else {
      setHeaderOffset(0)
    }
    touchStartXRef.current = null
  }

  async function handleSaveDaySymptom(categoryId, selectedIds, intensity, comment) {
    await saveCategorySelection(categoryId, selectedIds, intensity, comment)
    hapticFeedback.notification('success')
  }

  async function handleDeleteDaySymptom(categoryId) {
    await deleteCategory(categoryId)
    hapticFeedback.notification('success')
  }

  function getDayType(date) {
    if (!date) return null

    // Defensive: real period dates always win over phase estimation
    if (isPeriodDay(date)) return 'menstruation'

    const phase = getPhaseForDate(date, cycles, avgCycleLength, avgPeriodLength)
    if (phase === 'ovulation') return 'ovulation'

    const cycle = getCycleForDate(date, cycles)
    if (cycle) {
      const cycleLength = cycle.cycle_length || avgCycleLength || DEFAULT_CYCLE_LENGTH
      const start = new Date(cycle.start_date)
      start.setHours(0, 0, 0, 0)
      const ovulationDay = cycleLength - 14
      const targetDay = getCycleDayForDate(date, cycle.start_date, cycleLength)
      if (targetDay !== null && targetDay >= ovulationDay - 5 && targetDay < ovulationDay) {
        return 'fertile'
      }
    }

    return phase
  }

  function isPeriodDay(date) {
    return cycles.some((cycle) => isDateInPeriodRange(date, cycle, avgPeriodLength))
  }

  function getCycleForSelectedDate(date) {
    return cycles.find((cycle) => isDateInPeriodRange(date, cycle, avgPeriodLength))
  }

  function handleDayClick(date) {
    hapticFeedback.impact('light')
    setSelectedDate(date)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setSelectedDate(null)
  }

  function openConfirmDialog({ title, message, confirmText, cancelText, onConfirm, destructive = false }) {
    hapticFeedback.impact('medium')
    setConfirmDialog({ isOpen: true, title, message, confirmText, cancelText, onConfirm, destructive })
  }

  function closeConfirmDialog() {
    setConfirmDialog({ isOpen: false, title: '', message: '', confirmText: '', cancelText: '', onConfirm: null, destructive: false })
  }

  function openEditCycleModal(cycle) {
    setEditingCycle(cycle)
    setEditStart(cycle.start_date)
    setEditEnd(cycle.end_date || '')
    setEditPeriodLength(cycle.period_length || fallbackPeriodLength)
    setShowEditCycle(true)
  }

  async function handleSaveCycle() {
    if (!editingCycle || !editStart) return
    await updateCycle(editingCycle.id, {
      start_date: editStart,
      end_date: editEnd || null,
      period_length: editPeriodLength,
    })
    setShowEditCycle(false)
    setEditingCycle(null)
    setShowModal(false)
    setSelectedDate(null)
    hapticFeedback.notification('success')
  }

  async function handleAddCycle() {
    if (!selectedDate) return
    if (getActiveCycle(cycles)) {
      hapticFeedback.notification('error')
      return
    }
    const dateStr = toISODateString(selectedDate)
    await addCycle({
      start_date: dateStr,
      period_length: fallbackPeriodLength,
      cycle_length: fallbackCycleLength,
    })
    setShowModal(false)
    setSelectedDate(null)
    hapticFeedback.notification('success')
  }

  async function handleEndActiveCycle() {
    if (!selectedDate) return
    const activeCycle = getActiveCycle(cycles)
    if (!activeCycle) return
    const dateStr = toISODateString(selectedDate)
    await updateCycle(activeCycle.id, { end_date: dateStr })
    setShowModal(false)
    setSelectedDate(null)
    hapticFeedback.notification('success')
  }

  function handleDeleteCycle(cycle) {
    openConfirmDialog({
      title: t('calendar.deleteRecord'),
      message: t('calendar.deleteRecordMessage', { date: formatDate(new Date(cycle.start_date), locale) }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        closeConfirmDialog()
        await deleteCycle(cycle.id)
        setShowModal(false)
        setSelectedDate(null)
        hapticFeedback.notification('success')
      },
    })
  }

  const typeStyles = {
    period: 'bg-[var(--phase-menstruation-deep)] text-white elevation-1',
    ovulation: 'bg-[var(--phase-ovulation-deep)] text-white elevation-1',
    fertile: 'cal-day-fertile',
    menstruation: 'bg-[color-mix(in_srgb,var(--phase-menstruation)_25%,transparent)] text-[var(--phase-menstruation-deep)]',
    follicular: 'bg-[color-mix(in_srgb,var(--phase-follicular)_22%,transparent)] text-[var(--phase-follicular-deep)]',
    luteal: 'bg-[color-mix(in_srgb,var(--phase-luteal)_22%,transparent)] text-[var(--phase-luteal-deep)]',
  }

  const selectedCycle = selectedDate ? getCycleForSelectedDate(selectedDate) : null
  const activeCycle = getActiveCycle(cycles)

  if (view === 'calendar' && cyclesLoading && cycles.length === 0) {
    return <CalendarSkeleton />
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex gap-2 p-1 rounded-2xl glass-panel elevation-1">
        {['calendar', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => { hapticFeedback.impact('light'); setView(tab) }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              view === tab
                ? 'bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] shadow-sm'
                : 'text-[var(--tg-theme-hint-color,#6b7280)]'
            }`}
          >
            {t(`calendar.tab${tab === 'calendar' ? 'Calendar' : 'History'}`)}
          </button>
        ))}
      </div>

      {view === 'history' ? (
        <HistorySection />
      ) : (
        <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="label-caps text-[var(--text-muted)]">{t('calendar.title')}</p>
          <h1
            className="font-display text-2xl font-semibold tracking-tight transition-transform duration-300 ease-premium"
            style={{ transform: `translateX(${headerOffset}px)` }}
          >
            {monthNames[lang][month]}
            <span className="text-[var(--text-muted)] font-normal text-lg ml-1.5 tabular-nums">{year}</span>
          </h1>
          {nextPeriodDate && cycles.length > 0 && (
            <p className="text-xs text-[var(--text-muted)] mt-1 tabular-nums">
              {t('home.nextPeriod')}: {formatDate(nextPeriodDate, locale)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 glass-panel rounded-full p-0.5 elevation-1">
          <button onClick={prevMonth} className="p-2.5 rounded-full hover:bg-black/5 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={nextMonth} className="p-2.5 rounded-full hover:bg-black/5 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {cycles.length === 0 && (
        <EmptyState
          illustration="calendar"
          title={t('calendar.empty')}
          description={t('calendar.emptyHint')}
        />
      )}

      <div
        className="rounded-2xl p-4 glass-panel elevation-1 touch-pan-y"
        onTouchStart={handleCalendarTouchStart}
        onTouchMove={handleCalendarTouchMove}
        onTouchEnd={handleCalendarTouchEnd}
      >
        <div className="grid grid-cols-7 mb-2">
          {weekDays[lang].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-[var(--tg-theme-hint-color,#6b7280)] py-2">
              {day}
            </div>
          ))}
        </div>
        <div key={monthAnimKey} className="grid grid-cols-7 gap-1 animate-month-in">
          {days.map((date, idx) => {
            if (!date) return <div key={idx} className="aspect-square" />

            const type = getDayType(date)
            const isToday = isSameDay(date, new Date())
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const inPeriod = isPeriodDay(date)
            const dateStr = toISODateString(date)
            const hasSex = sexDates.has(dateStr)
            const hasSymptoms = symptomDates.has(dateStr)
            const hasNote = noteDates.has(dateStr)
            const isPredictedPeriod = !inPeriod && predictedPeriodDates.has(dateStr)

            const cycleForDay = getCycleForDate(date, cycles)
            const cycleDayNumber = cycleForDay
              ? getCycleDayForDate(date, cycleForDay.start_date, cycleForDay.cycle_length || avgCycleLength || DEFAULT_CYCLE_LENGTH)
              : null

            return (
              <button
                key={idx}
                onClick={() => handleDayClick(date)}
                style={isToday ? { '--phase-glow-color': todayPhaseTheme.glow } : undefined}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 relative ${
                  type ? typeStyles[type] : 'text-[var(--tg-theme-text-color,#111827)] hover:bg-black/[0.04]'
                } ${isToday ? `cal-day-today-glow phase-${todayPhase}` : ''} ${
                  isSelected ? 'ring-2 ring-offset-1 ring-[var(--tg-theme-button-color,#C45C6A)]' : ''
                } ${inPeriod && !type ? 'bg-[color-mix(in_srgb,var(--phase-menstruation)_25%,transparent)] text-[var(--phase-menstruation-deep)]' : ''} ${
                  isPredictedPeriod ? 'cal-day-predicted-period' : ''
                }`}
              >
                <span className="leading-none">{date.getDate()}</span>
                <div className="flex items-center justify-center gap-1 mt-0.5 h-3">
                  {cycleDayNumber && cycleDayNumber > 0 && (
                    <span className="text-[9px] font-medium opacity-70 leading-none">{cycleDayNumber}</span>
                  )}
                  {inPeriod && (
                    <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                  )}
                </div>
                {hasSymptoms && (
                  <span className="absolute bottom-0.5 right-1 w-1.5 h-1.5 rounded-full bg-[var(--tg-theme-button-color,#e11d48)] opacity-90" />
                )}
                {hasNote && (
                  <StickyNote size={9} className="absolute bottom-0.5 left-1 text-amber-500 opacity-90" />
                )}
                {hasSex && (
                  <Heart size={10} className="absolute top-1 right-1 fill-current opacity-90" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span className="text-[var(--tg-theme-hint-color,#6b7280)]">{t('home.phase.menstruation')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-2 border-dashed border-[var(--phase-menstruation-deep)] bg-[color-mix(in_srgb,var(--phase-menstruation)_20%,transparent)]" />
          <span className="text-[var(--tg-theme-hint-color,#6b7280)]">{t('calendar.predictedPeriod')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-[var(--tg-theme-hint-color,#6b7280)]">{t('home.phase.follicular')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-[var(--tg-theme-hint-color,#6b7280)]">{t('home.phase.ovulation')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[var(--phase-luteal-deep)]" />
          <span className="text-[var(--tg-theme-hint-color,#6b7280)]">{t('home.phase.luteal')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-violet-200" />
          <span className="text-[var(--tg-theme-hint-color,#6b7280)]">
            {t('calendar.fertileWindow')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--tg-theme-button-color,#e11d48)]" />
          <span className="text-[var(--tg-theme-hint-color,#6b7280)]">
            {t('calendar.symptoms')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <StickyNote size={12} className="text-amber-500" />
          <span className="text-[var(--tg-theme-hint-color,#6b7280)]">
            {t('calendar.notes')}
          </span>
        </div>
      </div>

      {/* Day actions modal */}
      {showModal && selectedDate && (
        <ModalPortal>
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 backdrop-blur-sm p-4 pb-6" onClick={closeModal} role="presentation">
          <div
            className="w-full max-w-md rounded-2xl bg-[var(--surface-elevated)] p-6 space-y-4 animate-slide-in-bottom elevation-3 border border-[var(--border-subtle)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {formatDate(selectedDate, locale)}
              </h3>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20">
                <X size={20} />
              </button>
            </div>

            <DayNoteEditor date={toISODateString(selectedDate)} compact />

            <button
              type="button"
              onClick={() => {
                hapticFeedback.impact('light')
                setShowSymptomPicker(true)
              }}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 border border-[var(--tg-theme-hint-color,#d1d5db)]/15"
            >
              <Plus size={18} />
              {t('calendar.addSymptoms')}
            </button>

            {selectedCycle ? (
              <div className="space-y-3">
                <div className="rounded-2xl p-4 bg-rose-50 border border-rose-100">
                  <p className="text-sm font-semibold text-rose-700">
                    {t('calendar.period')}
                  </p>
                  <p className="text-sm text-rose-600 mt-1">
                    {formatDate(new Date(selectedCycle.start_date), locale)}
                    {selectedCycle.end_date && ` — ${formatDate(new Date(selectedCycle.end_date), locale)}`}
                  </p>
                </div>

                <button
                  onClick={() => openEditCycleModal(selectedCycle)}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20"
                >
                  <Pencil size={18} />
                  {t('calendar.editDates')}
                </button>

                <button
                  onClick={() => handleDeleteCycle(selectedCycle)}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 font-semibold hover:bg-red-100"
                >
                  <Trash2 size={18} />
                  {t('calendar.deleteRecord')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleAddCycle}
                  disabled={cyclesLoading || !!activeCycle}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {cyclesLoading ? <Spinner size={18} /> : <Plus size={18} />}
                  {t('home.periodStarted')}
                </button>

                {activeCycle && (
                  <p className="text-xs text-center text-[var(--tg-theme-hint-color,#6b7280)]">
                    {t('calendar.markPeriodEndFirst')}
                  </p>
                )}

                {activeCycle && (
                  <button
                    onClick={handleEndActiveCycle}
                    disabled={cyclesLoading}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl btn-secondary-action font-semibold hover:opacity-90 disabled:opacity-60"
                  >
                    {cyclesLoading ? <Spinner size={18} /> : <Check size={18} />}
                    {t('home.periodEnded')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Edit cycle modal */}
      {showEditCycle && editingCycle && (
        <ModalPortal>
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4" onClick={() => setShowEditCycle(false)} role="presentation">
          <div
            className="w-full max-w-md rounded-2xl bg-[var(--surface-elevated)] p-6 space-y-4 animate-slide-in-bottom elevation-3 border border-[var(--border-subtle)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {t('calendar.editDates')}
              </h3>
              <button onClick={() => setShowEditCycle(false)} className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">
                {t('calendar.startDate')}
              </label>
              <input
                type="date"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">
                {t('calendar.endDate')}
              </label>
              <input
                type="date"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">
                {t('calendar.expectedDuration')}
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={editPeriodLength}
                onChange={(e) => setEditPeriodLength(Number(e.target.value))}
                className="w-full accent-[var(--tg-theme-button-color,#e11d48)]"
              />
              <div className="flex justify-between text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
                <span>2</span>
                <span className="font-bold text-[var(--tg-theme-text-color,#111827)]">{editPeriodLength} {t('common.daysShort')}</span>
                <span>8</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowEditCycle(false)}
                className="flex-1 py-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:opacity-75"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveCycle}
                disabled={cyclesLoading || !editStart}
                className="flex-1 py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {cyclesLoading && <Spinner size={18} />}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      <SymptomPicker
        isOpen={showSymptomPicker}
        onClose={() => setShowSymptomPicker(false)}
        initialSelections={daySelections}
        onSaveCategory={handleSaveDaySymptom}
        onDeleteCategory={handleDeleteDaySymptom}
        loading={daySymptomsLoading}
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
        </>
      )}
    </div>
  )
}
