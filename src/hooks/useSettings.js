import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'cicle_settings'

function getStoredSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function setStoredSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

const DEFAULT_SETTINGS = {
  notify_period: true,
  notify_ovulation: false,
  notify_time: '09:00',
  period_reminder_days: 2,
  ovulation_reminder_days: 1,
}

export function useSettings() {
  const { session } = useAuth()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isAuthenticated = !!session?.user?.id

  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) {
      const stored = getStoredSettings()
      setSettings(stored || { ...DEFAULT_SETTINGS })
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: createError } = await supabase
          .from('settings')
          .insert({ user_id: session.user.id })
          .select()
          .single()

        if (createError) {
          setError(createError)
        } else {
          setSettings(newSettings)
        }
      } else {
        setError(error)
      }
    } else {
      setSettings(data)
    }
    setLoading(false)
  }, [isAuthenticated, session?.user?.id])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  async function updateSettings(updates) {
    const newSettings = { ...(settings || DEFAULT_SETTINGS), ...updates }

    if (!isAuthenticated) {
      setStoredSettings(newSettings)
      setSettings(newSettings)
      return newSettings
    }

    if (!session?.user?.id || !settings?.id) return

    const { data, error } = await supabase
      .from('settings')
      .update(updates)
      .eq('id', settings.id)
      .select()
      .single()

    if (error) {
      setError(error)
      return null
    }

    setSettings(data)
    return data
  }

  return { settings, loading, error, updateSettings, refetch: fetchSettings }
}
