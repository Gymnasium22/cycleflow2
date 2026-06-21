import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'cicle_medications'

function getStoredMedications() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function setStoredMedications(medications) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(medications))
}

function generateId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function useMedications() {
  const { session } = useAuth()
  const [medications, setMedications] = useState([])
  const [loading, setLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const isAuthenticated = !!session?.user?.id
  const userId = session?.user?.id

  const fetchMedications = useCallback(async () => {
    if (!isAuthenticated) {
      setMedications(getStoredMedications())
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('medications')
      .select(`
        *,
        reminders:medication_reminders(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error)
    } else {
      setMedications(data || [])
    }
    setLoading(false)
  }, [isAuthenticated, userId])

  useEffect(() => {
    fetchMedications()
  }, [fetchMedications])

  // Medication CRUD
  async function addMedication(medication) {
    setIsLoading(true)
    const localId = generateId()
    const newMedication = {
      id: localId,
      name: medication.name,
      dosage: medication.dosage || '',
      color: medication.color || '',
      reminders: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (!isAuthenticated) {
      const updated = [newMedication, ...getStoredMedications()]
      setStoredMedications(updated)
      setMedications(updated)
      setIsLoading(false)
      return newMedication
    }

    try {
      const { data, error } = await supabase
        .from('medications')
        .insert({
          user_id: userId,
          name: medication.name,
          dosage: medication.dosage,
          color: medication.color,
        })
        .select()
        .single()

      if (error) {
        setError(error)
        setIsLoading(false)
        return null
      }

      const withReminders = { ...data, reminders: [] }
      setMedications((prev) => [withReminders, ...prev])
      setIsLoading(false)
      return withReminders
    } catch (err) {
      setError(err)
      setIsLoading(false)
      return null
    }
  }

  async function updateMedication(id, updates) {
    setIsLoading(true)
    if (!isAuthenticated) {
      const updated = getStoredMedications().map((m) =>
        m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
      )
      setStoredMedications(updated)
      setMedications(updated)
      setIsLoading(false)
      return updated.find((m) => m.id === id)
    }

    try {
      const { data, error } = await supabase
        .from('medications')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        setError(error)
        setIsLoading(false)
        return null
      }

      setMedications((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...data } : m))
      )
      setIsLoading(false)
      return data
    } catch (err) {
      setError(err)
      setIsLoading(false)
      return null
    }
  }

  async function deleteMedication(id) {
    setIsLoading(true)
    if (!isAuthenticated) {
      const updated = getStoredMedications().filter((m) => m.id !== id)
      setStoredMedications(updated)
      setMedications(updated)
      setIsLoading(false)
      return true
    }

    try {
      const { error } = await supabase.from('medications').delete().eq('id', id)
      if (error) {
        setError(error)
        setIsLoading(false)
        return false
      }
      setMedications((prev) => prev.filter((m) => m.id !== id))
      setIsLoading(false)
      return true
    } catch (err) {
      setError(err)
      setIsLoading(false)
      return false
    }
  }

  // Reminder CRUD
  async function addReminder(medicationId, reminder) {
    setIsLoading(true)
    const localId = generateId()
    const newReminder = {
      id: localId,
      medication_id: medicationId,
      time: reminder.time,
      days_of_week: reminder.days_of_week,
      enabled: reminder.enabled ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (!isAuthenticated) {
      const updated = getStoredMedications().map((m) =>
        m.id === medicationId
          ? { ...m, reminders: [...(m.reminders || []), newReminder] }
          : m
      )
      setStoredMedications(updated)
      setMedications(updated)
      setIsLoading(false)
      return newReminder
    }

    try {
      const { data, error } = await supabase
        .from('medication_reminders')
        .insert({
          user_id: userId,
          medication_id: medicationId,
          time: reminder.time,
          days_of_week: reminder.days_of_week,
          enabled: reminder.enabled ?? true,
        })
        .select()
        .single()

      if (error) {
        setError(error)
        setIsLoading(false)
        return null
      }

      setMedications((prev) =>
        prev.map((m) =>
          m.id === medicationId
            ? { ...m, reminders: [...(m.reminders || []), data] }
            : m
        )
      )
      setIsLoading(false)
      return data
    } catch (err) {
      setError(err)
      setIsLoading(false)
      return null
    }
  }

  async function updateReminder(reminderId, updates) {
    setIsLoading(true)
    if (!isAuthenticated) {
      const updated = getStoredMedications().map((m) => ({
        ...m,
        reminders: (m.reminders || []).map((r) =>
          r.id === reminderId
            ? { ...r, ...updates, updated_at: new Date().toISOString() }
            : r
        ),
      }))
      setStoredMedications(updated)
      setMedications(updated)
      setIsLoading(false)
      return updated.flatMap((m) => m.reminders).find((r) => r.id === reminderId)
    }

    try {
      const { data, error } = await supabase
        .from('medication_reminders')
        .update(updates)
        .eq('id', reminderId)
        .select()
        .single()

      if (error) {
        setError(error)
        setIsLoading(false)
        return null
      }

      setMedications((prev) =>
        prev.map((m) => ({
          ...m,
          reminders: (m.reminders || []).map((r) =>
            r.id === reminderId ? { ...r, ...data } : r
          ),
        }))
      )
      setIsLoading(false)
      return data
    } catch (err) {
      setError(err)
      setIsLoading(false)
      return null
    }
  }

  async function deleteReminder(reminderId) {
    setIsLoading(true)
    if (!isAuthenticated) {
      const updated = getStoredMedications().map((m) => ({
        ...m,
        reminders: (m.reminders || []).filter((r) => r.id !== reminderId),
      }))
      setStoredMedications(updated)
      setMedications(updated)
      setIsLoading(false)
      return true
    }

    try {
      const { error } = await supabase.from('medication_reminders').delete().eq('id', reminderId)
      if (error) {
        setError(error)
        setIsLoading(false)
        return false
      }
      setMedications((prev) =>
        prev.map((m) => ({
          ...m,
          reminders: (m.reminders || []).filter((r) => r.id !== reminderId),
        }))
      )
      setIsLoading(false)
      return true
    } catch (err) {
      setError(err)
      setIsLoading(false)
      return false
    }
  }

  async function toggleReminder(reminderId, enabled) {
    return updateReminder(reminderId, { enabled })
  }

  return {
    medications,
    loading,
    isLoading,
    error,
    addMedication,
    updateMedication,
    deleteMedication,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
    refetch: fetchMedications,
  }
}
