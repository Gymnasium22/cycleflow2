/**
 * App-level PDF session so the "ready" UI survives Settings unmount / tab resets.
 */

let current = null
const listeners = new Set()

export function getPdfSession() {
  return current
}

export function setPdfSession(next) {
  // Revoke previous blob URL
  if (current?.url && current.url !== next?.url) {
    try {
      URL.revokeObjectURL(current.url)
    } catch {
      // ignore
    }
  }
  current = next
  listeners.forEach((fn) => {
    try {
      fn(current)
    } catch {
      // ignore
    }
  })
}

export function clearPdfSession() {
  setPdfSession(null)
}

export function subscribePdfSession(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
