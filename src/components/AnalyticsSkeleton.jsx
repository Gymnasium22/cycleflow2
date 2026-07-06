export function AnalyticsSkeleton() {
  return (
    <div className="space-y-4 pb-4">
      <div className="h-8 w-40 rounded-xl skeleton-shimmer" />
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
      <div className="h-52 rounded-2xl skeleton-shimmer" />
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    </div>
  )
}