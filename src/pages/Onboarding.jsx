import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Heart, ArrowRight, Calendar, Droplets } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCycles } from '../hooks/useCycles'
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'

export function Onboarding() {
  const { i18n } = useTranslation()
  const { updateProfile } = useAuth()
  const { addCycle } = useCycles()
  const lang = i18n.language === 'ru' ? 'ru' : 'en'

  const [step, setStep] = useState(1)
  const [cycleLength, setCycleLength] = useState(DEFAULT_CYCLE_LENGTH)
  const [periodLength, setPeriodLength] = useState(DEFAULT_PERIOD_LENGTH)
  const [lastPeriodDate, setLastPeriodDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleFinish() {
    setSaving(true)

    await updateProfile({
      cycle_length: cycleLength,
      period_length: periodLength,
    })

    if (lastPeriodDate) {
      await addCycle({
        start_date: lastPeriodDate,
        period_length: periodLength,
        cycle_length: cycleLength,
      })
    }

    setSaving(false)
  }

  const t = {
    ru: {
      welcome: 'Добро пожаловать в Cicle',
      subtitle: 'Давайте настроим приложение под вас. Всего пара шагов.',
      cycleLength: 'Длина вашего цикла',
      cycleLengthHint: 'От первого дня месячных до следующих',
      periodLength: 'Длительность месячных',
      periodLengthHint: 'Сколько дней обычно длится менструация',
      lastPeriod: 'Дата последних месячных',
      lastPeriodHint: 'Можно указать примерную дату или пропустить',
      skip: 'Пропустить',
      days: 'дней',
      next: 'Далее',
      back: 'Назад',
      start: 'Начать',
      saving: 'Сохранение...',
    },
    en: {
      welcome: 'Welcome to Cicle',
      subtitle: "Let's set up the app for you. Just a couple of steps.",
      cycleLength: 'Your cycle length',
      cycleLengthHint: 'From the first day of period to the next one',
      periodLength: 'Period duration',
      periodLengthHint: 'How many days does your period usually last',
      lastPeriod: 'Last period date',
      lastPeriodHint: 'You can skip this if unsure',
      skip: 'Skip',
      days: 'days',
      next: 'Next',
      back: 'Back',
      start: 'Start',
      saving: 'Saving...',
    },
  }[lang]

  return (
    <div className="flex flex-col min-h-full bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] px-5 py-8">
      <div className="flex-1 flex flex-col justify-center space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-400 to-violet-500 flex items-center justify-center text-white shadow-lg">
            <Heart size={32} />
          </div>
          <h1 className="text-2xl font-bold">{t.welcome}</h1>
          <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)]">{t.subtitle}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                step === s
                  ? 'w-8 bg-[var(--tg-theme-button-color,#e11d48)]'
                  : 'w-4 bg-[var(--tg-theme-hint-color,#d1d5db)]/50'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Cycle length */}
        {step === 1 && (
          <StepCard
            title={t.cycleLength}
            hint={t.cycleLengthHint}
            value={cycleLength}
            min={21}
            max={35}
            unit={t.days}
            icon={<Droplets size={24} className="text-rose-500" />}
            onChange={setCycleLength}
            onNext={() => setStep(2)}
            nextLabel={t.next}
          />
        )}

        {/* Step 2: Period length */}
        {step === 2 && (
          <StepCard
            title={t.periodLength}
            hint={t.periodLengthHint}
            value={periodLength}
            min={2}
            max={8}
            unit={t.days}
            icon={<Heart size={24} className="text-rose-500" />}
            onChange={setPeriodLength}
            onNext={() => setStep(3)}
            nextLabel={t.next}
            showBack
            onBack={() => setStep(1)}
            backLabel={t.back}
          />
        )}

        {/* Step 3: Last period date */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Calendar size={24} className="text-rose-500" />
                <h2 className="text-lg font-semibold text-center">{t.lastPeriod}</h2>
              </div>
              <p className="text-sm text-center text-[var(--tg-theme-hint-color,#6b7280)]">{t.lastPeriodHint}</p>
            </div>

            <div className="rounded-2xl p-5 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-4">
              <input
                type="date"
                value={lastPeriodDate}
                onChange={(e) => setLastPeriodDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-bg-color,#ffffff)] text-center text-lg"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3.5 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:opacity-75 transition-opacity"
              >
                {t.back}
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? t.saving : t.start}
              </button>
            </div>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full text-sm text-[var(--tg-theme-hint-color,#6b7280)] hover:text-[var(--tg-theme-text-color,#111827)] transition-colors"
            >
              {t.skip}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StepCard({ title, hint, value, min, max, unit, icon, onChange, onNext, nextLabel, showBack, onBack, backLabel }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold text-center">{title}</h2>
        </div>
        <p className="text-sm text-center text-[var(--tg-theme-hint-color,#6b7280)]">{hint}</p>
      </div>

      <div className="rounded-2xl p-5 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-4">
        <div className="text-center">
          <span className="text-4xl font-bold text-[var(--tg-theme-button-color,#e11d48)]">{value}</span>
          <span className="text-sm text-[var(--tg-theme-hint-color,#6b7280)] ml-1">{unit}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[var(--tg-theme-button-color,#e11d48)]"
        />
        <div className="flex justify-between text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
          <span>{min}</span>
          <span>{Math.round((min + max) / 2)}</span>
          <span>{max}</span>
        </div>
      </div>

      <div className="flex gap-3">
        {showBack && (
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] font-semibold hover:opacity-75 transition-opacity"
          >
            {backLabel}
          </button>
        )}
        <button
          onClick={onNext}
          className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 transition-opacity ${showBack ? 'flex-1' : 'w-full'}`}
        >
          {nextLabel}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
