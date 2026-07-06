import { CycleRingIllustration, CalendarIllustration, WellnessIllustration, AnalyticsIllustration } from './Illustrations'

const ILLUSTRATIONS = {
  cycle: CycleRingIllustration,
  calendar: CalendarIllustration,
  wellness: WellnessIllustration,
  analytics: AnalyticsIllustration,
}

export function EmptyState({ icon: Icon, illustration, title, description, action }) {
  const Illustration = illustration ? ILLUSTRATIONS[illustration] : null

  return (
    <div className="text-center py-10 px-4 space-y-4 animate-fade-in">
      {Illustration ? (
        <div className="flex justify-center">
          <Illustration />
        </div>
      ) : Icon ? (
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass-panel elevation-1">
          <Icon size={28} className="text-[var(--tg-theme-button-color,#C45C6A)]" strokeWidth={1.75} />
        </div>
      ) : null}
      <h3 className="font-display text-lg font-semibold text-[var(--tg-theme-text-color,#111827)]">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}