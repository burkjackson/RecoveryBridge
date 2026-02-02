// Error state component with recovery actions for mobile-first design

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryText?: string
  type?: 'inline' | 'page' | 'banner'
  className?: string
}

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
  type = 'inline',
  className = ''
}: ErrorStateProps) {

  // Page-level error (centered, full screen)
  if (type === 'page') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 ${className}`}>
        <div className="max-w-md w-full bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm text-center">
          {/* Error icon */}
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-3xl" role="img" aria-label="Error">⚠️</span>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-[#2D3436] mb-2">
            {title}
          </h2>

          {/* Message */}
          <p className="text-rb-gray mb-6">
            {message}
          </p>

          {/* Retry button */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full min-h-[44px] px-6 py-3 bg-rb-blue text-white rounded-full hover:bg-rb-blue-hover transition"
            >
              {retryText}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Banner error (top of content)
  if (type === 'banner') {
    return (
      <div className={`bg-red-50 border-2 border-red-200 rounded-lg sm:rounded-xl p-4 mb-4 ${className}`} role="alert">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0" role="img" aria-label="Error">⚠️</span>
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="font-semibold text-red-900 mb-1">
              {title}
            </h3>

            {/* Message */}
            <p className="text-red-800 text-sm mb-3">
              {message}
            </p>

            {/* Retry button */}
            {onRetry && (
              <button
                onClick={onRetry}
                className="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-full text-sm hover:bg-red-700 transition"
              >
                {retryText}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Inline error (within components)
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`} role="alert">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0" role="img" aria-label="Error">⚠️</span>
        <div className="flex-1 min-w-0">
          {/* Message */}
          <p className="text-red-800 text-sm">
            {message}
          </p>

          {/* Retry button */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-full text-sm hover:bg-red-700 transition"
            >
              {retryText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Specialized error states for common scenarios

interface ConnectionErrorProps {
  onRetry: () => void
  type?: 'inline' | 'page' | 'banner'
}

export function ConnectionError({ onRetry, type = 'inline' }: ConnectionErrorProps) {
  return (
    <ErrorState
      title="Connection Lost"
      message="We lost connection to the server. Your data is safe, but we can't sync right now."
      onRetry={onRetry}
      retryText="Reconnect"
      type={type}
    />
  )
}

interface LoadErrorProps {
  onRetry: () => void
  type?: 'inline' | 'page' | 'banner'
}

export function LoadError({ onRetry, type = 'page' }: LoadErrorProps) {
  return (
    <ErrorState
      title="Couldn't Load That"
      message="We're having trouble loading this right now. This happens sometimes! Please try again in a moment."
      onRetry={onRetry}
      retryText="Try Again"
      type={type}
    />
  )
}

interface SaveErrorProps {
  onRetry: () => void
  type?: 'inline' | 'page' | 'banner'
}

export function SaveError({ onRetry, type = 'inline' }: SaveErrorProps) {
  return (
    <ErrorState
      title="Couldn't Save Changes"
      message="We couldn't save your changes this time. Your information is important to us - please try again."
      onRetry={onRetry}
      retryText="Save Again"
      type={type}
    />
  )
}
