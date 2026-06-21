import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, X, Pencil, Trash2, Droplets, Check, Plus, CalendarDays } from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import { useTelegram } from '../context/TelegramContext'
import { useCycles, isPeriodActive } from '../hooks/useCycles'
import { EmptyState } from '../components/EmptyState'
import {
  generateCalendarDays,
  getAverageCycleLength,
  getAveragePeriodLength,
  getPhaseForDate,
  getCycleForDate,
  daysBetween,
  isSameDay,
  formatDate,
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
  const [selectedDate, setSelectedDate] = useState(null)
  const [showModal, setShowModal] = useState(false)
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

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  function getDayType(date) {
    if (!date) return null

    const phase = getPhaseForDate(date, cycles, avgCycleLength, avgPeriodLength)
    if (phase === 'ovulation') return 'ovulation'

    const cycle = getCycleForDate(date, cycles)
    if (cycle) {
      const cycleLength = cycle.cycle_length || avgCycleLength || DEFAULT_CYCLE_LENGTH
      const start = new Date(cycle.start_date)
      start.setHours(0, 0, 0, 0)
      const ovulationDay = cycleLength - 14
      const targetDay = daysBetween(start, date)
      if (targetDay !== null && targetDay >= ovulationDay - 5 && targetDay < ovulationDay) {
        return 'fertile'
      }
    }

    return phase
  }

  function isPeriodDay(date) {
    return cycles.some((cycle) => {
      const start = new Date(cycle.start_date)
      start.setHours(0, 0, 0, 0)
      const end = cycle.end_date ? new Date(cycle.end_date) : new Date(start)
      if (!cycle.end_date) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        end.setTime(Math.max(end.getTime(), today.getTime()))
      }
      end.setHours(23, 59, 59, 999)
      return date >= start && date <= end
    })
  }

  function getCycleForSelectedDate(date) {
    return cycles.find((cycle) => {
      const start = new Date(cycle.start_date)
      start.setHours(0, 0, 0, 0)
      const end = cycle.end_date ? new Date(cycle.end_date) : new Date(8640000000000000)
      end.setHours(23, 59, 59, 999)
      return date >= start && date <= end
    })
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
    const dateStr = selectedDate.toISOString().split('T')[0]
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
    const activeCycle = cycles.find((c) => isPeriodActive(c))
    if (!activeCycle) return
    const dateStr = selectedDate.toISOString().split('T')[0]
    await updateCycle(activeCycle.id, { end_date: dateStr })
    setShowModal(false)
    setSelectedDate(null)
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
        setShowModal(false)
        setSelectedDate(null)
        hapticFeedback.notification('success')
      },
    })
  }

  const typeStyles = {
    period: 'bg-rose-500 text-white shadow-lg shadow-rose-500/30',
    ovulation: 'bg-violet-500 text-white shadow-lg shadow-violet-500/30',
    fertile: 'bg-violet-200 text-violet-800',
    menstruation: 'bg-rose-100 text-rose-700',
    follicular: 'bg-amber-100 text-amber-700',
    luteal: 'bg-teal-100 text-teal-700',
  }

  const selectedCycle = selectedDate ? getCycleForSelectedDate(selectedDate) : null
  const activeCycle = cycles.find((c) => isPeriodActive(c))

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('calendar.title')}</h1>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20">
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-semibold min-w-[100px] text-center">
            {monthNames[lang][month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {cycles.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title={i18n.language === 'ru' ? 'Календарь пока пуст' : 'Calendar is empty'}
          description={i18n.language === 'ru'
            ? 'Отметьте первые месячные, чтобы увидеть фазы цикла и прогнозы.'
            : 'Mark your first period to see cycle phases and forecasts.'}
        />
      )}

      <div className="rounded-3xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]">
        <div className="grid grid-cols-7 mb-2">
          {weekDays[lang].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-[var(--tg-theme-hint-color,#6b7280)] py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, idx) => {
            if (!date) return <div key={idx} className="aspect-square" />

            const type = getDayType(date)
            const isToday = isSameDay(date, new Date())
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const inPeriod = isPeriodDay(date)

            return (
              <button
                key={idx}
                onClick={() => handleDayClick(date)}
                className={`aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition-all relative ${
                  type ? typeStyles[type] : 'text-[var(--tg-theme-text-color,#111827)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20'
                } ${isToday && !type ? 'ring-2 ring-[var(--tg-theme-button-color,#e11d48)]' : ''} ${
                  isSelected ? 'ring-2 ring-offset-2 ring-[var(--tg-theme-button-color,#e11d48)]' : ''
                } ${inPeriod && !type ? 'bg-rose-100 text-rose-700' : ''}`}
              >
                {date.getDate()}
                {inPeriod && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current opacity-60" />
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
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-[var(--tg-theme-hint-color,#6b7280)]">{t('home.phase.follicular')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-[var(--tg-theme-hint-color,#6b7280)]">{t('home.phase.ovulation')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-teal-400" />
          <span className="text-[var(--tg-theme-hint-color,#6b7280)]">{t('home.phase.luteal')}</span>
        </div>
      </div>

      {/* Day actions modal */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-[var(--tg-theme-bg-color,#ffffff)] p-6 space-y-4 animate-slide-in-bottom">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {formatDate(selectedDate, locale)}
              </h3>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20">
                <X size={20} />
              </button>
            </div>

            {selectedCycle ? (
              <div className="space-y-3">
                <div className="rounded-2xl p-4 bg-rose-50 border border-rose-100">
                  <p className="text-sm font-semibold text-rose-700">
                    {i18n.language === 'ru' ? 'Менструация' : 'Period'}
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
                  {i18n.language === 'ru' ? 'Изменить даты' : 'Edit dates'}
                </button>

                <button
                  onClick={() => handleDeleteCycle(selectedCycle)}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 font-semibold hover:bg-red-100"
                >
                  <Trash2 size={18} />
                  {i18n.language === 'ru' ? 'Удалить запись' : 'Delete record'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleAddCycle}
                  disabled={cyclesLoading}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {cyclesLoading ? <Spinner size={18} /> : <Plus size={18} />}
                  {i18n.language === 'ru' ? 'Месячные начались' : 'Period started'}
                </button>

                {activeCycle && (
                  <button
                    onClick={handleEndActiveCycle}
                    disabled={cyclesLoading}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-teal-500 text-white font-semibold hover:opacity-90 disabled:opacity-60"
                  >
                    {cyclesLoading ? <Spinner size={18} /> : <Check size={18} />}
                    {i18n.language === 'ru' ? 'Месячные закончились' : 'Period ended'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit cycle modal */}
      {showEditCycle && editingCycle && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-[var(--tg-theme-bg-color,#ffffff)] p-6 space-y-4 animate-slide-in-bottom">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {i18n.language === 'ru' ? 'Изменить даты' : 'Edit dates'}
              </h3>
              <button onClick={() => setShowEditCycle(false)} className="p-2 rounded-full hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--tg-theme-text-color,#111827)]">
                {i18n.language === 'ru' ? 'Дата начала' : 'Start date'}
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
                {i18n.language === 'ru' ? 'Дата окончания' : 'End date'}
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
                {i18n.language === 'ru' ? 'Ожидаемая длительность' : 'Expected duration'}
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
                <span className="font-bold text-[var(--tg-theme-text-color,#111827)]">{editPeriodLength} {i18n.language === 'ru' ? 'дн.' : 'days'}</span>
                <span>8</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowEditCycle(false)}
                className="flex-1 py-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:opacity-75"
              >
                {i18n.language === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveCycle}
                disabled={cyclesLoading || !editStart}
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
