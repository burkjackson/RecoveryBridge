'use client'

import { useEffect } from 'react'
import { Heading1, Body16 } from '@/components/ui/Typography'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">😔</div>
        <Heading1 className="text-xl mb-3">Dashboard couldn't load</Heading1>
        <Body16 className="text-gray-600 mb-6">
          Something went wrong loading your dashboard. This is usually temporary.
        </Body16>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="min-h-[44px] px-6 py-3 bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full font-semibold hover:shadow-lg transition-all"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="min-h-[44px] px-6 py-3 bg-gray-100 text-gray-700 rounded-full font-semibold hover:bg-gray-200 transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    </main>
  )
}
