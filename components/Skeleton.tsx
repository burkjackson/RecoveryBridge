// Reusable skeleton loading components for mobile-first design

interface SkeletonProps {
  className?: string
}

// Base skeleton with pulse animation
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-hidden="true"
    />
  )
}

// Skeleton for dashboard role cards (mobile-optimized)
export function SkeletonRoleCard() {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
      {/* Icon + Title */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Description */}
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />

      {/* Button */}
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  )
}

// Skeleton for chat messages (mobile-optimized)
export function SkeletonChatMessage({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] sm:max-w-[70%] space-y-2`}>
        {/* Message bubble */}
        <Skeleton className={`h-16 ${isOwn ? 'w-48' : 'w-56'} rounded-2xl`} />
        {/* Timestamp */}
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

// Skeleton for chat conversation list
export function SkeletonChatList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              {/* Name */}
              <Skeleton className="h-5 w-32" />
              {/* Last message */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            {/* Time */}
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Skeleton for listener cards (mobile-optimized)
export function SkeletonListenerCard() {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          {/* Name */}
          <Skeleton className="h-6 w-40" />
          {/* Status */}
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      {/* Button */}
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  )
}

// Skeleton for profile page (mobile-optimized)
export function SkeletonProfile() {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Skeleton className="h-12 flex-1 rounded-full" />
        <Skeleton className="h-12 flex-1 rounded-full" />
      </div>
    </div>
  )
}

// Skeleton for admin tables (mobile-optimized)
export function SkeletonAdminRow() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    </div>
  )
}

// Generic loading state with message
export function SkeletonPage({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="space-y-4 text-center">
        {/* Pulsing circle */}
        <div className="mx-auto">
          <Skeleton className="w-16 h-16 rounded-full" />
        </div>
        {/* Message */}
        <p className="text-rb-gray" role="status" aria-live="polite">
          {message}
        </p>
      </div>
    </div>
  )
}
