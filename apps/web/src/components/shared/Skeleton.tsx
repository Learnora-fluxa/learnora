interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-black/8 rounded-lg ${className}`} />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-surface rounded-card shadow-sm p-5 flex flex-col gap-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Skeleton className="size-9 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-2.5 w-3/5" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-surface rounded-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-canvas border-b border-black/6 flex gap-6">
        {[40, 25, 20, 15].map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="divide-y divide-black/4">
        {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonTable rows={6} />
    </div>
  )
}
