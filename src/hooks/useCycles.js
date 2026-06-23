import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { parseDate } from '../utils/cycle'

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
  // Initialize with cached data immediately to avoid flash of empty state
  const [cycles, setCycles] = useState(() => getStoredCycles())
  const [loading, setLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const fetchedForUserRef = useRef(null)

  const isAuthenticated = !!session?.user?.id

  const fetchCycles = useCallback(async () => {
    if (!isAuthenticated) {
      setCycles(getStoredCycles())
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
      const fresh = data || []
      setCycles(fresh)
      // Update local cache with fresh server data
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
    setIsLoading(true)
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
        const updated = [data, ...prev]
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
      const updated = getStoredCycles().map((c) => (c.id === id ? { ...c, ...updates } : c))
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
        const updated = prev.map((c) => (c.id === id ? data : c))
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
      const updated = getStoredCycles().filter((c) => c.id !== id)
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
        const updated = prev.filter((c) => c.id !== id)
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

export function isPeriodActive(cycle) {
  if (!cycle) return false
  if (cycle.end_date) return false
  const start = parseDate(cycle.start_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return start && start <= today
}

export function getActivePeriodDay(cycle) {
  if (!isPeriodActive(cycle)) return null
  const start = parseDate(cycle.start_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}
