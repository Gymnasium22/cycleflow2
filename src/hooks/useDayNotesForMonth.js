import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'cicle_day_notes'

function getStoredNotes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function useDayNotesForMonth(monthStart, monthEnd) {
  const { session } = useAuth()
  const [noteDates, setNoteDates] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const fetchedKeyRef = useRef(null)

  const isAuthenticated = !!session?.user?.id

  const fetchNotes = useCallback(async () => {
    if (!monthStart || !monthEnd) {
      setNoteDates(new Set())
      setLoading(false)
      return
    }

    if (!isAuthenticated) {
      const dates = new Set()
      for (const n of getStoredNotes()) {
        if (n.date >= monthStart && n.date <= monthEnd && n.content?.trim()) {
          dates.add(n.date)
        }
      }
      setNoteDates(dates)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('day_notes')
      .select('date, content')
      .eq('user_id', session.user.id)
      .gte('date', monthStart)
      .lte('date', monthEnd)

    if (error) {
      const dates = new Set()
      for (const n of getStoredNotes()) {
        if (n.date >= monthStart && n.date <= monthEnd && n.content?.trim()) {
          dates.add(n.date)
        }
      }
      setNoteDates(dates)
    } else {
      const dates = new Set(
        (data || []).filter((n) => n.content?.trim()).map((n) => n.date)
      )
      setNoteDates(dates)
    }
    setLoading(false)
  }, [isAuthenticated, session?.user?.id, monthStart, monthEnd])

  useEffect(() => {
    const key = `${session?.user?.id || 'anon'}:${monthStart}:${monthEnd}`
    if (fetchedKeyRef.current === key) return
    fetchedKeyRef.current = key
    fetchNotes()
  }, [fetchNotes, session?.user?.id, monthStart, monthEnd])

  return { noteDates, loading, refetch: fetchNotes }
}