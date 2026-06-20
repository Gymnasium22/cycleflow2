import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useTelegram } from './TelegramContext'
import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH } from '../utils/cycle'

const AuthContext = createContext(null)

function parseTelegramUserFromInitData(initData) {
  if (!initData) return null
  try {
    const params = new URLSearchParams(initData)
    const userJson = params.get('user')
    if (!userJson) return null
    return JSON.parse(decodeURIComponent(userJson))
  } catch (err) {
    console.warn('[Auth] Failed to parse user from initData:', err)
    return null
  }
}

const FALLBACK_PROFILE_KEY = 'cicle_fallback_profile'
const FALLBACK_CYCLES_KEY = 'cicle_cycles'
const FALLBACK_SYMPTOMS_KEY = 'cicle_symptoms'
const FALLBACK_SETTINGS_KEY = 'cicle_settings'

function getStoredFallbackProfile() {
  try {
    const raw = localStorage.getItem(FALLBACK_PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const { webApp, user: telegramUser, ready, initData } = useTelegram()
  const telegramUserFromInitData = useMemo(() => parseTelegramUserFromInitData(initData), [initData])
  const effectiveTelegramUser = telegramUser || telegramUserFromInitData
  console.log('[Auth] Effective telegram user:', {
    fromContext: telegramUser?.id,
    fromInitData: telegramUserFromInitData?.id,
    effective: effectiveTelegramUser?.id,
  })
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.warn('[Auth] Profile not found, will create one')
        return null
      }
      console.error('[Auth] Profile load error:', error)
      return null
    }

    setProfile(data)
    return data
  }, [])

  const createProfile = useCallback(async (userId, overrides = {}) => {
    const telegramId = effectiveTelegramUser?.id ?? overrides.telegram_id
    if (!telegramId) {
      console.error('[Auth] Cannot create profile without telegram_id', { userId, overrides, effectiveTelegramUser })
      throw new Error('Cannot create profile: missing telegram_id')
    }
    const payload = {
      id: userId,
      telegram_id: telegramId,
      username: effectiveTelegramUser?.username ?? overrides.username ?? null,
      first_name: effectiveTelegramUser?.first_name ?? overrides.first_name ?? null,
      last_name: effectiveTelegramUser?.last_name ?? overrides.last_name ?? null,
      language_code: effectiveTelegramUser?.language_code ?? overrides.language_code ?? 'ru',
      cycle_length: overrides.cycle_length ?? DEFAULT_CYCLE_LENGTH,
      period_length: overrides.period_length ?? DEFAULT_PERIOD_LENGTH,
      ...overrides,
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert(payload)
      .select()
      .single()

    if (error) {
      const { data: upsertData, error: upsertError } = await supabase
        .from('profiles')
        .upsert(payload)
        .select()
        .single()

      if (upsertError) {
        console.error('[Auth] Profile create/upsert error:', upsertError)
        return null
      }

      setProfile(upsertData)
      return upsertData
    }

    setProfile(data)
    return data
  }, [effectiveTelegramUser])

  const updateProfile = useCallback(async (updates) => {
    if (!session?.user?.id) {
      const existing = getStoredFallbackProfile()
      const fallbackProfile = {
        id: existing?.id || 'fallback-user',
        telegram_id: existing?.telegram_id || telegramUser?.id || 123456,
        username: existing?.username || telegramUser?.username || 'test_user',
        first_name: existing?.first_name || telegramUser?.first_name || 'Test',
        language_code: existing?.language_code || telegramUser?.language_code || localStorage.getItem('i18nextLng') || 'ru',
        cycle_length: existing?.cycle_length ?? DEFAULT_CYCLE_LENGTH,
        period_length: existing?.period_length ?? DEFAULT_PERIOD_LENGTH,
        ...existing,
        ...updates,
      }
      setProfile(fallbackProfile)
      localStorage.setItem(FALLBACK_PROFILE_KEY, JSON.stringify(fallbackProfile))
      return fallbackProfile
    }

    const userId = session.user.id
    const telegramId = effectiveTelegramUser?.id ?? profile?.telegram_id
    const payload = { id: userId, ...updates }
    if (telegramId && !('telegram_id' in updates)) {
      payload.telegram_id = telegramId
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      console.error('[Auth] Profile upsert error:', error)
      setProfile((prev) => (prev ? { ...prev, ...updates } : { ...updates }))
      return
    }

    setProfile(data)
    return data
  }, [session, effectiveTelegramUser, profile])

  const migrateFallbackData = useCallback(async (userId) => {
    try {
      const fallbackProfile = getStoredFallbackProfile()
      const fallbackCycles = (() => {
        try {
          const raw = localStorage.getItem(FALLBACK_CYCLES_KEY)
          return raw ? JSON.parse(raw) : []
        } catch {
          return []
        }
      })()
      const fallbackSymptoms = (() => {
        try {
          const raw = localStorage.getItem(FALLBACK_SYMPTOMS_KEY)
          return raw ? JSON.parse(raw) : []
        } catch {
          return []
        }
      })()
      const fallbackSettings = (() => {
        try {
          const raw = localStorage.getItem(FALLBACK_SETTINGS_KEY)
          return raw ? JSON.parse(raw) : null
        } catch {
          return null
        }
      })()

      if (fallbackProfile) {
        await supabase.from('profiles').upsert({
          id: userId,
          cycle_length: fallbackProfile.cycle_length,
          period_length: fallbackProfile.period_length,
          language_code: fallbackProfile.language_code,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      }

      if (fallbackCycles.length > 0) {
        const cyclesToInsert = fallbackCycles.map((c) => ({
          user_id: userId,
          start_date: c.start_date,
          period_length: c.period_length,
          cycle_length: c.cycle_length,
          created_at: c.created_at || new Date().toISOString(),
        }))
        const { error } = await supabase
          .from('cycles')
          .upsert(cyclesToInsert, { onConflict: 'user_id,start_date' })
        if (error) console.error('[Auth] Migrate cycles error:', error)
      }

      if (fallbackSymptoms.length > 0) {
        const symptomsToInsert = fallbackSymptoms.map((s) => ({
          user_id: userId,
          date: s.date,
          symptom_type: s.symptom_type,
          intensity: s.intensity,
          notes: s.notes || '',
          created_at: s.created_at || new Date().toISOString(),
        }))
        const { error } = await supabase
          .from('symptoms')
          .upsert(symptomsToInsert, { onConflict: 'user_id,date,symptom_type' })
        if (error) console.error('[Auth] Migrate symptoms error:', error)
      }

      if (fallbackSettings) {
        await supabase.from('settings').upsert({
          user_id: userId,
          notify_period: fallbackSettings.notify_period,
          notify_ovulation: fallbackSettings.notify_ovulation,
          notify_time: fallbackSettings.notify_time,
          period_reminder_days: fallbackSettings.period_reminder_days,
        }, { onConflict: 'user_id' })
      }

      // Clear fallback storage after successful migration
      localStorage.removeItem(FALLBACK_PROFILE_KEY)
      localStorage.removeItem(FALLBACK_CYCLES_KEY)
      localStorage.removeItem(FALLBACK_SYMPTOMS_KEY)
      localStorage.removeItem(FALLBACK_SETTINGS_KEY)
      console.log('[Auth] Fallback data migrated to Supabase')
    } catch (err) {
      console.error('[Auth] Migration error:', err)
    }
  }, [])

  const signInWithTelegram = useCallback(async (telegramInitData) => {
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`

    console.log('[Auth] Calling telegram-auth...', { functionUrl })
    let response
    try {
      response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ initData: telegramInitData }),
      })
    } catch (networkErr) {
      console.error('[Auth] Network error calling telegram-auth:', networkErr)
      throw new Error(`Network error: ${networkErr.message || 'Failed to connect to auth server'}`)
    }

    let data
    const responseText = await response.text()
    console.log('[Auth] telegram-auth raw response:', { status: response.status, statusText: response.statusText, body: responseText })

    try {
      data = responseText ? JSON.parse(responseText) : {}
    } catch (parseErr) {
      console.error('[Auth] Failed to parse telegram-auth response:', parseErr)
      throw new Error(`Invalid response from auth server: ${responseText.slice(0, 200)}`)
    }

    if (!response.ok) {
      throw new Error(data.error || `Auth failed: ${response.status} ${response.statusText}`)
    }

    if (!data.session?.access_token || !data.session?.refresh_token) {
      throw new Error('Invalid session data from server')
    }

    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    if (setSessionError) {
      throw new Error(setSessionError.message)
    }

    setSession(data.session)
    return data.user.id
  }, [])

  // Main auth flow
  useEffect(() => {
    async function authenticate() {
      if (!ready) return

      try {
        setError(null)
        console.log('[Auth] Starting auth flow...', { hasWebApp: !!webApp, hasInitData: !!initData })

        // 1. Check existing session
        console.log('[Auth] About to call getSession...')
        const { data: existingSession, error: sessionError } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('getSession timeout after 5s')), 5000)),
        ])
        console.log('[Auth] Existing session check:', { hasSession: !!existingSession?.session, error: sessionError?.message })

        if (existingSession?.session) {
          setSession(existingSession.session)
          const loaded = await loadProfile(existingSession.session.user.id)
          if (!loaded) {
            await createProfile(existingSession.session.user.id)
          }
          setLoading(false)
          return
        }

        // 2. Telegram auth if WebApp and initData are available
        if (webApp && initData) {
          console.log('[Auth] Attempting Telegram auth...')
          console.log('[Auth] initData length:', initData.length)
          console.log('[Auth] initData preview:', initData.slice(0, 200))
          const userId = await signInWithTelegram(initData)
          console.log('[Auth] Telegram auth success, userId:', userId)
          const loaded = await loadProfile(userId)
          if (!loaded) {
            await createProfile(userId)
          }
          await migrateFallbackData(userId)
          setLoading(false)
          return
        }

        // 3. Fallback mode
        if (!webApp) {
          console.log('[Auth] No Telegram WebApp, fallback mode')
        } else if (!initData) {
          console.warn('[Auth] Telegram WebApp present but no initData')
        }

        const savedProfile = getStoredFallbackProfile()
        if (savedProfile) {
          setProfile(savedProfile)
        }
        setLoading(false)
      } catch (err) {
        console.error('[Auth] Auth error:', err, err?.stack, err?.name, err?.message)
        setError(err?.message || JSON.stringify(err) || 'Unknown auth error')
        setLoading(false)
      }
    }

    authenticate()
  }, [ready, webApp, initData, telegramUser, loadProfile, createProfile, signInWithTelegram, migrateFallbackData])

  // Listen for auth state changes
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      if (newSession?.user?.id) {
        const loaded = await loadProfile(newSession.user.id)
        if (!loaded) {
          await createProfile(newSession.user.id)
        }
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [loadProfile, createProfile])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    localStorage.removeItem(FALLBACK_PROFILE_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading, error, updateProfile, createProfile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
