import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCycles } from '../hooks/useCycles'
import {
  generateCalendarDays,
  getCycleDay,
  getCurrentPhase,
  getOvulationDate,
  isSameDay,
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
  const { cycles } = useCycles()
  const [currentDate, setCurrentDate] = useState(new Date())

  const cycleLength = profile?.cycle_length || DEFAULT_CYCLE_LENGTH
  const periodLength = profile?.period_length || DEFAULT_PERIOD_LENGTH

  const lastCycle = cycles[0]
  const lastPeriod = lastCycle?.start_date || new Date().toISOString().split('T')[0]

  const ovulation = useMemo(() => getOvulationDate(lastPeriod, cycleLength), [lastPeriod, cycleLength])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const days = generateCalendarDays(year, month)
  const lang = i18n.language === 'ru' ? 'ru' : 'en'

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  function getDayType(date) {
    if (!date) return null

    const d = new Date(date)
    d.setHours(0, 0, 0, 0)

    const periodStart = new Date(lastPeriod)
    periodStart.setHours(0, 0, 0, 0)

    let checkDate = new Date(periodStart)
    while (checkDate.getFullYear() < year + 1) {
      for (let i = 0; i < periodLength; i++) {
        const pDay = new Date(checkDate)
        pDay.setDate(pDay.getDate() + i)
        if (isSameDay(pDay, d)) return 'period'
      }
      checkDate.setDate(checkDate.getDate() + cycleLength)
    }

    if (isSameDay(d, ovulation)) return 'ovulation'

    const fertileStart = new Date(ovulation)
    fertileStart.setDate(fertileStart.getDate() - 5)
    if (d >= fertileStart && d <= ovulation) return 'fertile'

    const cycleDay = getCycleDay(lastPeriod, cycleLength)
    if (cycleDay) {
      const phase = getCurrentPhase(cycleDay, periodLength, cycleLength)
      return phase
    }

    return null
  }

  const typeStyles = {
    period: 'bg-rose-500 text-white shadow-lg shadow-rose-500/30',
    ovulation: 'bg-violet-500 text-white shadow-lg shadow-violet-500/30',
    fertile: 'bg-violet-200 text-violet-800',
    menstruation: 'bg-rose-100 text-rose-700',
    follicular: 'bg-amber-100 text-amber-700',
    luteal: 'bg-teal-100 text-teal-700',
  }

  return (
    <div className="space-y-6">
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

            return (
              <div
                key={idx}
                className={`aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                  type ? typeStyles[type] : 'text-[var(--tg-theme-text-color,#111827)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20'
                } ${isToday && !type ? 'ring-2 ring-[var(--tg-theme-button-color,#e11d48)]' : ''}`}
              >
                {date.getDate()}
              </div>
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
    </div>
  )
}
