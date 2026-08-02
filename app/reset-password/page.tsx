'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16 } from '@/components/ui/Typography'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [validSession, setValidSession] = useState<boolean | null>(null)
  const [linkError, setLinkError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Establish the recovery session from the email link. This supports three link shapes so
    // the page keeps working regardless of how the Supabase email template is configured:
    //
    //   1. token_hash flow (?token_hash=...&type=recovery) — the SCANNER-SAFE approach. The
    //      link points straight at this page and nothing is consumed until verifyOtp() runs in
    //      a real browser, so email prefetchers/security scanners can't burn the one-time token.
    //   2. Legacy PKCE flow (?code=...) — auto-exchanged by the @supabase/ssr browser client.
    //   3. Implicit flow (#access_token=...&type=recovery) — also auto-detected by the client.
    //
    // We also surface any explicit error Supabase bounces back (e.g. otp_expired) instead of
    // showing a generic "expired" message for what may actually be a valid, fresh link.
    let active = true
    let settled = false

    const markValid = () => {
      if (active && !settled) {
        settled = true
        setValidSession(true)
      }
    }
    const markInvalid = (message?: string) => {
      if (active && !settled) {
        settled = true
        if (message) setLinkError(message)
        setValidSession(false)
      }
    }

    // Supabase emits PASSWORD_RECOVERY (or SIGNED_IN) once it establishes a session from the
    // URL — this covers the auto-detected PKCE (?code) and implicit (#access_token) links.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        markValid()
      }
    })

    const establishSession = async () => {
      const params = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

      // 1. Explicit error from Supabase (expired or already-used link) — show the real reason.
      const errorCode = params.get('error_code') || hashParams.get('error_code')
      const errorDesc = params.get('error_description') || hashParams.get('error_description')
      if (errorCode) {
        markInvalid(errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : undefined)
        return
      }

      // 2. Scanner-safe token_hash flow — verify explicitly (nothing consumed until now).
      const tokenHash = params.get('token_hash')
      const type = params.get('type')
      if (tokenHash && (type === 'recovery' || type === null)) {
        const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
        if (error) markInvalid(error.message)
        else markValid()
        return
      }

      // 3. Legacy ?code / #access_token links are auto-exchanged by the client; a session
      //    should already exist or arrive shortly via onAuthStateChange above.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        markValid()
        return
      }

      // 4. Grace period for the auto-exchange / recovery event to land before giving up.
      setTimeout(async () => {
        if (!active || settled) return
        const { data: { session: lateSession } } = await supabase.auth.getSession()
        if (lateSession) markValid()
        else markInvalid()
      }, 2000)
    }

    establishSession()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      // Success! Redirect to login
      router.push('/login?message=Password reset successful. Please log in with your new password.')
    } catch (error: any) {
      setError(error.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Still checking session
  if (validSession === null) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 sm:p-10 text-center">
            <svg className="animate-spin h-8 w-8 text-gray-900 dark:text-gray-100 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <Body16 className="mt-4 text-gray-600 dark:text-gray-300">Verifying reset link...</Body16>
          </div>
        </div>
      </main>
    )
  }

  // Invalid or expired session
  if (validSession === false) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 sm:p-10">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <Heading1 className="text-2xl mb-3">Invalid or Expired Link</Heading1>
              <Body16 className="text-gray-600 dark:text-gray-300 mb-6">
                This password reset link is invalid or has expired. Reset links are single-use and
                valid for a limited time, so please request a fresh one below. For best results,
                open the reset email in the same browser you requested it from.
              </Body16>
              {linkError && (
                <Body16 className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Details: {linkError}
                </Body16>
              )}
              <a
                href="/forgot-password"
                className="inline-block px-6 py-3 bg-rb-blue text-white rounded-lg font-medium hover:bg-rb-blue-hover transition-all"
              >
                Request New Reset Link
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
          <div className="mb-8">
            <Heading1 className="text-2xl mb-2">Create New Password</Heading1>
            <Body16 className="text-gray-600 dark:text-gray-300">
              Choose a strong password for your account.
            </Body16>
          </div>

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label htmlFor="password-input" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-required="true"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="Enter new password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              <Body16 className="text-xs text-gray-500 dark:text-gray-300 mt-1">Must be at least 6 characters</Body16>
            </div>

            <div>
              <label htmlFor="confirm-password-input" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password-input"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  aria-required="true"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="Confirm new password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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
                  Resetting Password...
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
