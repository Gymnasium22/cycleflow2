export function CalendarSkeleton() {
  return (
    <div className="space-y-4 pb-4 animate-pulse">
      <div className="flex gap-2 p-1 rounded-2xl bg-[var(--tg-theme-hint-color,#d1d5db)]/15">
        <div className="flex-1 h-10 rounded-xl bg-[var(--tg-theme-hint-color,#d1d5db)]/25" />
        <div className="flex-1 h-10 rounded-xl bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
      </div>

      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-xl bg-[var(--tg-theme-hint-color,#d1d5db)]/30" />
        <div className="h-8 w-36 rounded-xl bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
      </div>

      <div className="rounded-2xl p-4 bg-[var(--tg-theme-hint-color,#d1d5db)]/15">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-6 rounded-lg bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 w-20 rounded-lg bg-[var(--tg-theme-hint-color,#d1d5db)]/20" />
        ))}
      </div>
    </div>
  )
}