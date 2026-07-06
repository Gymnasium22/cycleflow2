export function HomeSkeleton() {
  return (
    <div className="space-y-4 pb-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-3/4 rounded-xl bg-[var(--tg-theme-hint-color,#d1d5db)]/30" />
        <div className="h-4 w-1/2 rounded-lg bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
      </div>

      <div className="h-64 rounded-2xl bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
      <div className="h-14 rounded-2xl bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
      <div className="h-16 rounded-2xl bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />

      <div className="space-y-3">
        <div className="h-6 w-1/2 rounded-lg bg-[var(--tg-theme-hint-color,#d1d5db)]/30" />
        <div className="h-20 rounded-2xl bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-xl bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
          <div className="h-8 w-24 rounded-xl bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
        </div>
      </div>
    </div>
  )
}