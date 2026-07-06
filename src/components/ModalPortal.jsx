import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders modals on document.body so position:fixed is not trapped
 * inside PullToRefresh transform ancestors.
 */
export function ModalPortal({ children, lockScroll = true }) {
  useEffect(() => {
    if (!lockScroll) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [lockScroll])

  return createPortal(children, document.body)
}