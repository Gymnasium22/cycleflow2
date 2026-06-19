import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useSymptoms(date) {
  const { session } = useAuth()
  const [symptoms, setSymptoms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSymptoms = useCallback(async () => {
    if (!session?.user?.id || !date) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('symptoms')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', date)

    if (error) {
      setError(error)
    } else {
      setSymptoms(data || [])
    }
    setLoading(false)
  }, [session?.user?.id, date])

  useEffect(() => {
    fetchSymptoms()
  }, [fetchSymptoms])

  async function saveSymptom(symptom) {
    if (!session?.user?.id || !date) return

    const { data: existing } = await supabase
      .from('symptoms')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('date', date)
      .eq('symptom_type', symptom.symptom_type)
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('symptoms')
        .update(symptom)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        setError(error)
        return null
      }

      setSymptoms((prev) => prev.map((s) => (s.id === existing.id ? data : s)))
      return data
    }

    const { data, error } = await supabase
      .from('symptoms')
      .insert({
        user_id: session.user.id,
        date,
        ...symptom,
      })
      .select()
      .single()

    if (error) {
      setError(error)
      return null
    }

    setSymptoms((prev) => [...prev, data])
    return data
  }

  async function deleteSymptom(id) {
    const { error } = await supabase.from('symptoms').delete().eq('id', id)
    if (error) {
      setError(error)
      return false
    }
    setSymptoms((prev) => prev.filter((s) => s.id !== id))
    return true
  }

  return { symptoms, loading, error, saveSymptom, deleteSymptom, refetch: fetchSymptoms }
}
