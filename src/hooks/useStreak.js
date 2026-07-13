import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { toISODateString } from '../utils/cycle'

/**
 * Call after user successfully logs symptoms / period / day note.
 * Updates consecutive-day streak on the profile (Supabase or local fallback).
 */
export function useStreak() {
  const { session, profile, updateProfile } = useAuth()

  const recordActivity = useCallback(async () => {
    const today = toISODateString(new Date())
    if (profile?.last_log_date === today) {
      return { streak: profile.log_streak || 0, longest: profile.longest_streak || 0 }
    }

    let newStreak = 1
    if (profile?.last_log_date) {
      const last = new Date(profile.last_log_date + 'T12:00:00')
      const prev = new Date()
      prev.setDate(prev.getDate() - 1)
      const yesterday = toISODateString(prev)
      if (profile.last_log_date === yesterday) {
        newStreak = (profile.log_streak || 0) + 1
      }
    }

    const longest = Math.max(profile?.longest_streak || 0, newStreak)
    const updates = {
      log_streak: newStreak,
      longest_streak: longest,
      last_log_date: today,
    }

    if (session?.user?.id) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id)
        .select('log_streak, longest_streak, last_log_date')
        .single()
      if (!error && data) {
        await updateProfile(data)
        return { streak: data.log_streak, longest: data.longest_streak }
      }
    }

    await updateProfile(updates)
    return { streak: newStreak, longest }
  }, [session?.user?.id, profile, updateProfile])

  return {
    streak: profile?.log_streak || 0,
    longestStreak: profile?.longest_streak || 0,
    lastLogDate: profile?.last_log_date || null,
    recordActivity,
  }
}
