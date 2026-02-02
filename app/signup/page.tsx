'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16 } from '@/components/ui/Typography'
import Modal from '@/components/Modal'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // First check if username is already taken
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', displayName)
        .single()

      if (existingProfile) {
        setError('This username is already taken. Please choose another.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      })

      if (error) throw error

      // Show success message and redirect to login
      if (data.user) {
        setShowSuccessModal(true)
      }
    } catch (error: any) {
      // Handle unique constraint violation
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
    <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-rb-white">
      <div className="w-full max-w-md px-4 sm:px-0">
        <Heading1 className="text-center mb-8">Join RecoveryBridge</Heading1>

        <form onSubmit={handleSignup} className="space-y-6" aria-label="Sign up form">
          <div>
            <label htmlFor="displayname-input" className="body-16 block mb-2">
              Display Name <span className="text-red-600" aria-label="required">*</span>
            </label>
            <input
              id="displayname-input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              aria-required="true"
              aria-invalid={error ? "true" : "false"}
              className="w-full px-4 py-2 border border-rb-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="signup-email-input" className="body-16 block mb-2">
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
              className="w-full px-4 py-2 border border-rb-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="signup-password-input" className="body-16 block mb-2">
              Password <span className="text-red-600" aria-label="required">*</span>
            </label>
            <input
              id="signup-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              aria-required="true"
              aria-invalid={error ? "true" : "false"}
              aria-describedby="password-help"
              className="w-full px-4 py-2 border border-rb-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
              placeholder="At least 6 characters"
            />
            <p id="password-help" className="text-sm text-rb-gray mt-1">
              Must be at least 6 characters
            </p>
          </div>

          {error && (
            <div id="signup-error" role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <Body16 className="text-red-600">{error}</Body16>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rb-blue text-white py-3 rounded-full font-semibold hover:bg-rb-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <Body16 className="text-center mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-rb-blue font-semibold hover:text-rb-blue-hover hover:underline transition">
            Log in
          </a>
        </Body16>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false)
          router.push('/login')
        }}
        title="Account Created! 🎉"
        confirmText="Go to Login"
        confirmStyle="success"
      >
        <p className="text-lg mb-4">
          Your account has been created successfully!
        </p>
        <div className="bg-rb-blue/10 border border-rb-blue/30 rounded-lg p-4">
          <p className="text-sm">
            <strong>📧 Check your email</strong>
            <br />
            <br />
            We've sent a verification link to <strong>{email}</strong>. Please click the link to activate your account.
            <br />
            <br />
            Once verified, you can log in and start using RecoveryBridge.
          </p>
        </div>
      </Modal>
    </main>
  )
}
