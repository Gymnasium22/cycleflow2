// Storage adapter for Supabase Auth.
// Uses Telegram CloudStorage when available, otherwise falls back to localStorage.

function getWebApp() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null
}

function hasCloudStorage() {
  const tg = getWebApp()
  return !!(tg && tg.CloudStorage)
}

function withTimeout(promise, ms, fallback) {
  return new Promise((resolve) => {
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        console.warn('[Storage] CloudStorage timeout, using fallback')
        resolve(fallback)
      }
    }, ms)

    Promise.resolve(promise).then((value) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(value)
      }
    })
  })
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

const STORAGE_TIMEOUT_MS = 2000

// Dynamic adapter: chooses CloudStorage at runtime when Telegram WebApp is ready.
export const authStorage = {
  getItem(key) {
    if (!hasCloudStorage()) {
      return localStorageAdapter.getItem(key)
    }
    return withTimeout(
      cloudStorageAdapter.getItem(key),
      STORAGE_TIMEOUT_MS,
      localStorageAdapter.getItem(key)
    )
  },
  setItem(key, value) {
    if (!hasCloudStorage()) {
      localStorageAdapter.setItem(key, value)
      return
    }
    return withTimeout(
      cloudStorageAdapter.setItem(key, value),
      STORAGE_TIMEOUT_MS,
      undefined
    )
  },
  removeItem(key) {
    if (!hasCloudStorage()) {
      localStorageAdapter.removeItem(key)
      return
    }
    return withTimeout(
      cloudStorageAdapter.removeItem(key),
      STORAGE_TIMEOUT_MS,
      undefined
    )
  },
}
