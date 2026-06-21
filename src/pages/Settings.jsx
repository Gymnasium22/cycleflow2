import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Bell, Moon, Info, Download, Clock, Trash2, Send } from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useTelegram } from '../context/TelegramContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useSettings } from '../hooks/useSettings'
import { useCycles } from '../hooks/useCycles'
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'

export function Settings() {
  const { t, i18n } = useTranslation()
  const { profile, updateProfile, isLoading: profileLoading } = useAuth()
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings()
  const { cycles } = useCycles()

  const [language, setLanguage] = useState(i18n.language || 'ru')
  const [cycleLength, setCycleLength] = useState(profile?.cycle_length || DEFAULT_CYCLE_LENGTH)
  const [periodLength, setPeriodLength] = useState(profile?.period_length || DEFAULT_PERIOD_LENGTH)
  const [notifyPeriod, setNotifyPeriod] = useState(settings?.notify_period ?? true)
  const [notifyOvulation, setNotifyOvulation] = useState(settings?.notify_ovulation ?? false)
  const [periodReminderDays, setPeriodReminderDays] = useState(settings?.period_reminder_days ?? 2)
  const [ovulationReminderDays, setOvulationReminderDays] = useState(settings?.ovulation_reminder_days ?? 1)
  const [notifyTime, setNotifyTime] = useState(settings?.notify_time ?? '09:00')
  const [saved, setSaved] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTestingNotifications, setIsTestingNotifications] = useState(false)

  const { hapticFeedback } = useTelegram()

  const debounceRef = useRef(null)
  const notifyDebounceRef = useRef(null)

  const showSavedMessage = useCallback(() => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  // Sync profile into local state
  useEffect(() => {
    if (profile) {
      setCycleLength(profile.cycle_length || DEFAULT_CYCLE_LENGTH)
      setPeriodLength(profile.period_length || DEFAULT_PERIOD_LENGTH)
    }
  }, [profile])

  // Sync settings into local state
  useEffect(() => {
    if (settings) {
      setNotifyPeriod(settings.notify_period ?? true)
      setNotifyOvulation(settings.notify_ovulation ?? false)
      setPeriodReminderDays(settings.period_reminder_days ?? 2)
      setOvulationReminderDays(settings.ovulation_reminder_days ?? 1)
      setNotifyTime(settings.notify_time ?? '09:00')
    }
  }, [settings])

  // Auto-save cycle settings with debounce
  useEffect(() => {
    if (!profile) return
    if (cycleLength === profile.cycle_length && periodLength === profile.period_length) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateProfile({ cycle_length: cycleLength, period_length: periodLength })
      showSavedMessage()
    }, 800)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [cycleLength, periodLength, profile, updateProfile, showSavedMessage])

  // Auto-save notification settings with debounce
  useEffect(() => {
    if (!settings) return
    const isUnchanged =
      notifyPeriod === (settings.notify_period ?? true) &&
      notifyOvulation === (settings.notify_ovulation ?? false) &&
      periodReminderDays === (settings.period_reminder_days ?? 2) &&
      ovulationReminderDays === (settings.ovulation_reminder_days ?? 1) &&
      notifyTime === (settings.notify_time ?? '09:00')

    if (isUnchanged) return

    if (notifyDebounceRef.current) clearTimeout(notifyDebounceRef.current)
    notifyDebounceRef.current = setTimeout(() => {
      updateSettings({
        notify_period: notifyPeriod,
        notify_ovulation: notifyOvulation,
        period_reminder_days: periodReminderDays,
        ovulation_reminder_days: ovulationReminderDays,
        notify_time: notifyTime,
      })
      showSavedMessage()
    }, 400)

    return () => {
      if (notifyDebounceRef.current) clearTimeout(notifyDebounceRef.current)
    }
  }, [notifyPeriod, notifyOvulation, periodReminderDays, ovulationReminderDays, notifyTime, settings, updateSettings, showSavedMessage])

  const handleLanguageChange = (lang) => {
    hapticFeedback.impact('light')
    setLanguage(lang)
    i18n.changeLanguage(lang)
    localStorage.setItem('i18nextLng', lang)
    updateProfile({ language_code: lang })
    showSavedMessage()
  }

  async function deleteAllData() {
    setIsDeleting(true)
    hapticFeedback.notification('warning')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        throw new Error(i18n.language === 'ru' ? 'Нет активной сессии' : 'No active session')
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-all-data`
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete data')
      }

      // Clear all local storage
      localStorage.clear()
      // Sign out and reload
      hapticFeedback.notification('success')
      await supabase.auth.signOut()
      window.location.reload()
    } catch (err) {
      console.error('Delete all data error:', err?.message, err?.stack, JSON.stringify(err), err)
      alert((i18n.language === 'ru' ? 'Ошибка при удалении данных: ' : 'Error deleting data: ') + (err?.message || JSON.stringify(err) || 'Unknown error'))
      setIsDeleting(false)
    }
  }

  const handleCycleLengthChange = (value) => {
    setCycleLength(value)
  }

  const handlePeriodLengthChange = (value) => {
    setPeriodLength(value)
  }

  async function saveAllSettings() {
    hapticFeedback.impact('light')
    await Promise.all([
      updateProfile({ cycle_length: cycleLength, period_length: periodLength }),
      updateSettings({
        notify_period: notifyPeriod,
        notify_ovulation: notifyOvulation,
        period_reminder_days: periodReminderDays,
        ovulation_reminder_days: ovulationReminderDays,
        notify_time: notifyTime,
      }),
    ])
    showSavedMessage()
  }

  async function testNotifications() {
    setIsTestingNotifications(true)
    hapticFeedback.impact('light')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        throw new Error(i18n.language === 'ru'
          ? 'Нет активной сессии. Перезайдите через Telegram.'
          : 'No active session. Please log in via Telegram again.')
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notifications`
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ test: true }),
      })

      const responseText = await response.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = { raw: responseText }
      }

      if (!response.ok) {
        const isJwtError = responseText.includes('UNAUTHORIZED_LEGACY_JWT') || responseText.includes('Invalid JWT')
        const message = isJwtError
          ? (i18n.language === 'ru'
              ? 'Ключ Supabase устарел. Обновите VITE_SUPABASE_ANON_KEY и SB_ANON_KEY, затем перезапустите cron job.'
              : 'Supabase key expired. Update VITE_SUPABASE_ANON_KEY and SB_ANON_KEY, then restart the cron job.')
          : (responseData?.error || responseData?.message || `HTTP ${response.status}`)
        throw new Error(message)
      }

      hapticFeedback.notification('success')
      alert((i18n.language === 'ru' ? 'Уведомления отправлены: ' : 'Notifications sent: ') + JSON.stringify(responseData))
    } catch (err) {
      console.error('Test notifications error:', err)
      alert((i18n.language === 'ru' ? 'Ошибка отправки: ' : 'Send error: ') + (err?.message || JSON.stringify(err)))
    } finally {
      setIsTestingNotifications(false)
    }
  }

  function exportData() {
    hapticFeedback.impact('light')
    try {
      const storedSymptoms = localStorage.getItem('cicle_symptoms')
      const storedSettings = localStorage.getItem('cicle_settings')
      const storedProfile = localStorage.getItem('cicle_fallback_profile')
      const data = {
        exported_at: new Date().toISOString(),
        cycles,
        symptoms: storedSymptoms ? JSON.parse(storedSymptoms) : [],
        settings: storedSettings ? JSON.parse(storedSettings) : (settings || {}),
        profile: profile || (storedProfile ? JSON.parse(storedProfile) : {}),
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cicle-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
      alert(i18n.language === 'ru' ? 'Ошибка экспорта' : 'Export failed')
    }
  }

  const lang = i18n.language === 'ru' ? 'ru' : 'en'
  const tLocal = {
    ru: {
      daysBeforePeriod: 'За сколько дней предупреждать о месячных',
      daysBeforeOvulation: 'За сколько дней предупреждать об овуляции',
      notifyTime: 'Время уведомлений',
      saveAll: 'Сохранить все',
      saved: '✓ Сохранено',
      data: 'Данные',
      exportData: 'Экспортировать данные (JSON)',
      info: 'Уведомления работают через Telegram бота и Supabase Edge Functions. Убедитесь, что они настроены.',
    },
    en: {
      daysBeforePeriod: 'Days before period to notify',
      daysBeforeOvulation: 'Days before ovulation to notify',
      notifyTime: 'Notification time',
      saveAll: 'Save all',
      saved: '✓ Saved',
      data: 'Data',
      exportData: 'Export data (JSON)',
      info: 'Notifications work via Telegram bot and Supabase Edge Functions. Make sure they are configured.',
    },
  }[lang]

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
                  : 'bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20'
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
      <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-4">
        <div className="flex items-center gap-2 text-[var(--tg-theme-text-color,#111827)]">
          <Bell size={20} className="text-teal-500" />
          <span className="font-semibold">{t('settings.notifications')}</span>
        </div>

        <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 cursor-pointer">
          <span className="text-sm font-medium">{t('settings.notifyPeriod')}</span>
          <input
            type="checkbox"
            checked={notifyPeriod}
            onChange={(e) => setNotifyPeriod(e.target.checked)}
            className="w-5 h-5 accent-[var(--tg-theme-button-color,#e11d48)]"
          />
        </label>

        {notifyPeriod && (
          <div className="space-y-2 pl-2">
            <label className="text-xs font-medium text-[var(--tg-theme-hint-color,#6b7280)]">{tLocal.daysBeforePeriod}</label>
            <input
              type="range"
              min="1"
              max="7"
              value={periodReminderDays}
              onChange={(e) => setPeriodReminderDays(Number(e.target.value))}
              className="w-full accent-[var(--tg-theme-button-color,#e11d48)]"
            />
            <div className="flex justify-between text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
              <span>1</span>
              <span className="font-bold text-[var(--tg-theme-text-color,#111827)]">{periodReminderDays} {t('analytics.days')}</span>
              <span>7</span>
            </div>
          </div>
        )}

        <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 cursor-pointer">
          <span className="text-sm font-medium">{t('settings.notifyOvulation')}</span>
          <input
            type="checkbox"
            checked={notifyOvulation}
            onChange={(e) => setNotifyOvulation(e.target.checked)}
            className="w-5 h-5 accent-[var(--tg-theme-button-color,#e11d48)]"
          />
        </label>

        {notifyOvulation && (
          <div className="space-y-2 pl-2">
            <label className="text-xs font-medium text-[var(--tg-theme-hint-color,#6b7280)]">{tLocal.daysBeforeOvulation}</label>
            <input
              type="range"
              min="1"
              max="5"
              value={ovulationReminderDays}
              onChange={(e) => setOvulationReminderDays(Number(e.target.value))}
              className="w-full accent-[var(--tg-theme-button-color,#e11d48)]"
            />
            <div className="flex justify-between text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
              <span>1</span>
              <span className="font-bold text-[var(--tg-theme-text-color,#111827)]">{ovulationReminderDays} {t('analytics.days')}</span>
              <span>5</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--tg-theme-hint-color,#6b7280)]">
            <Clock size={14} />
            {tLocal.notifyTime}
          </label>
          <input
            type="time"
            value={notifyTime}
            onChange={(e) => setNotifyTime(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-bg-color,#ffffff)] text-center"
          />
        </div>
      </div>

      {/* Data Export */}
      <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-3">
        <div className="flex items-center gap-2 text-[var(--tg-theme-text-color,#111827)]">
          <Download size={20} className="text-blue-500" />
          <span className="font-semibold">{tLocal.data}</span>
        </div>
        <button
          onClick={testNotifications}
          disabled={isTestingNotifications}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors disabled:opacity-60"
        >
          {isTestingNotifications ? <Spinner size={18} /> : <Send size={18} />}
          {i18n.language === 'ru' ? 'Отправить тестовое уведомление' : 'Send test notification'}
        </button>
        <button
          onClick={exportData}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors"
        >
          <Download size={18} />
          {tLocal.exportData}
        </button>
        <button
          onClick={() => {
            hapticFeedback.impact('medium')
            setShowDeleteDialog(true)
          }}
          disabled={isDeleting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-semibold hover:bg-red-100 transition-colors disabled:opacity-60"
        >
          {isDeleting ? <Spinner size={18} /> : <Trash2 size={18} />}
          {i18n.language === 'ru' ? 'Удалить все данные' : 'Delete all data'}
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 text-amber-800">
        <Info size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm">{tLocal.info}</p>
      </div>

      {/* Save button and confirmation */}
      <div className="space-y-2">
        <button
          onClick={saveAllSettings}
          disabled={profileLoading || settingsLoading}
          className="w-full py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {(profileLoading || settingsLoading) && <Spinner size={18} />}
          {tLocal.saveAll}
        </button>
        {saved && (
          <p className="text-center text-sm text-green-600 font-medium">
            {tLocal.saved}
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title={i18n.language === 'ru' ? 'Удалить все данные' : 'Delete all data'}
        message={i18n.language === 'ru'
          ? 'Все ваши циклы, симптомы, настройки и профиль будут безвозвратно удалены. Это действие нельзя отменить.'
          : 'All your cycles, symptoms, settings and profile will be permanently deleted. This action cannot be undone.'}
        confirmText={i18n.language === 'ru' ? 'Удалить' : 'Delete'}
        cancelText={i18n.language === 'ru' ? 'Отмена' : 'Cancel'}
        destructive
        onConfirm={deleteAllData}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  )
}
