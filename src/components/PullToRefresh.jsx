import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function PullToRefresh({ children, onRefresh, scrollKey }) {
  const { t } = useTranslation()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef(null)

  const THRESHOLD = 72
  const MAX_PULL = 100

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = 0
    setPull(0)
    setIsPulling(false)
  }, [scrollKey])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      if (onRefresh) {
        await onRefresh()
      } else {
        sessionStorage.removeItem('cicle_reload_attempted')
        window.location.reload()
      }
    } finally {
      setRefreshing(false)
      setPull(0)
    }
  }, [onRefresh])

  function onTouchStart(e) {
    const el = containerRef.current
    if (!el || el.scrollTop > 0 || refreshing) return
    startY.current = e.touches[0].clientY
    setIsPulling(true)
  }

  function onTouchMove(e) {
    if (!isPulling || refreshing) return
    const el = containerRef.current
    if (!el || el.scrollTop > 0) {
      setIsPulling(false)
      setPull(0)
      return
    }
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      setPull(Math.min(delta * 0.45, MAX_PULL))
    }
  }

  async function onTouchEnd() {
    if (!isPulling) return
    setIsPulling(false)
    if (pull >= THRESHOLD) {
      await handleRefresh()
    } else {
      setPull(0)
    }
  }

  const progress = Math.min(pull / THRESHOLD, 1)

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div
        className="absolute left-0 right-0 flex justify-center z-10 pointer-events-none transition-opacity duration-200"
        style={{
          top: Math.max(pull - 48, -48),
          opacity: pull > 8 || refreshing ? 1 : 0,
        }}
      >
        <div className="pull-ring-indicator" style={{ '--pull-progress': progress }}>
          {refreshing ? (
            <span className="text-[10px] font-medium text-[var(--tg-theme-hint-color)]">{t('app.loading')}</span>
          ) : (
            <span className="text-[10px] font-medium text-[var(--tg-theme-hint-color)]">
              {progress >= 1 ? t('app.releaseToRefresh') : t('app.pullToRefresh')}
            </span>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        data-app-scroll
        className="flex-1 overflow-y-auto touch-pan-y"
        style={{
          transform: pull > 0 ? `translateY(${pull}px)` : undefined,
          transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}