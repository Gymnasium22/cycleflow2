import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Trap focus inside a modal container while open (a11y).
 */
export function useFocusTrap(isOpen) {
  const ref = useRef(null)

  useEffect(() => {
    if (!isOpen || !ref.current) return undefined
    const root = ref.current
    const previouslyFocused = document.activeElement

    const nodes = () => Array.from(root.querySelectorAll(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
    )

    const first = nodes()[0]
    if (first) {
      try {
        first.focus()
      } catch {
        // ignore
      }
    }

    function onKeyDown(e) {
      if (e.key !== 'Tab') return
      const list = nodes()
      if (list.length === 0) return
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try {
          previouslyFocused.focus()
        } catch {
          // ignore
        }
      }
    }
  }, [isOpen])

  return ref
}
