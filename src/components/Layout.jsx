import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function Layout() {
  return (
    <div className="flex flex-col min-h-full bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)]">
      <main className="flex-1 overflow-y-auto px-5 py-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
