import { createClient } from '@supabase/supabase-js'
import { authStorage } from './storage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let realClient = null
let mockClient = null

function createRealClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return getMockClient()
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
}

function getMockClient() {
  if (mockClient) return mockClient

  mockClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      setSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: { session: null }, error: new Error('Not configured') }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ data: [], error: null }),
          single: () => ({ data: null, error: { code: 'PGRST116', message: 'Not found' } }),
          limit: () => ({ data: [], error: null }),
        }),
      }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) }),
      delete: () => ({ eq: () => ({ error: null }) }),
      upsert: () => ({ error: null }),
    }),
  }

  return mockClient
}

function getClient() {
  if (!realClient) {
    realClient = createRealClient()
  }
  return realClient
}

// Lazy proxy: the real Supabase client is created on first access.
// This ensures Telegram WebApp (and CloudStorage) is available before auth storage is chosen.
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getClient()
      return client[prop]
    },
  }
)
