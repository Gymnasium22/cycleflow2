import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTelegram } from '../context/TelegramContext'
import { supabase } from '../lib/supabase'
import {
  isPremiumActive,
  premiumDaysLeft,
  canExportDoctorReport,
  FREE_HISTORY_CYCLE_LIMIT,
} from '../lib/products'

/**
 * Premium state + Telegram Stars purchase flow.
 * openInvoice status: 'paid' | 'cancelled' | 'failed' | 'pending'
 */
export function usePremium() {
  const { session, profile, updateProfile } = useAuth()
  const { webApp, hapticFeedback } = useTelegram()
  const [purchasing, setPurchasing] = useState(false)
  const [lastError, setLastError] = useState(null)

  const premium = useMemo(() => isPremiumActive(profile), [profile])
  const daysLeft = useMemo(() => premiumDaysLeft(profile), [profile])
  const reportCredits = profile?.doctor_report_credits || 0
  const canDoctorPdf = useMemo(() => canExportDoctorReport(profile), [profile])

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    if (!error && data) {
      // Pull only entitlement fields so we don't fight concurrent profile edits
      await updateProfile({
        premium_until: data.premium_until,
        premium_plan: data.premium_plan,
        doctor_report_credits: data.doctor_report_credits,
        referral_code: data.referral_code,
        log_streak: data.log_streak,
        longest_streak: data.longest_streak,
        last_log_date: data.last_log_date,
        disclaimer_accepted_at: data.disclaimer_accepted_at,
      })
      return data
    }
    return null
  }, [session?.user?.id, updateProfile])

  /**
   * Create invoice via Edge Function and open Telegram payment UI.
   * @param {string} productId
   * @returns {Promise<'paid'|'cancelled'|'failed'|'pending'|null>}
   */
  const purchase = useCallback(
    async (productId) => {
      setLastError(null)
      if (!session?.access_token) {
        setLastError('AUTH_REQUIRED')
        return null
      }

      setPurchasing(true)
      hapticFeedback.impact('medium')

      try {
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stars-invoice`
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ productId }),
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.invoiceLink) {
          setLastError(data.error || 'INVOICE_FAILED')
          setPurchasing(false)
          hapticFeedback.notification('error')
          return 'failed'
        }

        // openInvoice is the Mini App payment entry point for Stars
        if (webApp?.openInvoice) {
          return await new Promise((resolve) => {
            webApp.openInvoice(data.invoiceLink, async (status) => {
              if (status === 'paid') {
                hapticFeedback.notification('success')
                // Webhook updates DB; poll profile a few times for realtime UX
                for (let i = 0; i < 5; i++) {
                  await new Promise((r) => setTimeout(r, 600))
                  const fresh = await refreshProfile()
                  if (fresh && (isPremiumActive(fresh) || (fresh.doctor_report_credits || 0) > reportCredits)) {
                    break
                  }
                }
              } else if (status === 'failed') {
                hapticFeedback.notification('error')
              }
              setPurchasing(false)
              resolve(status)
            })
          })
        }

        // Fallback outside Telegram: open link
        window.open(data.invoiceLink, '_blank')
        setPurchasing(false)
        return 'pending'
      } catch (err) {
        console.error('[usePremium] purchase error', err)
        setLastError(err?.message || 'PURCHASE_ERROR')
        setPurchasing(false)
        hapticFeedback.notification('error')
        return 'failed'
      }
    },
    [session, webApp, hapticFeedback, refreshProfile, reportCredits]
  )

  const ensureReferralCode = useCallback(async () => {
    if (!profile || profile.referral_code) return profile?.referral_code
    if (!session?.user?.id) return null
    const code = Math.random().toString(36).slice(2, 10)
    const { data, error } = await supabase
      .from('profiles')
      .update({ referral_code: code })
      .eq('id', session.user.id)
      .select('referral_code')
      .single()
    if (!error && data?.referral_code) {
      await updateProfile({ referral_code: data.referral_code })
      return data.referral_code
    }
    return code
  }, [profile, session?.user?.id, updateProfile])

  return {
    premium,
    daysLeft,
    premiumUntil: profile?.premium_until || null,
    reportCredits,
    canDoctorPdf,
    historyLimit: premium ? Infinity : FREE_HISTORY_CYCLE_LIMIT,
    purchasing,
    lastError,
    purchase,
    refreshProfile,
    ensureReferralCode,
    referralCode: profile?.referral_code || null,
    streak: profile?.log_streak || 0,
    longestStreak: profile?.longest_streak || 0,
  }
}
