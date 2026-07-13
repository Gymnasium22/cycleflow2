import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Renders modals on document.body so position:fixed is not trapped
 * inside PullToRefresh transform ancestors.
 * Also provides basic focus trap + Escape hook for a11y.
 */
export function ModalPortal({ children, lockScroll = true, onEscape }) {
  const rootRef = useRef(null)

  useEffect(() => {
    if (!lockScroll) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [lockScroll])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const previouslyFocused = document.activeElement

    const getNodes = () =>
      Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement)

    const first = getNodes()[0]
    if (first) {
      try {
        first.focus()
      } catch {
        // ignore
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape' && onEscape) {
        e.stopPropagation()
        onEscape()
        return
      }
      if (e.key !== 'Tab') return
      const list = getNodes()
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

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try {
          previouslyFocused.focus()
        } catch {
          // ignore
        }
      }
    }
  }, [onEscape, children])

  return createPortal(
    <div ref={rootRef} data-modal-portal>
      {children}
    </div>,
    document.body
  )
}