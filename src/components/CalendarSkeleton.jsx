export function CalendarSkeleton() {
  return (
    <div className="space-y-4 pb-4">
      <div className="h-10 w-48 rounded-xl skeleton-shimmer" />
      <div className="rounded-2xl p-4 skeleton-shimmer h-72" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-16 rounded-lg skeleton-shimmer" />
        ))}
      </div>
    </div>
  )
}