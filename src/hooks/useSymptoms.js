import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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

function parseNotes(notes) {
  try {
    const parsed = JSON.parse(notes || '{}')
    if (Array.isArray(parsed)) {
      return { selectedIds: parsed, comment: '' }
    }
    return {
      selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds : [],
      comment: parsed.comment || '',
    }
  } catch {
    return { selectedIds: [], comment: '' }
  }
}

export function useSymptoms(date) {
  const { session } = useAuth()
  // Initialize with cached data for the given date to avoid empty flash
  const [symptoms, setSymptoms] = useState(() => {
    if (!date) return []
    return getStoredSymptoms().filter((s) => s.date === date)
  })
  const [loading, setLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const fetchedKeyRef = useRef(null)

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
      .order('created_at', { ascending: true })

    if (error) {
      setError(error)
    } else {
      const fresh = data || []
      setSymptoms(fresh)
      // Update local cache: replace entries for this date with fresh data
      const all = getStoredSymptoms().filter((s) => s.date !== date)
      setStoredSymptoms([...all, ...fresh])
    }
    setLoading(false)
  }, [isAuthenticated, session?.user?.id, date])

  useEffect(() => {
    // Prevent re-fetching the same date for the same user
    const key = `${session?.user?.id || 'anon'}:${date}`
    if (fetchedKeyRef.current === key) return
    fetchedKeyRef.current = key
    fetchSymptoms()
  }, [fetchSymptoms, session?.user?.id, date])

  const selections = useMemo(() => {
    const map = {}
    for (const s of symptoms) {
      const parsed = parseNotes(s.notes)
      map[s.symptom_type] = {
        selectedIds: parsed.selectedIds,
        comment: parsed.comment,
        intensity: s.intensity || null,
      }
    }
    return map
  }, [symptoms])

  function getCategorySelection(categoryId) {
    return (
      selections[categoryId] || {
        selectedIds: [],
        comment: '',
        intensity: null,
      }
    )
  }

  async function saveCategorySelection(categoryId, selectedIds, intensity = null, comment = '') {
    if (!date) return null
    setIsLoading(true)
    setError(null)

    const notes = JSON.stringify({
      selectedIds: selectedIds || [],
      comment: comment || '',
    })
    const payload = {
      date,
      symptom_type: categoryId,
      intensity: intensity || null,
      notes,
    }

    if (!isAuthenticated) {
      const all = getStoredSymptoms().filter(
        (s) => !(s.date === date && s.symptom_type === categoryId)
      )
      const record = {
        id: `local_${Date.now()}`,
        ...payload,
      }
      const updated = [...all, record]
      setStoredSymptoms(updated)
      setSymptoms(updated.filter((s) => s.date === date))
      setIsLoading(false)
      return record
    }

    try {
      const { data: existing } = await supabase
        .from('symptoms')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('date', date)
        .eq('symptom_type', categoryId)
        .maybeSingle()

      if (existing) {
        const { data, error } = await supabase
          .from('symptoms')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          setError(error)
          setIsLoading(false)
          return null
        }

        setSymptoms((prev) => {
          const updated = prev.map((s) => (s.id === existing.id ? data : s))
          const all = getStoredSymptoms().filter((s) => !(s.date === date && s.symptom_type === categoryId))
          setStoredSymptoms([...all, data])
          return updated
        })
        setIsLoading(false)
        return data
      }

      const { data, error } = await supabase
        .from('symptoms')
        .insert({
          user_id: session.user.id,
          ...payload,
        })
        .select()
        .single()

      if (error) {
        setError(error)
        setIsLoading(false)
        return null
      }

      setSymptoms((prev) => {
        const updated = [...prev, data]
        const all = getStoredSymptoms().filter((s) => !(s.date === date && s.symptom_type === categoryId))
        setStoredSymptoms([...all, data])
        return updated
      })
      setIsLoading(false)
      return data
    } catch (err) {
      setError(err)
      setIsLoading(false)
      return null
    }
  }

  async function deleteCategory(categoryId) {
    if (!date) return false
    setIsLoading(true)
    setError(null)

    if (!isAuthenticated) {
      const updated = getStoredSymptoms().filter(
        (s) => !(s.date === date && s.symptom_type === categoryId)
      )
      setStoredSymptoms(updated)
      setSymptoms(updated.filter((s) => s.date === date))
      setIsLoading(false)
      return true
    }

    try {
      const { error } = await supabase
        .from('symptoms')
        .delete()
        .eq('user_id', session.user.id)
        .eq('date', date)
        .eq('symptom_type', categoryId)

      if (error) {
        setError(error)
        setIsLoading(false)
        return false
      }

      setSymptoms((prev) => {
        const updated = prev.filter((s) => s.symptom_type !== categoryId)
        const all = getStoredSymptoms().filter((s) => !(s.date === date && s.symptom_type === categoryId))
        setStoredSymptoms(all)
        return updated
      })
      setIsLoading(false)
      return true
    } catch (err) {
      setError(err)
      setIsLoading(false)
      return false
    }
  }

  async function saveSymptom(symptom) {
    return saveCategorySelection(symptom.symptom_type, symptom.selectedIds || [symptom.optionId].filter(Boolean), symptom.intensity, symptom.comment || '')
  }

  async function deleteSymptom(id) {
    setIsLoading(true)
    if (!isAuthenticated) {
      const updated = getStoredSymptoms().filter((s) => s.id !== id)
      setStoredSymptoms(updated)
      setSymptoms(updated.filter((s) => s.date === date))
      setIsLoading(false)
      return true
    }

    try {
      const { error } = await supabase.from('symptoms').delete().eq('id', id)
      if (error) {
        setError(error)
        setIsLoading(false)
        return false
      }
      setSymptoms((prev) => {
        const updated = prev.filter((s) => s.id !== id)
        const all = getStoredSymptoms().filter((s) => s.id !== id)
        setStoredSymptoms(all)
        return updated
      })
      setIsLoading(false)
      return true
    } catch (err) {
      setError(err)
      setIsLoading(false)
      return false
    }
  }

  async function updateSymptom(id, updates) {
    setIsLoading(true)
    if (!date) return null

    const payload = { ...updates }
    if (updates.notes !== undefined) {
      payload.notes = typeof updates.notes === 'string' ? updates.notes : JSON.stringify(updates.notes || [])
    }

    if (!isAuthenticated) {
      const all = getStoredSymptoms()
      const updated = all.map((s) => (s.id === id ? { ...s, ...payload } : s))
      setStoredSymptoms(updated)
      setSymptoms(updated.filter((s) => s.date === date))
      setIsLoading(false)
      return updated.find((s) => s.id === id)
    }

    try {
      const { data, error } = await supabase
        .from('symptoms')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        setError(error)
        setIsLoading(false)
        return null
      }

      setSymptoms((prev) => prev.map((s) => (s.id === id ? data : s)))
      setIsLoading(false)
      return data
    } catch (err) {
      setError(err)
      setIsLoading(false)
      return null
    }
  }

  return {
    symptoms,
    selections,
    getCategorySelection,
    saveCategorySelection,
    deleteCategory,
    saveSymptom,
    deleteSymptom,
    updateSymptom,
    loading,
    isLoading,
    error,
    refetch: fetchSymptoms,
  }
}
