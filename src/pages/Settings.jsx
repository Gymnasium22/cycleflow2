import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Bell, Moon, Info, Download, Clock, Trash2, Send, MapPin, Palette, Pill } from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { MedicationList } from '../components/MedicationList'
import { MedicationLog } from '../components/MedicationLog'
import { useTelegram } from '../context/TelegramContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useSettings } from '../hooks/useSettings'
import { useCycles } from '../hooks/useCycles'
import { useMedications } from '../hooks/useMedications'
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
} from '../utils/cycle'
import { applyTheme, AVAILABLE_THEMES } from '../utils/theme'
import { buildExportCsv, downloadTextFile } from '../utils/export'

const THEME_BACKGROUNDS = {
  telegram: 'from-blue-400 to-blue-600',
  sakura: 'from-rose-400 to-rose-600',
  lavender: 'from-violet-400 to-violet-600',
  teal: 'from-teal-400 to-teal-600',
  midnight: 'bg-[#0f172a]',
}

export function Settings() {
  const { t, i18n } = useTranslation()
  const { profile, updateProfile, isLoading: profileLoading } = useAuth()
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings()
  const { cycles } = useCycles()

  const [language, setLanguage] = useState(i18n.language || 'ru')
  const [theme, setTheme] = useState(() => localStorage.getItem('cicle_theme') || 'sakura')

  const handleThemeChange = (newTheme) => {
    hapticFeedback.impact('light')
    setTheme(newTheme)
    localStorage.setItem('cicle_theme', newTheme)
    applyTheme(newTheme)
    showSavedMessage()
  }
  const [cycleLength, setCycleLength] = useState(profile?.cycle_length || DEFAULT_CYCLE_LENGTH)
  const [periodLength, setPeriodLength] = useState(profile?.period_length || DEFAULT_PERIOD_LENGTH)
  const [timezone, setTimezone] = useState(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const [notifyPeriod, setNotifyPeriod] = useState(settings?.notify_period ?? true)
  const [notifyOvulation, setNotifyOvulation] = useState(settings?.notify_ovulation ?? false)
  const [periodReminderDays, setPeriodReminderDays] = useState(settings?.period_reminder_days ?? 2)
  const [ovulationReminderDays, setOvulationReminderDays] = useState(settings?.ovulation_reminder_days ?? 1)
  const [notifyTime, setNotifyTime] = useState(settings?.notify_time ?? '09:00')
  const [saved, setSaved] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showMedicationLog, setShowMedicationLog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTestingNotifications, setIsTestingNotifications] = useState(false)

  const { hapticFeedback } = useTelegram()
  const {
    medications,
    loading: medicationsLoading,
    isLoading: medicationsSaving,
    saveMedication,
    deleteMedication,
    toggleReminder,
  } = useMedications()



  const showSavedMessage = useCallback(() => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  // Sync profile into local state
  useEffect(() => {
    if (profile) {
      setCycleLength(profile.cycle_length || DEFAULT_CYCLE_LENGTH)
      setPeriodLength(profile.period_length || DEFAULT_PERIOD_LENGTH)
      setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
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

  const handleLanguageChange = (langCode) => {
    hapticFeedback.impact('light')
    setLanguage(langCode)
    i18n.changeLanguage(langCode)
    localStorage.setItem('i18nextLng', langCode)
    updateProfile({ language_code: langCode })
    showSavedMessage()
  }

  function handleDetectTimezone() {
    hapticFeedback.impact('light')
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    setTimezone(detected)
  }

  async function deleteAllData() {
    setIsDeleting(true)
    hapticFeedback.notification('warning')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        throw new Error(t('settings.errors.noSession'))
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
      alert(t('settings.errors.deleteFailed') + (err?.message || JSON.stringify(err) || 'Unknown error'))
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
      updateProfile({ cycle_length: cycleLength, period_length: periodLength, timezone }),
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
        throw new Error(t('settings.errors.noSessionTelegram'))
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
          ? t('settings.errors.jwtExpired')
          : (responseData?.error || responseData?.message || `HTTP ${response.status}`)
        throw new Error(message)
      }

      hapticFeedback.notification('success')
      alert(t('settings.errors.notificationsSent') + JSON.stringify(responseData))
    } catch (err) {
      console.error('Test notifications error:', err)
      alert(t('settings.errors.sendFailed') + (err?.message || JSON.stringify(err)))
    } finally {
      setIsTestingNotifications(false)
    }
  }

  function getExportSymptoms() {
    try {
      const storedSymptoms = localStorage.getItem('cicle_symptoms')
      return storedSymptoms ? JSON.parse(storedSymptoms) : []
    } catch {
      return []
    }
  }

  function getExportDayNotes() {
    try {
      const stored = localStorage.getItem('cicle_day_notes')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  function exportData() {
    hapticFeedback.impact('light')
    try {
      const storedSettings = localStorage.getItem('cicle_settings')
      const storedProfile = localStorage.getItem('cicle_fallback_profile')
      const data = {
        exported_at: new Date().toISOString(),
        cycles,
        symptoms: getExportSymptoms(),
        day_notes: getExportDayNotes(),
        settings: storedSettings ? JSON.parse(storedSettings) : (settings || {}),
        profile: profile || (storedProfile ? JSON.parse(storedProfile) : {}),
      }
      downloadTextFile(
        `cicle-export-${new Date().toISOString().split('T')[0]}.json`,
        JSON.stringify(data, null, 2),
        'application/json'
      )
    } catch (e) {
      console.error('Export failed:', e)
      alert(t('settings.errors.exportFailed'))
    }
  }

  function exportCsv() {
    hapticFeedback.impact('light')
    try {
      const storedProfile = localStorage.getItem('cicle_fallback_profile')
      const csv = buildExportCsv({
        cycles,
        symptoms: getExportSymptoms(),
        dayNotes: getExportDayNotes(),
        profile: profile || (storedProfile ? JSON.parse(storedProfile) : {}),
        lang: i18n.language === 'ru' ? 'ru' : 'en',
      })
      downloadTextFile(
        `cicle-export-${new Date().toISOString().split('T')[0]}.csv`,
        csv,
        'text/csv;charset=utf-8'
      )
    } catch (e) {
      console.error('CSV export failed:', e)
      alert(t('settings.errors.exportCsvFailed'))
    }
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
          {['ru', 'en'].map((langCode) => (
            <button
              key={langCode}
              onClick={() => handleLanguageChange(langCode)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                language === langCode
                  ? 'bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)]'
                  : 'bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20'
              }`}
            >
              {t(`settings.languageNames.${langCode}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Theme Selection */}
      <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-3">
        <div className="flex items-center gap-2 text-[var(--tg-theme-text-color,#111827)]">
          <Palette size={20} className="text-pink-500" />
          <span className="font-semibold">{t('settings.theme')}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_THEMES.map((themeId) => (
            <button
              key={themeId}
              onClick={() => handleThemeChange(themeId)}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all relative overflow-hidden flex items-center justify-between border ${
                theme === themeId
                  ? 'border-[var(--tg-theme-button-color,#e11d48)] bg-[var(--tg-theme-button-color,#e11d48)]/10 text-[var(--tg-theme-text-color,#111827)] shadow-sm'
                  : 'border-[var(--tg-theme-hint-color,#d1d5db)]/20 bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/10'
              }`}
            >
              <span>{t(`settings.themes.${themeId}`)}</span>
              <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${THEME_BACKGROUNDS[themeId]} border border-white/20`} />
            </button>
          ))}
        </div>
      </div>

      {/* Timezone */}
      <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-3">
        <div className="flex items-center gap-2 text-[var(--tg-theme-text-color,#111827)]">
          <MapPin size={20} className="text-blue-500" />
          <span className="font-semibold">{t('settings.timezone')}</span>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-[var(--tg-theme-text-color,#111827)] font-medium">{timezone}</p>
          <p className="flex items-start gap-1 text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
            <Info size={12} className="shrink-0 mt-0.5" />
            {t('settings.timezoneHint')}
          </p>
          <button
            onClick={handleDetectTimezone}
            className="w-full py-2 rounded-xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 text-[var(--tg-theme-text-color,#111827)] text-sm font-semibold hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors"
          >
            {t('settings.detectTimezone')}
          </button>
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
            <label className="text-xs font-medium text-[var(--tg-theme-hint-color,#6b7280)]">{t('settings.daysBeforePeriod')}</label>
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
            <p className="flex items-start gap-1 text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
              <Info size={12} className="shrink-0 mt-0.5" />
              {t('settings.periodDaysHint')}
            </p>
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
            <label className="text-xs font-medium text-[var(--tg-theme-hint-color,#6b7280)]">{t('settings.daysBeforeOvulation')}</label>
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
            <p className="flex items-start gap-1 text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
              <Info size={12} className="shrink-0 mt-0.5" />
              {t('settings.ovulationDaysHint')}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--tg-theme-hint-color,#6b7280)]">
            <Clock size={14} />
            {t('settings.notifyTime')}
          </label>
          <input
            type="time"
            value={notifyTime}
            onChange={(e) => setNotifyTime(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-bg-color,#ffffff)] text-center"
          />
          <p className="flex items-start gap-1 text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
            <Info size={12} className="shrink-0 mt-0.5" />
            {t('settings.notifyTimeHint')}
          </p>
        </div>
      </div>

      {/* Medications */}
      <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-3">
        <div className="flex items-center gap-2 text-[var(--tg-theme-text-color,#111827)]">
          <Pill size={20} className="text-emerald-500" />
          <span className="font-semibold">{t('settings.medications.title')}</span>
        </div>
        <p className="flex items-start gap-1 text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
          <Info size={12} className="shrink-0 mt-0.5" />
          {t('settings.medicationsHint')}
        </p>
        <MedicationList
          medications={medications}
          isLoading={medicationsLoading || medicationsSaving}
          onSaveMedication={saveMedication}
          onDeleteMedication={deleteMedication}
          onToggleReminder={toggleReminder}
          onOpenHistory={() => setShowMedicationLog(true)}
        />
      </div>

      {/* Data Export */}
      <div className="rounded-2xl p-4 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] space-y-3">
        <div className="flex items-center gap-2 text-[var(--tg-theme-text-color,#111827)]">
          <Download size={20} className="text-blue-500" />
          <span className="font-semibold">{t('settings.data')}</span>
        </div>
        <button
          onClick={testNotifications}
          disabled={isTestingNotifications}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors disabled:opacity-60"
        >
          {isTestingNotifications ? <Spinner size={18} /> : <Send size={18} />}
          {t('settings.testNotification')}
        </button>
        <button
          onClick={exportData}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors"
        >
          <Download size={18} />
          {t('settings.exportJson')}
        </button>
        <button
          onClick={exportCsv}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-bg-color,#ffffff)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors"
        >
          <Download size={18} />
          {t('settings.exportCsv')}
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
          {t('settings.deleteAllData')}
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 text-amber-800">
        <Info size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm">{t('settings.info')}</p>
      </div>

      {/* Save button and confirmation */}
      <div className="space-y-2">
        <button
          onClick={saveAllSettings}
          disabled={profileLoading || settingsLoading}
          className="w-full py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {(profileLoading || settingsLoading) && <Spinner size={18} />}
          {t('settings.saveAll')}
        </button>
        {saved && (
          <p className="text-center text-sm text-green-600 font-medium">
            {t('common.saved')}
          </p>
        )}
      </div>

      <MedicationLog
        isOpen={showMedicationLog}
        onClose={() => setShowMedicationLog(false)}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title={t('settings.deleteAllData')}
        message={t('settings.deleteAllMessage')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        destructive
        onConfirm={deleteAllData}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  )
}
