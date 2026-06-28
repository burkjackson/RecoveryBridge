'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heading1, Body16 } from '@/components/ui/Typography'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/reset-password`,
      })

      if (error) throw error

      setSuccess(true)
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 sm:p-10">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <Heading1 className="text-2xl mb-3">Check Your Email</Heading1>
              <Body16 className="text-gray-600 dark:text-gray-300">
                We've sent a password reset link to <strong>{email}</strong>
              </Body16>
            </div>

            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
              <p>Click the link in the email to reset your password. The link will expire in 1 hour.</p>
              <p>Don't see the email? Check your spam folder or try again with a different email address.</p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
              <a
                href="/login"
                className="block w-full text-center px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                Back to Login
              </a>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 sm:p-10">
          {/* Header */}
          <div className="mb-8">
            <a href="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition mb-4">
              ← Back to Login
            </a>
            <Heading1 className="text-2xl mb-2">Reset Your Password</Heading1>
            <Body16 className="text-gray-600 dark:text-gray-300">
              Enter your email address and we'll send you a link to reset your password.
            </Body16>
          </div>

          <form onSubmit={handleResetRequest} className="space-y-4">
            <div>
              <label htmlFor="email-input" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
                aria-invalid={error ? "true" : "false"}
                aria-describedby={error ? "reset-error" : undefined}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <div id="reset-error" role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <Body16 className="text-red-600 dark:text-red-300 text-sm">{error}</Body16>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rb-blue text-white py-3 rounded-lg font-medium hover:bg-rb-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
