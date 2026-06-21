import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'cicle_medication_logs'

function getStoredLogs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function setStoredLogs(logs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
}

function generateId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function getTodayLocalString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useMedicationLogs({ startDate, endDate } = {}) {
  const { session } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const isAuthenticated = !!session?.user?.id
  const userId = session?.user?.id

  const fetchLogs = useCallback(async () => {
    if (!isAuthenticated) {
      setLogs(getStoredLogs())
      setLoading(false)
      return
    }

    setLoading(true)
    let query = supabase
      .from('medication_logs')
      .select(`
        *,
        medications:medication_id (name, dosage, color),
        medication_reminders:reminder_id (time)
      `)
      .eq('user_id', userId)

    if (startDate) query = query.gte('scheduled_date', startDate)
    if (endDate) query = query.lte('scheduled_date', endDate)

    query = query.order('scheduled_date', { ascending: false })

    const { data, error } = await query

    if (error) {
      setError(error)
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }, [isAuthenticated, userId, startDate, endDate])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  async function setStatus(reminderId, scheduledDate, status) {
    setIsLoading(true)
    const today = getTodayLocalString()
    const date = scheduledDate || today
    const existingLocalId = getStoredLogs().find(
      (l) => l.reminder_id === reminderId && l.scheduled_date === date
    )?.id

    const newLog = {
      id: existingLocalId || generateId(),
      reminder_id: reminderId,
      medication_id: '',
      scheduled_date: date,
      status,
      taken_at: status === 'taken' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (!isAuthenticated) {
      const stored = getStoredLogs()
      const existingIndex = stored.findIndex(
        (l) => l.reminder_id === reminderId && l.scheduled_date === date
      )
      const updated =
        existingIndex >= 0
          ? stored.map((l, i) => (i === existingIndex ? { ...l, ...newLog } : l))
          : [newLog, ...stored]
      setStoredLogs(updated)
      setLogs(updated)
      setIsLoading(false)
      return newLog
    }

    try {
      // Try upsert via unique constraint
      const { data, error } = await supabase
        .from('medication_logs')
        .upsert(
          {
            reminder_id: reminderId,
            user_id: userId,
            scheduled_date: date,
            status,
            taken_at: status === 'taken' ? new Date().toISOString() : null,
          },
          { onConflict: 'reminder_id,scheduled_date' }
        )
        .select()
        .single()

      if (error) {
        setError(error)
        setIsLoading(false)
        return null
      }

      setLogs((prev) => {
        const existingIndex = prev.findIndex(
          (l) => l.reminder_id === reminderId && l.scheduled_date === date
        )
        if (existingIndex >= 0) {
          return prev.map((l, i) => (i === existingIndex ? data : l))
        }
        return [data, ...prev]
      })
      setIsLoading(false)
      return data
    } catch (err) {
      setError(err)
      setIsLoading(false)
      return null
    }
  }

  async function markTaken(reminderId, scheduledDate) {
    return setStatus(reminderId, scheduledDate, 'taken')
  }

  async function markSkipped(reminderId, scheduledDate) {
    return setStatus(reminderId, scheduledDate, 'skipped')
  }

  async function markPending(reminderId, scheduledDate) {
    return setStatus(reminderId, scheduledDate, 'pending')
  }

  return {
    logs,
    loading,
    isLoading,
    error,
    markTaken,
    markSkipped,
    markPending,
    refetch: fetchLogs,
  }
}
