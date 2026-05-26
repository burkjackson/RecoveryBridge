'use client'

export default function OfflinePage() {
  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center p-6 bg-[#F8F9FA]">
      <div className="max-w-sm w-full text-center">
        <div className="mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-16 h-16 mx-auto text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M6.343 6.343a9 9 0 000 12.728M9.172 9.172a5 5 0 000 7.072"
            />
            <line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" strokeWidth={1.5} />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-3">You&rsquo;re offline</h1>
        <p className="text-gray-500 mb-6 leading-relaxed">
          RecoveryBridge needs an internet connection to connect you with listeners.
          Check your connection and try again.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm font-semibold text-amber-800 mb-1">Need immediate support?</p>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>
              <a href="tel:988" className="underline font-medium">Call or text 988</a>
              {' '}— Suicide &amp; Crisis Lifeline
            </li>
            <li>
              Text <strong>HOME</strong> to <strong>741741</strong> — Crisis Text Line
            </li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-[#5A7A8C] text-white rounded-xl font-semibold hover:bg-[#4A6A7C] transition-colors"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
