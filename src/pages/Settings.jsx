import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Bell, Moon, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../hooks/useSettings'
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'

export function Settings() {
  const { t, i18n } = useTranslation()
  const { profile, updateProfile } = useAuth()
  const { settings, updateSettings } = useSettings()

  const [language, setLanguage] = useState(i18n.language || 'ru')
  const [cycleLength, setCycleLength] = useState(profile?.cycle_length || DEFAULT_CYCLE_LENGTH)
  const [periodLength, setPeriodLength] = useState(profile?.period_length || DEFAULT_PERIOD_LENGTH)
  const [notifyPeriod, setNotifyPeriod] = useState(settings?.notify_period ?? true)
  const [notifyOvulation, setNotifyOvulation] = useState(settings?.notify_ovulation ?? false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setCycleLength(profile.cycle_length || DEFAULT_CYCLE_LENGTH)
      setPeriodLength(profile.period_length || DEFAULT_PERIOD_LENGTH)
    }
  }, [profile])

  useEffect(() => {
    if (settings) {
      setNotifyPeriod(settings.notify_period ?? true)
      setNotifyOvulation(settings.notify_ovulation ?? false)
    }
  }, [settings])

  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    i18n.changeLanguage(lang)
    localStorage.setItem('i18nextLng', lang)
    updateProfile({ language_code: lang })
    showSavedMessage()
  }

  const handleCycleLengthChange = (value) => {
    setCycleLength(value)
  }

  const handlePeriodLengthChange = (value) => {
    setPeriodLength(value)
  }

  const handleNotificationChange = (key, value) => {
    if (key === 'notifyPeriod') setNotifyPeriod(value)
    if (key === 'notifyOvulation') setNotifyOvulation(value)
  }

  async function saveAllSettings() {
    await Promise.all([
      updateProfile({ cycle_length: cycleLength, period_length: periodLength }),
      updateSettings({
        notify_period: notifyPeriod,
        notify_ovulation: notifyOvulation,
      }),
    ])
    showSavedMessage()
  }

  function showSavedMessage() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      {/* Language */}
      <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-3">
        <div className="flex items-center gap-2 text-[var(--tg-theme-text-color,#111827)]">
          <Globe size={20} className="text-violet-500" />
          <span className="font-semibold">{t('settings.language')}</span>
        </div>
        <div className="flex gap-2">
          {['ru', 'en'].map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                language === lang
                  ? 'bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)]'
                  : 'bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] hover:bg-black/5'
              }`}
            >
              {lang === 'ru' ? 'Русский' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {/* Cycle settings */}
      <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--tg-theme-text-color,#111827)]">
            <Moon size={18} className="text-rose-500" />
            {t('settings.cycleLength')}
          </label>
          <input
            type="range"
            min="21"
            max="35"
            value={cycleLength}
            onChange={(e) => handleCycleLengthChange(Number(e.target.value))}
            className="w-full accent-[var(--tg-theme-button-color,#e11d48)]"
          />
          <div className="flex justify-between text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
            <span>21</span>
            <span className="font-bold text-[var(--tg-theme-text-color,#111827)]">{cycleLength} {t('analytics.days')}</span>
            <span>35</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--tg-theme-text-color,#111827)]">
            <Moon size={18} className="text-rose-500" />
            {t('settings.periodLength')}
          </label>
          <input
            type="range"
            min="2"
            max="8"
            value={periodLength}
            onChange={(e) => handlePeriodLengthChange(Number(e.target.value))}
            className="w-full accent-[var(--tg-theme-button-color,#e11d48)]"
          />
          <div className="flex justify-between text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
            <span>2</span>
            <span className="font-bold text-[var(--tg-theme-text-color,#111827)]">{periodLength} {t('analytics.days')}</span>
            <span>8</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-3">
        <div className="flex items-center gap-2 text-[var(--tg-theme-text-color,#111827)]">
          <Bell size={20} className="text-teal-500" />
          <span className="font-semibold">{t('settings.notifications')}</span>
        </div>

        <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--tg-theme-bg-color,#ffffff)] cursor-pointer">
          <span className="text-sm font-medium">{t('settings.notifyPeriod')}</span>
          <input
            type="checkbox"
            checked={notifyPeriod}
            onChange={(e) => handleNotificationChange('notifyPeriod', e.target.checked)}
            className="w-5 h-5 accent-[var(--tg-theme-button-color,#e11d48)]"
          />
        </label>

        <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--tg-theme-bg-color,#ffffff)] cursor-pointer">
          <span className="text-sm font-medium">{t('settings.notifyOvulation')}</span>
          <input
            type="checkbox"
            checked={notifyOvulation}
            onChange={(e) => handleNotificationChange('notifyOvulation', e.target.checked)}
            className="w-5 h-5 accent-[var(--tg-theme-button-color,#e11d48)]"
          />
        </label>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 text-amber-800">
        <Info size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm">
          {language === 'ru'
            ? 'Уведомления работают через Telegram бота и Supabase Edge Functions. Убедитесь, что они настроены.'
            : 'Notifications work via Telegram bot and Supabase Edge Functions. Make sure they are configured.'}
        </p>
      </div>

      {/* Save button and confirmation */}
      <div className="space-y-2">
        <button
          onClick={saveAllSettings}
          className="w-full py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 transition-opacity"
        >
          {language === 'ru' ? 'Сохранить все' : 'Save all'}
        </button>
        {saved && (
          <p className="text-center text-sm text-green-600 font-medium">
            {language === 'ru' ? '✓ Сохранено' : '✓ Saved'}
          </p>
        )}
      </div>
    </div>
  )
}
