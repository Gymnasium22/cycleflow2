// Storage adapter for Supabase Auth.
// Primary storage is localStorage (fast, synchronous).
// Telegram CloudStorage is used as a backup for cross-session persistence.

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
        resolve(null)
        return
      }
      try {
        tg.CloudStorage.getItem(key, (err, value) => {
          if (err || value === null || value === undefined || value === '') {
            resolve(null)
          } else {
            resolve(value)
          }
        })
      } catch {
        resolve(null)
      }
    })
  },
  setItem(key, value) {
    return new Promise((resolve) => {
      const tg = getWebApp()
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

async function syncFromCloudStorage(key) {
  if (!hasCloudStorage()) return
  const cloudValue = await withTimeout(
    cloudStorageAdapter.getItem(key),
    STORAGE_TIMEOUT_MS,
    null
  )
  if (cloudValue && !localStorageAdapter.getItem(key)) {
    localStorageAdapter.setItem(key, cloudValue)
  }
}

// Sync from CloudStorage on startup in background
if (typeof window !== 'undefined') {
  try {
    syncFromCloudStorage('sb-eofhvkiidqyxkrpimwer-auth-token')
    syncFromCloudStorage('sb-eofhvkiidqyxkrpimwer-auth-token-code-verifier')
  } catch {
    // ignore
  }
}

export const authStorage = {
  getItem(key) {
    // Primary: localStorage (instant)
    const localValue = localStorageAdapter.getItem(key)
    if (localValue) {
      return localValue
    }

    // Fallback: CloudStorage with timeout
    if (!hasCloudStorage()) {
      return null
    }
    return withTimeout(
      cloudStorageAdapter.getItem(key),
      STORAGE_TIMEOUT_MS,
      null
    )
  },
  setItem(key, value) {
    // Always save to localStorage immediately
    localStorageAdapter.setItem(key, value)

    // Backup to CloudStorage in background
    if (hasCloudStorage()) {
      cloudStorageAdapter.setItem(key, value).catch(() => {})
    }
  },
  removeItem(key) {
    localStorageAdapter.removeItem(key)
    if (hasCloudStorage()) {
      cloudStorageAdapter.removeItem(key).catch(() => {})
    }
  },
}
