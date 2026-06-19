import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTelegram } from './TelegramContext'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { webApp, user: telegramUser, ready } = useTelegram()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function authenticate() {
      if (!ready) return

      // Check existing session
      const { data: existingSession } = await supabase.auth.getSession()
      if (existingSession?.session) {
        setSession(existingSession.session)
        await loadProfile(existingSession.session.user.id)
        setLoading(false)
        return
      }

      // In development without Telegram
      if (!webApp) {
        setLoading(false)
        return
      }

      try {
        const initData = webApp.initData
        if (!initData) {
          setError('No Telegram initData')
          setLoading(false)
          return
        }

        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Auth failed')
        }

        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })

        setSession(data.session)
        await loadProfile(data.user.id)
      } catch (err) {
        console.error('Auth error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    authenticate()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [ready, webApp])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Profile load error:', error)
      return
    }

    setProfile(data)
  }

  async function updateProfile(updates) {
    if (!session?.user?.id) return

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)

    if (error) {
      console.error('Profile update error:', error)
      return
    }

    setProfile((prev) => ({ ...prev, ...updates }))
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, error, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
