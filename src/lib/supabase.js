import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client

if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Development mock when env vars are not set
  client = {
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
}

export const supabase = client
