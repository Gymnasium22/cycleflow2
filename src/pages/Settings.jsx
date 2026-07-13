import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Globe,
  Bell,
  Moon,
  Info,
  Download,
  Clock,
  Trash2,
  MapPin,
  Palette,
  FileText,
  Crown,
  Star,
  Users,
  Share2,
  Shield,
  Scale,
  Copy,
  CalendarPlus,
} from 'lucide-react'
import { Spinner } from '../components/Spinner'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PremiumPaywall } from '../components/PremiumPaywall'
import { CustomSymptomsPanel } from '../components/CustomSymptomsPanel'
import { PartnerSharePanel } from '../components/PartnerSharePanel'
import { useTelegram } from '../context/TelegramContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { useSettings } from '../hooks/useSettings'
import { useCycles } from '../hooks/useCycles'
import { usePremium } from '../hooks/usePremium'
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  getAverageCycleLength,
  getAveragePeriodLength,
  getNextPeriodDateFromHistory,
  getUpcomingOvulationDateFromHistory,
  getPhaseForDate,
  toISODateString,
} from '../utils/cycle'
import { persistTheme, AVAILABLE_THEMES, THEME_STORAGE_KEY } from '../utils/theme'
import { createDebouncedSaver, normalizeNotifyTime } from '../utils/settingsDraft'
import { buildExportCsv, downloadTextFile } from '../utils/export'
import { downloadDoctorReport } from '../utils/doctorReport'
import { buildForecastIcs, downloadIcs } from '../utils/calendarExport'
import { copyText, openTelegramShare } from '../lib/clipboard'
import { getReferralMiniAppLink } from '../lib/botLinks'

const THEME_BACKGROUNDS = {
  telegram: 'from-blue-400 to-blue-600',
  sakura: 'from-rose-400 to-rose-600',
  lavender: 'from-violet-400 to-violet-600',
  teal: 'from-[#D4C4E4] to-[#9B8EC4]',
  midnight: 'bg-[#0f172a]',
}

export function Settings() {
  const { t, i18n } = useTranslation()
  const { profile, updateProfile, isLoading: profileLoading } = useAuth()
  const { settings, updateSettings, isLoading: settingsLoading } = useSettings()
  const { cycles } = useCycles()
  const {
    premium,
    daysLeft,
    canDoctorPdf,
    reportCredits,
    purchase,
    purchasing,
    ensureReferralCode,
    referralCode,
  } = usePremium()

  const [language, setLanguage] = useState(i18n.language || 'ru')
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'sakura'
    } catch {
      return 'sakura'
    }
  })
  const [cycleLength, setCycleLength] = useState(profile?.cycle_length || DEFAULT_CYCLE_LENGTH)
  const [periodLength, setPeriodLength] = useState(profile?.period_length || DEFAULT_PERIOD_LENGTH)
  const [timezone, setTimezone] = useState(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const [notifyPeriod, setNotifyPeriod] = useState(settings?.notify_period ?? true)
  const [notifyOvulation, setNotifyOvulation] = useState(settings?.notify_ovulation ?? false)
  const [periodReminderDays, setPeriodReminderDays] = useState(settings?.period_reminder_days ?? 2)
  const [ovulationReminderDays, setOvulationReminderDays] = useState(settings?.ovulation_reminder_days ?? 1)
  const [notifyTime, setNotifyTime] = useState(normalizeNotifyTime(settings?.notify_time) || '09:00')
  const [saved, setSaved] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [showPremium, setShowPremium] = useState(false)
  const [paywallMode, setPaywallMode] = useState('premium')
  const [shareHint, setShareHint] = useState(false)

  const { hapticFeedback, webApp } = useTelegram()
  const { showToast } = useToast()
  const [savePulse, setSavePulse] = useState(false)

  // Skip hydrating-triggered auto-save once after load
  const skipAutoSaveRef = useRef(true)
  const hydratedRef = useRef(false)
  const updateSettingsRef = useRef(updateSettings)
  const updateProfileRef = useRef(updateProfile)
  updateSettingsRef.current = updateSettings
  updateProfileRef.current = updateProfile

  const showSavedMessage = useCallback(() => {
    setSaved(true)
    setSavePulse(true)
    showToast(t('common.saved'))
    hapticFeedback.notification('success')
    setTimeout(() => setSaved(false), 2000)
    setTimeout(() => setSavePulse(false), 600)
  }, [showToast, t, hapticFeedback])

  // Debounced savers that FLUSH on unmount (leaving Settings tab used to cancel timers)
  const settingsSaverRef = useRef(null)
  const profileSaverRef = useRef(null)
  if (!settingsSaverRef.current) {
    settingsSaverRef.current = createDebouncedSaver(async (payload) => {
      const result = await updateSettingsRef.current(payload)
      showSavedMessage()
      return result
    }, 350)
  }
  if (!profileSaverRef.current) {
    profileSaverRef.current = createDebouncedSaver(async (payload) => {
      const result = await updateProfileRef.current(payload)
      showSavedMessage()
      return result
    }, 450)
  }

  // Hydrate form from cache/server only while auto-save is still locked.
  // After the user can edit, do not overwrite local controls from async fetches.
  useEffect(() => {
    if (!settings || !skipAutoSaveRef.current) return
    setNotifyPeriod(settings.notify_period ?? true)
    setNotifyOvulation(settings.notify_ovulation ?? false)
    setPeriodReminderDays(settings.period_reminder_days ?? 2)
    setOvulationReminderDays(settings.ovulation_reminder_days ?? 1)
    setNotifyTime(normalizeNotifyTime(settings.notify_time))
  }, [settings])

  useEffect(() => {
    if (profile && skipAutoSaveRef.current) {
      setCycleLength(profile.cycle_length || DEFAULT_CYCLE_LENGTH)
      setPeriodLength(profile.period_length || DEFAULT_PERIOD_LENGTH)
      setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
    }
  }, [profile])

  useEffect(() => {
    if (hydratedRef.current) return
    // Unlock auto-save after first paint with whatever cache we already have
    hydratedRef.current = true
    const t = setTimeout(() => {
      skipAutoSaveRef.current = false
    }, 450)
    return () => clearTimeout(t)
  }, [])

  // Schedule settings save when notification fields change
  useEffect(() => {
    if (skipAutoSaveRef.current) return
    settingsSaverRef.current.schedule({
      notify_period: notifyPeriod,
      notify_ovulation: notifyOvulation,
      period_reminder_days: periodReminderDays,
      ovulation_reminder_days: ovulationReminderDays,
      notify_time: notifyTime,
    })
  }, [notifyPeriod, notifyOvulation, periodReminderDays, ovulationReminderDays, notifyTime])

  // Schedule profile save for cycle length / timezone
  useEffect(() => {
    if (skipAutoSaveRef.current) return
    profileSaverRef.current.schedule({
      cycle_length: cycleLength,
      period_length: periodLength,
      timezone,
    })
  }, [cycleLength, periodLength, timezone])

  // CRITICAL: flush pending debounced saves when leaving Settings (tab switch unmounts page)
  useEffect(() => {
    return () => {
      settingsSaverRef.current?.flush()
      profileSaverRef.current?.flush()
    }
  }, [])

  useEffect(() => {
    ensureReferralCode()
  }, [ensureReferralCode])

  const handleThemeChange = (newTheme) => {
    hapticFeedback.impact('light')
    const applied = persistTheme(newTheme)
    setTheme(applied)
    showSavedMessage()
  }

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
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        throw new Error(t('settings.errors.noSession'))
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-all-data`
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete data')
      }

      localStorage.clear()
      hapticFeedback.notification('success')
      await supabase.auth.signOut()
      window.location.reload()
    } catch (err) {
      console.error('Delete all data error:', err?.message, err?.stack, JSON.stringify(err), err)
      alert(t('settings.errors.deleteFailed') + (err?.message || JSON.stringify(err) || 'Unknown error'))
      setIsDeleting(false)
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

  async function exportDoctorPdf() {
    hapticFeedback.impact('light')
    if (!canDoctorPdf) {
      setPaywallMode('doctor_report')
      setShowPremium(true)
      return
    }
    setIsExportingPdf(true)
    try {
      const storedProfile = localStorage.getItem('cicle_fallback_profile')
      await downloadDoctorReport({
        cycles,
        symptoms: getExportSymptoms(),
        dayNotes: getExportDayNotes(),
        profile: profile || (storedProfile ? JSON.parse(storedProfile) : {}),
        lang: i18n.language === 'ru' ? 'ru' : 'en',
        appName: t('app.title'),
        labels: {
          title: t('settings.doctorReport.title', { app: t('app.title') }),
          generated: t('settings.doctorReport.generated'),
          summary: t('settings.doctorReport.summary'),
          avgCycle: t('analytics.averageCycle'),
          avgPeriod: t('analytics.averagePeriod'),
          cyclesCount: t('analytics.cyclesCount'),
          regularity: t('analytics.regularityIndex'),
          days: t('analytics.days'),
          cyclesTable: t('settings.doctorReport.cyclesTable'),
          noCycles: t('settings.doctorReport.noCycles'),
          ongoing: t('settings.doctorReport.ongoing'),
          period: t('settings.doctorReport.period'),
          note: t('settings.doctorReport.note'),
          symptomsByPhase: t('settings.doctorReport.symptomsByPhase'),
          recentSymptoms: t('settings.doctorReport.recentSymptoms'),
          dayNotes: t('settings.doctorReport.dayNotes'),
          intensity: t('settings.doctorReport.intensity'),
          disclaimer: t('settings.doctorReport.disclaimer'),
          phases: {
            menstruation: t('home.phase.menstruation'),
            follicular: t('home.phase.follicular'),
            ovulation: t('home.phase.ovulation'),
            luteal: t('home.phase.luteal'),
          },
        },
      })
      // Consume one credit if not premium
      if (!premium && reportCredits > 0 && profile) {
        await updateProfile({ doctor_report_credits: Math.max(0, reportCredits - 1) })
      }
      hapticFeedback.notification('success')
    } catch (e) {
      console.error('PDF export failed:', e)
      alert(t('settings.errors.exportPdfFailed'))
    } finally {
      setIsExportingPdf(false)
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

  function getReferralLink(code) {
    // Opens Mini App directly: t.me/my_cicle_bot/MyCycle?startapp=ref_...
    return getReferralMiniAppLink(code)
  }

  async function copyReferral() {
    hapticFeedback.impact('light')
    const code = referralCode || (await ensureReferralCode())
    if (!code) {
      showToast(t('referral.copyFailed'))
      return
    }
    const link = getReferralLink(code)
    const text = t('referral.shareText', { link, app: t('app.title') })
    const ok = await copyText(text)
    if (ok) {
      setShareHint(true)
      showToast(t('referral.copied'))
      setTimeout(() => setShareHint(false), 2500)
    } else {
      // Last resort: show link via Telegram popup so user can long-press
      try {
        webApp?.showPopup?.({
          title: t('referral.title'),
          message: link,
          buttons: [{ type: 'close' }],
        })
      } catch {
        showToast(t('referral.copyFailed'))
      }
    }
  }

  async function shareReferral() {
    hapticFeedback.impact('light')
    const code = referralCode || (await ensureReferralCode())
    if (!code) {
      showToast(t('referral.copyFailed'))
      return
    }
    const link = getReferralLink(code)
    const text = t('referral.shareText', { link, app: t('app.title') })

    // 1) Telegram native share sheet (most reliable in Mini Apps)
    if (openTelegramShare(link, text)) {
      return
    }

    // 2) Web Share API
    try {
      if (navigator.share) {
        await navigator.share({ title: t('app.title'), text, url: link })
        return
      }
    } catch {
      // cancelled or unsupported — fall through to copy
    }

    // 3) Copy
    await copyReferral()
  }

  function exportCalendarIcs() {
    hapticFeedback.impact('light')
    try {
      const avgC = getAverageCycleLength(cycles, cycleLength)
      const avgP = getAveragePeriodLength(cycles, periodLength)
      const ics = buildForecastIcs({
        cycles,
        cycleLength: avgC,
        periodLength: avgP,
        count: 6,
        appName: t('app.title'),
        labels: {
          period: t('calendarExport.period'),
          ovulation: t('calendarExport.ovulation'),
          periodHint: t('calendarExport.periodHint'),
          ovulationHint: t('calendarExport.ovulationHint'),
        },
      })
      downloadIcs(`kolechko-forecast-${toISODateString(new Date())}.ics`, ics)
      showToast(t('calendarExport.done'))
      hapticFeedback.notification('success')
    } catch (e) {
      console.error(e)
      showToast(t('calendarExport.failed'))
    }
  }

  async function handleCopyAny(text, toastMsg) {
    const ok = await copyText(text)
    if (ok) showToast(toastMsg || t('referral.copied'))
    else showToast(t('referral.copyFailed'))
  }

  return (
    <div className="space-y-4 pb-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <h1 className="page-title">{t('settings.title')}</h1>
        {saved && (
          <span className="text-xs font-medium text-[var(--accent-success-deep)] animate-fade-in">
            {t('common.saved')}
          </span>
        )}
      </div>

      {/* Premium / Stars */}
      <div className="card-elevated p-4 space-y-3 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-rose-500/5">
        <div className="flex items-center gap-2 text-[var(--tg-theme-text-color,#111827)]">
          <Crown size={20} className="text-amber-500" />
          <span className="font-semibold">{t('premium.title')}</span>
        </div>
        {premium ? (
          <p className="text-sm text-[var(--tg-theme-hint-color,#4b5563)]">
            {t('premium.activeDays', { count: daysLeft })}
          </p>
        ) : (
          <p className="text-sm text-[var(--tg-theme-hint-color,#4b5563)]">{t('premium.settingsHint')}</p>
        )}
        <button
          type="button"
          onClick={() => {
            setPaywallMode('premium')
            setShowPremium(true)
          }}
          disabled={purchasing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-semibold shadow-md shadow-rose-500/15 active:scale-[0.99]"
        >
          <Star size={18} className="fill-white" />
          {premium ? t('premium.extend') : t('premium.upgrade')}
        </button>
        <button
          type="button"
          onClick={() => purchase('premium_1m')}
          disabled={purchasing}
          className="w-full text-xs text-center text-[var(--tg-theme-hint-color,#6b7280)] hover:underline"
        >
          {t('premium.quickBuy1m')}
        </button>
      </div>

      {/* Referral — free viral loop */}
      <div className="card-elevated p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-violet-500" aria-hidden />
          <span className="font-semibold">{t('referral.title')}</span>
        </div>
        <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)]">{t('referral.hint')}</p>
        {referralCode && (
          <>
            <p className="text-xs font-mono px-3 py-2 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/25 break-all">
              {getReferralLink(referralCode)}
            </p>
            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getReferralLink(referralCode))}`}
                alt={t('referral.qrAlt')}
                width={160}
                height={160}
                className="rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/25 bg-white p-2"
                loading="lazy"
              />
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copyReferral}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/25 font-semibold text-sm"
          >
            <Copy size={16} aria-hidden />
            {t('referral.copy')}
          </button>
          <button
            type="button"
            onClick={shareReferral}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold text-sm"
          >
            <Share2 size={16} aria-hidden />
            {t('referral.share')}
          </button>
        </div>
        {shareHint && (
          <p className="text-xs text-center text-[var(--accent-success-deep)]">{t('referral.copied')}</p>
        )}
      </div>

      <CustomSymptomsPanel
        isPremium={premium}
        onNeedPremium={() => {
          setPaywallMode('premium')
          setShowPremium(true)
        }}
      />

      <PartnerSharePanel
        isPremium={premium}
        onNeedPremium={() => {
          setPaywallMode('premium')
          setShowPremium(true)
        }}
        snapshotArgs={{
          cycles,
          avgCycle: getAverageCycleLength(cycles, cycleLength),
          avgPeriod: getAveragePeriodLength(cycles, periodLength),
          nextPeriod: getNextPeriodDateFromHistory(cycles, getAverageCycleLength(cycles, cycleLength)),
          ovulation: getUpcomingOvulationDateFromHistory(cycles, getAverageCycleLength(cycles, cycleLength)),
          phase: getPhaseForDate(new Date(), cycles, getAverageCycleLength(cycles, cycleLength), getAveragePeriodLength(cycles, periodLength)),
          streak: profile?.log_streak || 0,
        }}
        onCopy={handleCopyAny}
        onToast={showToast}
      />

      {/* Language */}
      <div className="card-elevated p-4 space-y-3">
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
                  : 'bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20'
              }`}
            >
              {t(`settings.languageNames.${langCode}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Theme Selection */}
      <div className="card-elevated p-4 space-y-3">
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
                  : 'border-[var(--tg-theme-hint-color,#d1d5db)]/20 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-[var(--tg-theme-text-color,#111827)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/10'
              }`}
            >
              <span>{t(`settings.themes.${themeId}`)}</span>
              <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${THEME_BACKGROUNDS[themeId]} border border-white/20`} />
            </button>
          ))}
        </div>
      </div>

      {/* Timezone */}
      <div className="card-elevated p-4 space-y-3">
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
            className="w-full py-2 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 text-[var(--tg-theme-text-color,#111827)] text-sm font-semibold hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors"
          >
            {t('settings.detectTimezone')}
          </button>
        </div>
      </div>

      {/* Cycle settings — auto-saved */}
      <div className={`card-elevated p-4 space-y-4 transition-shadow duration-500 ${savePulse ? 'ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-500/10' : ''}`}>
        <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)]">{t('settings.autoSaveHint')}</p>
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
            onChange={(e) => {
              hapticFeedback.impact('light')
              setCycleLength(Number(e.target.value))
            }}
            className="w-full accent-[var(--tg-theme-button-color,#e11d48)]"
          />
          <div className="flex justify-between text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
            <span>21</span>
            <span className="font-bold text-[var(--tg-theme-text-color,#111827)]">
              {cycleLength} {t('analytics.days')}
            </span>
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
            onChange={(e) => {
              hapticFeedback.impact('light')
              setPeriodLength(Number(e.target.value))
            }}
            className="w-full accent-[var(--tg-theme-button-color,#e11d48)]"
          />
          <div className="flex justify-between text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
            <span>2</span>
            <span className="font-bold text-[var(--tg-theme-text-color,#111827)]">
              {periodLength} {t('analytics.days')}
            </span>
            <span>8</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card-elevated p-4 space-y-4">
        <div className="flex items-center gap-2 text-[var(--tg-theme-text-color,#111827)]">
          <Bell size={20} className="text-[var(--phase-ovulation-deep)]" />
          <span className="font-semibold">{t('settings.notifications')}</span>
        </div>

        <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 cursor-pointer">
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
            <label className="text-xs font-medium text-[var(--tg-theme-hint-color,#6b7280)]">
              {t('settings.daysBeforePeriod')}
            </label>
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
              <span className="font-bold text-[var(--tg-theme-text-color,#111827)]">
                {periodReminderDays} {t('analytics.days')}
              </span>
              <span>7</span>
            </div>
            <p className="flex items-start gap-1 text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
              <Info size={12} className="shrink-0 mt-0.5" />
              {t('settings.periodDaysHint')}
            </p>
          </div>
        )}

        <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 cursor-pointer">
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
            <label className="text-xs font-medium text-[var(--tg-theme-hint-color,#6b7280)]">
              {t('settings.daysBeforeOvulation')}
            </label>
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
              <span className="font-bold text-[var(--tg-theme-text-color,#111827)]">
                {ovulationReminderDays} {t('analytics.days')}
              </span>
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
            className="w-full px-4 py-2 rounded-xl border border-[var(--tg-theme-hint-color,#d1d5db)]/50 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-center"
          />
          <p className="flex items-start gap-1 text-xs text-[var(--tg-theme-hint-color,#6b7280)]">
            <Info size={12} className="shrink-0 mt-0.5" />
            {t('settings.notifyTimeHint')}
          </p>
        </div>
      </div>

      {/* Data Export */}
      <div className="card-elevated p-4 space-y-3">
        <div className="flex items-center gap-2 text-[var(--tg-theme-text-color,#111827)]">
          <Download size={20} className="text-blue-500" />
          <span className="font-semibold">{t('settings.data')}</span>
        </div>
        <p className="text-xs text-[var(--text-muted)]">{t('settings.exportHint')}</p>
        <button
          type="button"
          onClick={exportCalendarIcs}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/25 text-[var(--tg-theme-text-color,#111827)] font-semibold"
        >
          <CalendarPlus size={18} aria-hidden />
          {t('calendarExport.button')}
        </button>
        <button
          onClick={exportDoctorPdf}
          disabled={isExportingPdf}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {isExportingPdf ? <Spinner size={18} /> : <FileText size={18} />}
          {t('settings.exportDoctorPdf')}
          {!canDoctorPdf && (
            <span className="text-[10px] opacity-90 flex items-center gap-0.5">
              <Star size={10} /> 75
            </span>
          )}
        </button>
        <button
          onClick={exportCsv}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/20 text-[var(--tg-theme-text-color,#111827)] font-semibold hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20 transition-colors"
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
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-600 font-semibold hover:bg-red-500/15 transition-colors disabled:opacity-60"
        >
          {isDeleting ? <Spinner size={18} /> : <Trash2 size={18} />}
          {t('settings.deleteAllData')}
        </button>
      </div>

      {/* Legal */}
      <div className="card-elevated p-4 space-y-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('cicle:open-legal', { detail: 'privacy' }))}
          className="w-full flex items-center gap-2 py-2.5 text-sm font-medium text-left hover:opacity-80"
        >
          <Shield size={16} className="text-blue-500" />
          {t('legal.privacy')}
        </button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('cicle:open-legal', { detail: 'terms' }))}
          className="w-full flex items-center gap-2 py-2.5 text-sm font-medium text-left hover:opacity-80"
        >
          <Scale size={16} className="text-violet-500" />
          {t('legal.terms')}
        </button>
        <p className="text-[11px] text-[var(--tg-theme-hint-color,#6b7280)] pt-1">{t('disclaimer.notMedical')}</p>
      </div>

      {(profileLoading || settingsLoading) && (
        <p className="text-center text-xs text-[var(--tg-theme-hint-color,#6b7280)] flex items-center justify-center gap-2">
          <Spinner size={14} />
          {t('settings.saving')}
        </p>
      )}

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

      <PremiumPaywall
        isOpen={showPremium}
        onClose={() => setShowPremium(false)}
        mode={paywallMode}
      />
    </div>
  )
}
