import { Home, CalendarDays, BarChart3, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTelegram } from '../context/TelegramContext'
import { PullToRefresh } from './PullToRefresh'

export function Layout({ children, activeTab, onTabChange }) {
  // Horizontal swipe between tabs removed: it conflicted with scrolling
  // symptom chips / horizontal lists inside pages.
  return (
    <div className="flex flex-col min-h-full bg-[var(--surface-base)] text-[var(--tg-theme-text-color,#111827)]">
      <PullToRefresh scrollKey={activeTab}>
        <main className="px-5 py-6 min-h-full">
          <div key={activeTab} className="animate-fade-in">
            {children}
          </div>
        </main>
      </PullToRefresh>
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
    <div className="sticky bottom-0 z-50 px-5 pb-6 pt-2 pointer-events-none">
      <nav className="floating-nav rounded-full px-2 py-2 pointer-events-auto mx-auto max-w-md">
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
                className={`relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all duration-300 outline-none focus-visible:ring-0 ${
                  isActive ? 'nav-pill-active text-[var(--tg-theme-button-color,#C45C6A)]' : 'text-[var(--text-muted)]'
                }`}
              >
                <item.icon
                  size={isActive ? 24 : 22}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  className="transition-all duration-300"
                />
                <span className={`text-[9px] font-medium tracking-wide ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}