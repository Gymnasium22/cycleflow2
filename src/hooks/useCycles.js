import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useCycles() {
  const { session } = useAuth()
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCycles = useCallback(async () => {
    if (!session?.user?.id) {
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
  }, [session?.user?.id])

  useEffect(() => {
    fetchCycles()
  }, [fetchCycles])

  async function addCycle(cycle) {
    if (!session?.user?.id) return

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
