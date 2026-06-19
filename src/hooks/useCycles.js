import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'cicle_cycles'

function getStoredCycles() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function setStoredCycles(cycles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cycles))
}

export function useCycles() {
  const { session } = useAuth()
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isAuthenticated = !!session?.user?.id

  const fetchCycles = useCallback(async () => {
    if (!isAuthenticated) {
      setCycles(getStoredCycles())
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .eq('user_id', session.user.id)
      .order('start_date', { ascending: false })

    if (error) {
      setError(error)
    } else {
      setCycles(data || [])
    }
    setLoading(false)
  }, [isAuthenticated, session?.user?.id])

  useEffect(() => {
    fetchCycles()
  }, [fetchCycles])

  async function addCycle(cycle) {
    const newCycle = {
      id: `local_${Date.now()}`,
      start_date: cycle.start_date,
      period_length: cycle.period_length,
      cycle_length: cycle.cycle_length,
      created_at: new Date().toISOString(),
    }

    if (!isAuthenticated) {
      const updated = [newCycle, ...getStoredCycles()]
      setStoredCycles(updated)
      setCycles(updated)
      return newCycle
    }

    const { data, error } = await supabase
      .from('cycles')
      .insert({
        user_id: session.user.id,
        ...cycle,
      })
      .select()
      .single()

    if (error) {
      setError(error)
      return null
    }

    setCycles((prev) => [data, ...prev])
    return data
  }

  async function updateCycle(id, updates) {
    if (!isAuthenticated) {
      const updated = getStoredCycles().map((c) => (c.id === id ? { ...c, ...updates } : c))
      setStoredCycles(updated)
      setCycles(updated)
      return updated.find((c) => c.id === id)
    }

    const { data, error } = await supabase
      .from('cycles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setError(error)
      return null
    }

    setCycles((prev) => prev.map((c) => (c.id === id ? data : c)))
    return data
  }

  async function deleteCycle(id) {
    if (!isAuthenticated) {
      const updated = getStoredCycles().filter((c) => c.id !== id)
      setStoredCycles(updated)
      setCycles(updated)
      return true
    }

    const { error } = await supabase.from('cycles').delete().eq('id', id)
    if (error) {
      setError(error)
      return false
    }
    setCycles((prev) => prev.filter((c) => c.id !== id))
    return true
  }

  return { cycles, loading, error, addCycle, updateCycle, deleteCycle, refetch: fetchCycles }
}
