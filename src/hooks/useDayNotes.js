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

function setStoredNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

export function useDayNotes(date) {
  const { session } = useAuth()
  const [note, setNote] = useState(() => {
    if (!date) return ''
    const found = getStoredNotes().find((n) => n.date === date)
    return found?.content || ''
  })
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const fetchedKeyRef = useRef(null)

  const isAuthenticated = !!session?.user?.id

  const fetchNote = useCallback(async () => {
    if (!date) {
      setNote('')
      setLoading(false)
      return
    }

    if (!isAuthenticated) {
      const found = getStoredNotes().find((n) => n.date === date)
      setNote(found?.content || '')
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('day_notes')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', date)
      .maybeSingle()

    if (fetchError) {
      setError(fetchError)
      const found = getStoredNotes().find((n) => n.date === date)
      setNote(found?.content || '')
    } else {
      const content = data?.content || ''
      setNote(content)
      const all = getStoredNotes().filter((n) => n.date !== date)
      if (data) {
        setStoredNotes([...all, data])
      } else {
        setStoredNotes(all)
      }
    }
    setLoading(false)
  }, [isAuthenticated, session?.user?.id, date])

  useEffect(() => {
    const key = `${session?.user?.id || 'anon'}:${date}`
    if (fetchedKeyRef.current === key) return
    fetchedKeyRef.current = key
    fetchNote()
  }, [fetchNote, session?.user?.id, date])

  async function saveNote(content) {
    if (!date) return null
    const trimmed = (content || '').trim()
    setIsSaving(true)
    setError(null)
    setNote(content)

    if (!isAuthenticated) {
      const all = getStoredNotes().filter((n) => n.date !== date)
      if (trimmed) {
        const record = { id: `local_${date}`, date, content: trimmed }
        setStoredNotes([...all, record])
      } else {
        setStoredNotes(all)
      }
      setIsSaving(false)
      return trimmed ? { date, content: trimmed } : null
    }

    try {
      const { data: existing } = await supabase
        .from('day_notes')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('date', date)
        .maybeSingle()

      if (!trimmed) {
        if (existing) {
          await supabase.from('day_notes').delete().eq('id', existing.id)
        }
        const all = getStoredNotes().filter((n) => n.date !== date)
        setStoredNotes(all)
        setIsSaving(false)
        return null
      }

      if (existing) {
        const { data, error: updateError } = await supabase
          .from('day_notes')
          .update({ content: trimmed })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) throw updateError
        const all = getStoredNotes().filter((n) => n.date !== date)
        setStoredNotes([...all, data])
        setIsSaving(false)
        return data
      }

      const { data, error: insertError } = await supabase
        .from('day_notes')
        .insert({ user_id: session.user.id, date, content: trimmed })
        .select()
        .single()

      if (insertError) throw insertError
      const all = getStoredNotes().filter((n) => n.date !== date)
      setStoredNotes([...all, data])
      setIsSaving(false)
      return data
    } catch (err) {
      setError(err)
      setIsSaving(false)
      return null
    }
  }

  return { note, loading, isSaving, error, saveNote, setNote, refetch: fetchNote }
}