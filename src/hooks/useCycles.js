import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  sortCyclesByDateDesc,
  getActiveCycle,
  isPeriodTrackingOpen,
  getActivePeriodDay,
  isPeriodOverdue,
} from '../utils/cycle'

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortCyclesByDateDesc(cycles)))
}

function normalizeCycles(cycles) {
  return sortCyclesByDateDesc(cycles || [])
}

export function useCycles() {
  const { session } = useAuth()
  // Initialize with cached data immediately to avoid flash of empty state
  const [cycles, setCycles] = useState(() => normalizeCycles(getStoredCycles()))
  const [loading, setLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const fetchedForUserRef = useRef(null)

  const isAuthenticated = !!session?.user?.id

  const fetchCycles = useCallback(async () => {
    if (!isAuthenticated) {
      setCycles(normalizeCycles(getStoredCycles()))
      setLoading(false)
      return
    }

    // Don't show loading spinner if we already have cached data
    const cached = getStoredCycles()
    if (cached.length === 0) {
      setLoading(true)
    }

    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .eq('user_id', session.user.id)
      .order('start_date', { ascending: false })

    if (error) {
      setError(error)
      // Keep showing cached data on error
    } else {
      const fresh = normalizeCycles(data || [])
      setCycles(fresh)
      setStoredCycles(fresh)
    }
    setLoading(false)
  }, [isAuthenticated, session?.user?.id])

  useEffect(() => {
    // Prevent duplicate fetches for the same user
    const userId = session?.user?.id || 'anonymous'
    if (fetchedForUserRef.current === userId) return
    fetchedForUserRef.current = userId
    fetchCycles()
  }, [fetchCycles, session?.user?.id])

  async function addCycle(cycle) {
    if (getActiveCycle(cycles) && !cycle.end_date) {
      setError({ message: 'ACTIVE_PERIOD_EXISTS' })
      return null
    }

    setIsLoading(true)
    const newCycle = {
      id: `local_${Date.now()}`,
      start_date: cycle.start_date,
      period_length: cycle.period_length,
      cycle_length: cycle.cycle_length,
      created_at: new Date().toISOString(),
    }

    if (!isAuthenticated) {
      const updated = normalizeCycles([newCycle, ...getStoredCycles()])
      setStoredCycles(updated)
      setCycles(updated)
      setIsLoading(false)
      return newCycle
    }

    try {
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
        setIsLoading(false)
        return null
      }

      setCycles((prev) => {
        const updated = normalizeCycles([data, ...prev])
        setStoredCycles(updated)
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

  async function updateCycle(id, updates) {
    setIsLoading(true)
    if (!isAuthenticated) {
      const updated = normalizeCycles(getStoredCycles().map((c) => (c.id === id ? { ...c, ...updates } : c)))
      setStoredCycles(updated)
      setCycles(updated)
      setIsLoading(false)
      return updated.find((c) => c.id === id)
    }

    try {
      const { data, error } = await supabase
      .from('cycles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

      if (error) {
        setError(error)
        setIsLoading(false)
        return null
      }

      setCycles((prev) => {
        const updated = normalizeCycles(prev.map((c) => (c.id === id ? data : c)))
        setStoredCycles(updated)
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

  async function deleteCycle(id) {
    setIsLoading(true)
    if (!isAuthenticated) {
      const updated = normalizeCycles(getStoredCycles().filter((c) => c.id !== id))
      setStoredCycles(updated)
      setCycles(updated)
      setIsLoading(false)
      return true
    }

    try {
      const { error } = await supabase.from('cycles').delete().eq('id', id)
      if (error) {
        setError(error)
        setIsLoading(false)
        return false
      }
      setCycles((prev) => {
        const updated = normalizeCycles(prev.filter((c) => c.id !== id))
        setStoredCycles(updated)
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

  return { cycles, loading, isLoading, error, addCycle, updateCycle, deleteCycle, refetch: fetchCycles }
}

export { isPeriodTrackingOpen as isPeriodActive, getActivePeriodDay, isPeriodOverdue, getActiveCycle }
