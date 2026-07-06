export function HomeSkeleton() {
  return (
    <div className="space-y-4 pb-4">
      <div className="space-y-2">
        <div className="h-8 w-3/4 rounded-xl skeleton-shimmer" />
        <div className="h-4 w-1/2 rounded-lg skeleton-shimmer" />
      </div>
      <div className="h-64 rounded-2xl skeleton-shimmer" />
      <div className="h-14 rounded-2xl skeleton-shimmer" />
      <div className="h-16 rounded-2xl skeleton-shimmer" />
      <div className="space-y-3">
        <div className="h-6 w-1/2 rounded-lg skeleton-shimmer" />
        <div className="h-20 rounded-2xl skeleton-shimmer" />
      </div>
    </div>
  )
}