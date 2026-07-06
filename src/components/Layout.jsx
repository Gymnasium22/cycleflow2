import { Home, CalendarDays, BarChart3, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTelegram } from '../context/TelegramContext'
import { useSwipeTabs, TAB_ORDER } from '../hooks/useSwipeTabs'

export function Layout({ children, activeTab, onTabChange }) {
  const { onTouchStart, onTouchEnd } = useSwipeTabs(TAB_ORDER, activeTab, onTabChange)

  return (
    <div className="flex flex-col min-h-full bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)]">
      <main
        className="flex-1 overflow-y-auto px-5 py-6 touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  )
}

function BottomNav({ activeTab, onTabChange }) {
  const { t } = useTranslation()
  const { hapticFeedback } = useTelegram()

  const navItems = [
    { id: 'home', icon: Home, label: t('nav.home') },
    { id: 'calendar', icon: CalendarDays, label: t('nav.calendar') },
    { id: 'analytics', icon: BarChart3, label: t('nav.analytics') },
    { id: 'settings', icon: Settings, label: t('nav.settings') },
  ]

  return (
    <nav className="sticky bottom-0 z-50 px-4 pb-5 pt-2 bg-[var(--tg-theme-bg-color,#ffffff)]/90 backdrop-blur-xl border-t border-black/5">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                hapticFeedback.impact('light')
                onTabChange(item.id)
              }}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-200 outline-none focus-visible:ring-0 ${
                isActive
                  ? 'text-[var(--tg-theme-button-color,#e11d48)]'
                  : 'text-[var(--tg-theme-hint-color,#6b7280)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20'
              }`}
            >
              <item.icon size={isActive ? 26 : 22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[var(--tg-theme-button-color,#e11d48)]" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}