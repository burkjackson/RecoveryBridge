'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16 } from '@/components/ui/Typography'
import Modal from '@/components/Modal'
import { CONSENT_VERSION } from '@/lib/constants'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [healthDataConsent, setHealthDataConsent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Redirect already-authenticated users to dashboard
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push('/dashboard')
    })
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!ageConfirmed) {
      setError('You must confirm that you are 18 years of age or older to create an account.')
      setLoading(false)
      return
    }

    if (!healthDataConsent) {
      setError('Please consent to the collection of your health-related information so we can provide peer support.')
      setLoading(false)
      return
    }

    try {
      // Create account - database unique constraint will prevent duplicates atomically
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            consent_version: CONSENT_VERSION,
            consent_accepted_at: new Date().toISOString(),
            age_confirmed: true,
            health_data_consent: true,
            health_data_consent_at: new Date().toISOString(),
          },
          emailRedirectTo: siteUrl,
        },
      })

      if (error) throw error

      // Ensure session is established before showing modal
      if (data.user && data.session) {
        setShowSuccessModal(true)
      } else if (data.user) {
        // Session should exist for signUp, but proceed anyway
        console.warn('User created but no session returned')
        setShowSuccessModal(true)
      }
    } catch (error: any) {
      // Handle unique constraint violation for duplicate usernames
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        setError('This username is already taken. Please choose another.')
      } else {
        setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Welcome Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <img
                src="/logo-with-text.png"
                alt="RecoveryBridge Logo"
                className="mx-auto mb-4"
                style={{ width: '400px' }}
              />
              <Body16 className="text-gray-500 dark:text-gray-300 mb-6">Create your account</Body16>
            </div>

            <form onSubmit={handleSignup} className="space-y-4" aria-label="Sign up form">
              <div>
                <label htmlFor="displayname-input" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Display Name
                </label>
                <input
                  id="displayname-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={error ? "true" : "false"}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="signup-email-input" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email <span className="text-red-600" aria-label="required">*</span>
                </label>
                <input
                  id="signup-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? "signup-error" : undefined}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="signup-password-input" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password <span className="text-red-600" aria-label="required">*</span>
                </label>
                <div className="relative">
                  <input
                    id="signup-password-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    aria-required="true"
                    aria-invalid={error ? "true" : "false"}
                    aria-describedby="password-help"
                    className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-rb-gray hover:text-rb-blue transition-colors p-1 rounded"
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
                <p id="password-help" className="text-sm text-rb-gray dark:text-gray-300 mt-1">
                  Must be at least 8 characters
                </p>
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="age-confirm"
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-rb-blue focus:ring-rb-blue cursor-pointer"
                  aria-required="true"
                />
                <label htmlFor="age-confirm" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  I confirm that I am <strong>18 years of age or older</strong> and agree to the{' '}
                  <a href="/terms" className="text-rb-blue hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-rb-blue hover:underline">Privacy Policy</a>
                </label>
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="health-consent"
                  type="checkbox"
                  checked={healthDataConsent}
                  onChange={(e) => setHealthDataConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-rb-blue focus:ring-rb-blue cursor-pointer"
                  aria-required="true"
                />
                <label htmlFor="health-consent" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  I consent to RecoveryBridge collecting and processing my <strong>health-related information</strong> (such as mental health, substance use, and recovery details I choose to share) for the purpose of providing peer support. See the{' '}
                  <a href="/privacy" className="text-rb-blue hover:underline">Consumer Health Data Privacy Notice</a>. You can withdraw consent anytime by deleting your account.
                </label>
              </div>

              {error && (
                <div id="signup-error" role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-800 rounded">
                  <Body16 className="text-sm text-red-700 dark:text-red-300">{error}</Body16>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !ageConfirmed || !healthDataConsent}
                className="w-full bg-rb-blue text-white py-3 rounded-lg font-semibold hover:bg-rb-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Sign Up'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Body16 className="text-center text-gray-600 dark:text-gray-300">
                Already have an account?{' '}
                <a href="/login" className="text-rb-blue font-semibold hover:underline transition">
                  Log in
                </a>
              </Body16>
            </div>
          </div>
        </div>

        {/* Success Modal */}
        <Modal
          isOpen={showSuccessModal}
          onClose={async () => {
            setShowSuccessModal(false)
            // Give session cookies a moment to fully sync before navigation
            await new Promise(resolve => setTimeout(resolve, 200))
            router.push('/onboarding')
          }}
          title="Welcome to RecoveryBridge! 🎉"
          confirmText="Get Started"
          confirmStyle="success"
        >
          <p className="text-lg">
            Your account has been created successfully! Let's get you set up.
          </p>
        </Modal>
      </main>
  )
}
