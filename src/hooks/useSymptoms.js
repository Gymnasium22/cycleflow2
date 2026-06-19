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

function setStoredSymptoms(symptoms) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(symptoms))
}

export function useSymptoms(date) {
  const { session } = useAuth()
  const [symptoms, setSymptoms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isAuthenticated = !!session?.user?.id

  const fetchSymptoms = useCallback(async () => {
    if (!isAuthenticated || !date) {
      const all = getStoredSymptoms()
      setSymptoms(all.filter((s) => s.date === date))
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
  }, [isAuthenticated, session?.user?.id, date])

  useEffect(() => {
    fetchSymptoms()
  }, [fetchSymptoms])

  async function saveSymptom(symptom) {
    if (!date) return

    const newSymptom = {
      id: `local_${Date.now()}`,
      date,
      symptom_type: symptom.symptom_type,
      intensity: symptom.intensity,
      notes: symptom.notes || '',
    }

    if (!isAuthenticated) {
      const all = getStoredSymptoms().filter(
        (s) => !(s.date === date && s.symptom_type === symptom.symptom_type)
      )
      const updated = [...all, newSymptom]
      setStoredSymptoms(updated)
      setSymptoms(updated.filter((s) => s.date === date))
      return newSymptom
    }

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
    if (!isAuthenticated) {
      const updated = getStoredSymptoms().filter((s) => s.id !== id)
      setStoredSymptoms(updated)
      setSymptoms(updated.filter((s) => s.date === date))
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

  async function updateSymptom(id, updates) {
    if (!date) return

    if (!isAuthenticated) {
      const all = getStoredSymptoms()
      const updated = all.map((s) => (s.id === id ? { ...s, ...updates } : s))
      setStoredSymptoms(updated)
      setSymptoms(updated.filter((s) => s.date === date))
      return updated.find((s) => s.id === id)
    }

    const { data, error } = await supabase
      .from('symptoms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setError(error)
      return null
    }

    setSymptoms((prev) => prev.map((s) => (s.id === id ? data : s)))
    return data
  }

  return { symptoms, loading, error, saveSymptom, deleteSymptom, updateSymptom, refetch: fetchSymptoms }
}
