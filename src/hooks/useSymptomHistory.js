import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'cicle_symptoms'

function getStoredSymptoms() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function useSymptomHistory(startDate, endDate) {
  const { session } = useAuth()
  const [symptoms, setSymptoms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isAuthenticated = !!session?.user?.id

  const fetchSymptoms = useCallback(async () => {
    if (!isAuthenticated) {
      const all = getStoredSymptoms()
      const filtered = all.filter((s) => s.date >= startDate && s.date <= endDate)
      setSymptoms(filtered)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('symptoms')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) {
      setError(error)
    } else {
      setSymptoms(data || [])
    }
    setLoading(false)
  }, [isAuthenticated, session?.user?.id, startDate, endDate])

  useEffect(() => {
    fetchSymptoms()
  }, [fetchSymptoms])

  // Reload when user signs in (e.g. delayed Telegram initData)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_IN' && newSession?.user?.id) {
        fetchSymptoms()
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [fetchSymptoms])

  async function deleteSymptom(id) {
    if (!isAuthenticated) {
      const all = getStoredSymptoms()
      const updated = all.filter((s) => s.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setSymptoms(updated.filter((s) => s.date >= startDate && s.date <= endDate))
      return true
    }

    const { error } = await supabase.from('symptoms').delete().eq('id', id)
    if (error) {
      setError(error)
      return false
    }
    setSymptoms((prev) => prev.filter((s) => s.id !== id))
    return true
  }

  return { symptoms, loading, error, deleteSymptom, refetch: fetchSymptoms }
}
