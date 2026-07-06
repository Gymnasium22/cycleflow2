import { useRef, useCallback } from 'react'

const SWIPE_THRESHOLD = 60
const MAX_VERTICAL_DRIFT = 40

export function useSwipeTabs(tabOrder, activeTab, onTabChange) {
  const touchStart = useRef(null)

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const onTouchEnd = useCallback((e) => {
    if (!touchStart.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    touchStart.current = null

    if (Math.abs(dy) > MAX_VERTICAL_DRIFT) return
    if (Math.abs(dx) < SWIPE_THRESHOLD) return

    const currentIndex = tabOrder.indexOf(activeTab)
    if (currentIndex === -1) return

    if (dx < 0 && currentIndex < tabOrder.length - 1) {
      onTabChange(tabOrder[currentIndex + 1])
    } else if (dx > 0 && currentIndex > 0) {
      onTabChange(tabOrder[currentIndex - 1])
    }
  }, [tabOrder, activeTab, onTabChange])

  return { onTouchStart, onTouchEnd }
}

export const TAB_ORDER = ['home', 'calendar', 'analytics', 'settings']