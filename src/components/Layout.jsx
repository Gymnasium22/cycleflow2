export function Layout({ children, activeTab, onTabChange }) {
  return (
    <div className="flex flex-col min-h-full bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)]">
      <main className="flex-1 overflow-y-auto px-5 py-6">
        {children}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  )
}

import { Home, CalendarDays, BarChart3, Settings, History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTelegram } from '../context/TelegramContext'

function BottomNav({ activeTab, onTabChange }) {
  const { t, i18n } = useTranslation()
  const { hapticFeedback } = useTelegram()

  const navItems = [
    { id: 'home', icon: Home, label: t('nav.home') },
    { id: 'calendar', icon: CalendarDays, label: t('nav.calendar') },
    { id: 'history', icon: History, label: i18n.language === 'ru' ? 'История' : 'History' },
    { id: 'analytics', icon: BarChart3, label: t('nav.analytics') },
    { id: 'settings', icon: Settings, label: t('nav.settings') },
  ]

  return (
    <nav className="sticky bottom-0 z-50 px-4 pb-5 pt-2 bg-[var(--tg-theme-bg-color,#ffffff)]/90 backdrop-blur-xl border-t border-black/5">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              hapticFeedback.impact('light')
              onTabChange(item.id)
            }}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 ${
              activeTab === item.id
                ? 'text-[var(--tg-theme-button-color,#e11d48)] bg-[var(--tg-theme-button-color,#e11d48)]/10'
                : 'text-[var(--tg-theme-hint-color,#6b7280)] hover:bg-[var(--tg-theme-hint-color,#d1d5db)]/20'
            }`}
          >
            <item.icon size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
