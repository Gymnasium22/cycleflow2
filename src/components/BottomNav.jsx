import { NavLink } from 'react-router-dom'
import { Home, CalendarDays, BarChart3, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function BottomNav() {
  const { t } = useTranslation()

  const navItems = [
    { to: '/', icon: Home, label: t('nav.home') },
    { to: '/calendar', icon: CalendarDays, label: t('nav.calendar') },
    { to: '/analytics', icon: BarChart3, label: t('nav.analytics') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ]

  return (
    <nav className="sticky bottom-0 z-50 px-4 pb-5 pt-2 bg-[var(--tg-theme-bg-color,#ffffff)]/90 backdrop-blur-xl border-t border-black/5">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-[var(--tg-theme-button-color,#e11d48)] bg-[var(--tg-theme-button-color,#e11d48)]/10'
                  : 'text-[var(--tg-theme-hint-color,#6b7280)] hover:bg-black/5'
              }`
            }
          >
            <item.icon size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
