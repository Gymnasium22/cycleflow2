export function AnalyticsSkeleton() {
  return (
    <div className="space-y-4 pb-4 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-[var(--tg-theme-hint-color,#d1d5db)]/30" />

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
        ))}
      </div>

      <div className="h-48 rounded-2xl bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />

      <div className="space-y-3">
        <div className="h-6 w-1/2 rounded-lg bg-[var(--tg-theme-hint-color,#d1d5db)]/30" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
          ))}
        </div>
      </div>
    </div>
  )
}