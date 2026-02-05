/**
 * Skeleton loading component for company cards
 * Provides visual feedback while companies are loading
 */

export function CompanyCardSkeleton() {
  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] overflow-hidden animate-pulse">
      {/* Company Header */}
      <div className="p-4 border-b border-gray-03">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 bg-gray-03 rounded" />
            <div className="h-6 w-32 bg-gray-03 rounded" />
          </div>
          <div className="h-8 w-24 bg-gray-03 rounded" />
        </div>
      </div>

      {/* Year Row Skeleton */}
      <div className="border-t border-gray-03 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-4 w-4 bg-gray-03 rounded" />
          <div className="h-5 w-16 bg-gray-03 rounded" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-03 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
