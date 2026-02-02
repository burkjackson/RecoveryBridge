'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16 } from '@/components/ui/Typography'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/profile')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-rb-white">
      <div className="w-full max-w-md px-4 sm:px-0">
        <Heading1 className="text-center mb-6 sm:mb-8">Welcome Back</Heading1>

        <form onSubmit={handleLogin} className="space-y-6" aria-label="Login form">
          <div>
            <label htmlFor="email-input" className="body-16 block mb-2">
              Email <span className="text-red-600" aria-label="required">*</span>
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? "login-error" : undefined}
              className="w-full px-4 py-2 border border-rb-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password-input" className="body-16 block mb-2">
              Password <span className="text-red-600" aria-label="required">*</span>
            </label>
            <input
              id="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? "login-error" : undefined}
              className="w-full px-4 py-2 border border-rb-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
              placeholder="Your password"
            />
          </div>

          {error && (
            <div id="login-error" role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <Body16 className="text-red-600">{error}</Body16>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rb-blue text-white py-3 rounded-full font-semibold hover:bg-rb-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <Body16 className="text-center mt-6">
          Don't have an account?{' '}
          <a href="/signup" className="text-rb-blue font-semibold hover:text-rb-blue-hover hover:underline transition">
            Sign up
          </a>
        </Body16>
      </div>
    </main>
  )
}
