import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  DEFAULT_SETTINGS_DRAFT,
  mergeSettingsDraft,
  normalizeNotifyTime,
} from '../utils/settingsDraft'

const STORAGE_KEY = 'cicle_settings'

// Survive Settings unmount (tab switch) so we don't re-fetch stale server rows
// over a just-saved local draft.
let memorySettings = null
let memoryUserKey = null
let fetchInFlight = null

function getStoredSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function setStoredSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
  memorySettings = settings
}

function normalizeSettingsRow(row) {
  if (!row) return null
  return {
    ...row,
    notify_time: normalizeNotifyTime(row.notify_time),
  }
}

function pickInitial(userKey) {
  if (memoryUserKey === userKey && memorySettings) {
    return normalizeSettingsRow(memorySettings)
  }
  return normalizeSettingsRow(getStoredSettings())
}

export function useSettings() {
  const { session } = useAuth()
  const userKey = session?.user?.id || 'anonymous'
  const [settings, setSettings] = useState(() => pickInitial(userKey))
  const [loading, setLoading] = useState(() => !pickInitial(userKey))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  // Ignore fetch results that started before a local write
  const localWriteEpochRef = useRef(0)

  const isAuthenticated = !!session?.user?.id

  const applyLocal = useCallback((row) => {
    const normalized = normalizeSettingsRow(row)
    memorySettings = normalized
    memoryUserKey = userKey
    setSettings(normalized)
    setStoredSettings(normalized)
    settingsRef.current = normalized
    return normalized
  }, [userKey])

  const fetchSettings = useCallback(async (opts = {}) => {
    const { force = false } = opts
    const epochAtStart = localWriteEpochRef.current

    if (!isAuthenticated) {
      const stored = getStoredSettings()
      applyLocal(stored || { ...DEFAULT_SETTINGS_DRAFT })
      setLoading(false)
      return
    }

    // Reuse in-memory row after tab switch unless forced
    if (!force && memoryUserKey === userKey && memorySettings?.id) {
      setSettings(normalizeSettingsRow(memorySettings))
      setLoading(false)
      return
    }

    if (fetchInFlight && memoryUserKey === userKey && !force) {
      await fetchInFlight
      if (localWriteEpochRef.current === epochAtStart && memorySettings) {
        setSettings(normalizeSettingsRow(memorySettings))
      }
      setLoading(false)
      return
    }

    setLoading(true)

    fetchInFlight = (async () => {
      const { data, error: fetchError } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      // A local save happened while we were fetching — keep local
      if (localWriteEpochRef.current !== epochAtStart) {
        return memorySettings
      }

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          const { data: newSettings, error: createError } = await supabase
            .from('settings')
            .insert({ user_id: session.user.id })
            .select()
            .single()

          if (createError) {
            setError(createError)
            return null
          }
          if (localWriteEpochRef.current === epochAtStart) {
            return applyLocal(newSettings)
          }
          return memorySettings
        }
        setError(fetchError)
        return null
      }

      if (localWriteEpochRef.current === epochAtStart) {
        return applyLocal(data)
      }
      return memorySettings
    })()

    try {
      await fetchInFlight
    } finally {
      fetchInFlight = null
      setLoading(false)
    }
  }, [isAuthenticated, session?.user?.id, userKey, applyLocal])

  useEffect(() => {
    fetchSettings({ force: false })
  }, [fetchSettings])

  const updateSettings = useCallback(
    async (updates) => {
      setIsLoading(true)
      setError(null)
      localWriteEpochRef.current += 1
      const writeEpoch = localWriteEpochRef.current

      const base = settingsRef.current || memorySettings || getStoredSettings() || DEFAULT_SETTINGS_DRAFT
      const optimistic = normalizeSettingsRow(mergeSettingsDraft(base, updates))

      // Immediate local persistence (sync) — survives tab switch even if network is slow
      applyLocal(optimistic)

      if (!isAuthenticated || !session?.user?.id) {
        setIsLoading(false)
        return optimistic
      }

      try {
        const payload = {
          user_id: session.user.id,
          notify_period: optimistic.notify_period,
          notify_ovulation: optimistic.notify_ovulation,
          notify_time: optimistic.notify_time,
          period_reminder_days: optimistic.period_reminder_days,
          ovulation_reminder_days: optimistic.ovulation_reminder_days,
          updated_at: new Date().toISOString(),
        }

        const { data, error: upsertError } = await supabase
          .from('settings')
          .upsert(payload, { onConflict: 'user_id' })
          .select()
          .single()

        if (upsertError) {
          if (base?.id) {
            const { data: updated, error: updateError } = await supabase
              .from('settings')
              .update({
                notify_period: optimistic.notify_period,
                notify_ovulation: optimistic.notify_ovulation,
                notify_time: optimistic.notify_time,
                period_reminder_days: optimistic.period_reminder_days,
                ovulation_reminder_days: optimistic.ovulation_reminder_days,
              })
              .eq('id', base.id)
              .select()
              .single()

            if (updateError) {
              setError(updateError)
              setIsLoading(false)
              return null
            }
            // Only apply server row if no newer local edit
            if (localWriteEpochRef.current === writeEpoch) {
              applyLocal(updated)
            }
            setIsLoading(false)
            return normalizeSettingsRow(updated)
          }

          setError(upsertError)
          setIsLoading(false)
          return null
        }

        if (localWriteEpochRef.current === writeEpoch) {
          applyLocal(data)
        }
        setIsLoading(false)
        return normalizeSettingsRow(data)
      } catch (err) {
        setError(err)
        setIsLoading(false)
        return null
      }
    },
    [isAuthenticated, session?.user?.id, applyLocal]
  )

  return {
    settings,
    loading,
    isLoading,
    error,
    updateSettings,
    refetch: () => fetchSettings({ force: true }),
  }
}
