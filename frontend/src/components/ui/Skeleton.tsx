interface Props {
  className?: string
  lines?: number
}

export function SkeletonBlock({ className = '' }: Props) {
  return <div className={`bg-gray-200 rounded-lg animate-pulse ${className}`} />
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="bg-gray-50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-4 flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className={`h-4 bg-gray-100 rounded ${c === 0 ? 'flex-[2]' : 'flex-1'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonCardGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="flex gap-1">
            <div className="h-5 bg-gray-100 rounded w-16" />
            <div className="h-5 bg-gray-100 rounded w-16" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
          <div className="h-7 bg-gray-100 rounded w-12" />
        </div>
      ))}
    </div>
  )
}
