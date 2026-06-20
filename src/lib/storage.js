// Storage adapter for Supabase Auth.
// Uses Telegram CloudStorage when available, otherwise falls back to localStorage.

const SUPABASE_STORAGE_KEY = 'sb-cicle-auth-token'

function getWebApp() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null
}

function hasCloudStorage() {
  const tg = getWebApp()
  return !!(tg && tg.CloudStorage)
}

const localStorageAdapter = {
  getItem(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      // ignore
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}

const cloudStorageAdapter = {
  getItem(key) {
    return new Promise((resolve) => {
      const tg = getWebApp()
      if (!tg?.CloudStorage) {
        resolve(localStorageAdapter.getItem(key))
        return
      }
      try {
        tg.CloudStorage.getItem(key, (err, value) => {
          if (err || value === null || value === undefined || value === '') {
            resolve(localStorageAdapter.getItem(key))
          } else {
            resolve(value)
          }
        })
      } catch {
        resolve(localStorageAdapter.getItem(key))
      }
    })
  },
  setItem(key, value) {
    return new Promise((resolve) => {
      const tg = getWebApp()
      localStorageAdapter.setItem(key, value)
      if (!tg?.CloudStorage) {
        resolve()
        return
      }
      try {
        tg.CloudStorage.setItem(key, value, (err) => {
          if (err) {
            console.warn('[Storage] CloudStorage setItem error:', err)
          }
          resolve()
        })
      } catch {
        resolve()
      }
    })
  },
  removeItem(key) {
    return new Promise((resolve) => {
      const tg = getWebApp()
      localStorageAdapter.removeItem(key)
      if (!tg?.CloudStorage) {
        resolve()
        return
      }
      try {
        tg.CloudStorage.removeItem(key, () => resolve())
      } catch {
        resolve()
      }
    })
  },
}

// Dynamic adapter: chooses CloudStorage at runtime when Telegram WebApp is ready.
export const authStorage = {
  getItem(key) {
    return hasCloudStorage() ? cloudStorageAdapter.getItem(key) : localStorageAdapter.getItem(key)
  },
  setItem(key, value) {
    return hasCloudStorage() ? cloudStorageAdapter.setItem(key, value) : localStorageAdapter.setItem(key, value)
  },
  removeItem(key) {
    return hasCloudStorage() ? cloudStorageAdapter.removeItem(key) : localStorageAdapter.removeItem(key)
  },
}

// Helper to inspect current storage (for debugging)
export async function debugAuthStorage() {
  const value = await authStorage.getItem(SUPABASE_STORAGE_KEY)
  console.log('[Storage] Current auth token exists:', !!value)
  return value
}
