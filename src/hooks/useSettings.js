import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useSettings() {
  const { session } = useAuth()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSettings = useCallback(async () => {
    if (!session?.user?.id) {
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
        // No settings found, create default
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
  }, [session?.user?.id])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  async function updateSettings(updates) {
    if (!session?.user?.id || !settings) return

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
