'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16 } from '@/components/ui/Typography'
import SkipLink from '@/components/SkipLink'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
    <>
      <SkipLink />
      <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-rb-blue/5 via-rb-white to-rb-blue/10">
      <div className="w-full max-w-md">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-rb-gray/10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <h2 className="text-4xl font-bold text-[#2D3436] mb-2">RecoveryBridge</h2>
              <Body16 className="text-rb-gray italic mb-4">
                "Connection is the antidote to addiction"
              </Body16>
              <Body16 className="text-rb-gray font-bold mb-2">
                We do not heal in isolation
              </Body16>
              <Body16 className="text-rb-gray font-bold">
                Your story matters here
              </Body16>
            </div>
            <Heading1 className="mb-2 mt-6">Welcome Back</Heading1>
            <Body16 className="text-rb-gray">
              Your community is here for you
            </Body16>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" aria-label="Login form">
            <div>
              <label htmlFor="email-input" className="body-16 block mb-2 font-medium text-[#2D3436]">
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
                className="w-full px-4 py-3 border-2 border-rb-gray/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password-input" className="body-16 font-medium text-[#2D3436]">
                  Password <span className="text-red-600" aria-label="required">*</span>
                </label>
                <a href="/forgot-password" className="text-sm text-rb-blue hover:text-rb-blue-hover hover:underline transition">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-required="true"
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? "login-error" : undefined}
                  className="w-full px-4 py-3 pr-12 border-2 border-rb-gray/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all"
                  placeholder="Your password"
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
            </div>

            {error && (
              <div id="login-error" role="alert" className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <Body16 className="text-red-700 font-medium">{error}</Body16>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white py-3.5 rounded-full font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Log In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-rb-gray/10">
            <Body16 className="text-center">
              Don't have an account?{' '}
              <a href="/signup" className="text-rb-blue font-semibold hover:text-rb-blue-hover hover:underline transition">
                Sign up
              </a>
            </Body16>
          </div>
        </div>
      </div>
    </main>
    </>
  )
}
