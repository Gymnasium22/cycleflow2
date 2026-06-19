import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Droplets, Sparkles, Calendar, ChevronRight } from 'lucide-react'
import {
  getCycleDay,
  getCurrentPhase,
  getNextPeriodDate,
  getOvulationDate,
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
  const [lastPeriod, setLastPeriod] = useState(() => {
    const saved = localStorage.getItem('lastPeriodStart')
    if (saved) return saved
    // Demo: start 10 days ago
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return d.toISOString().split('T')[0]
  })
  const [cycleLength, setCycleLength] = useState(() => {
    return Number(localStorage.getItem('cycleLength')) || DEFAULT_CYCLE_LENGTH
  })
  const [periodLength, setPeriodLength] = useState(() => {
    return Number(localStorage.getItem('periodLength')) || DEFAULT_PERIOD_LENGTH
  })

  useEffect(() => {
    localStorage.setItem('lastPeriodStart', lastPeriod)
    localStorage.setItem('cycleLength', String(cycleLength))
    localStorage.setItem('periodLength', String(periodLength))
  }, [lastPeriod, cycleLength, periodLength])

  const cycleDay = getCycleDay(lastPeriod, cycleLength)
  const phase = getCurrentPhase(cycleDay, periodLength, cycleLength)
  const phaseInfo = phaseConfig[phase]
  const nextPeriod = getNextPeriodDate(lastPeriod, cycleLength)
  const ovulation = getOvulationDate(lastPeriod, cycleLength)
  const daysUntilPeriod = getDaysUntil(nextPeriod)
  const daysUntilOvulation = getDaysUntil(ovulation)
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US'

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('app.title')}</h1>
        <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)] mt-1">{t('home.today')}: {formatDate(new Date(), locale)}</p>
      </header>

      {/* Main cycle card */}
      <div className={`relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br ${phaseInfo.gradient} shadow-xl`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl" />

        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium uppercase tracking-wider">{t('home.dayOfCycle')}</p>
            <p className="text-6xl font-bold mt-1">{cycleDay}</p>
            <p className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm`}>
              {t(`home.phase.${phaseInfo.key}`)}
            </p>
          </div>

          {/* Circular progress */}
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
                strokeDasharray={`${(cycleDay / cycleLength) * 264} 264`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white/90">
              {cycleLength} {t('analytics.days')}
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
            {daysUntilPeriod === 0 ? 'Сегодня' : `через ${daysUntilPeriod} дн.`}
          </p>
        </div>

        <div className="rounded-2xl p-4 bg-violet-500/10 border border-violet-500/10">
          <div className="flex items-center gap-2 text-violet-600 mb-2">
            <Sparkles size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">{t('home.ovulation')}</span>
          </div>
          <p className="text-lg font-bold text-[var(--tg-theme-text-color,#111827)]">{formatDate(ovulation, locale)}</p>
          <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)] mt-1">
            {daysUntilOvulation === 0 ? 'Сегодня' : `через ${daysUntilOvulation} дн.`}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">{t('home.logSymptoms')}</h2>
        <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] hover:bg-black/5 transition-colors text-left">
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
      </div>

      {/* Demo controls */}
      <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-3">
        <p className="text-sm font-semibold text-[var(--tg-theme-text-color,#111827)]">Демо-настройки цикла</p>
        <div className="space-y-2">
          <label className="block text-xs text-[var(--tg-theme-hint-color,#6b7280)]">Начало последних месячных</label>
          <input
            type="date"
            value={lastPeriod}
            onChange={(e) => setLastPeriod(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-black/10 bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="block text-xs text-[var(--tg-theme-hint-color,#6b7280)]">{t('settings.cycleLength')}</label>
            <input
              type="number"
              value={cycleLength}
              onChange={(e) => setCycleLength(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-black/10 bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)]"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs text-[var(--tg-theme-hint-color,#6b7280)]">{t('settings.periodLength')}</label>
            <input
              type="number"
              value={periodLength}
              onChange={(e) => setPeriodLength(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-black/10 bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
