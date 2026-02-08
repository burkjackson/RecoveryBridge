'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [userRole, setUserRole] = useState('')
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserId(user.id)

    // Load existing profile data if any
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setDisplayName(profile.display_name || '')
      setBio(profile.bio || '')
      setUserRole(profile.user_role || '')
    }
  }

  async function handleNext() {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      if (!userRole) {
        setError('Please select a role')
        return
      }
      setError('')
      setStep(3)
    } else if (step === 3) {
      if (!bio.trim()) {
        setError('Please tell us a bit about yourself')
        return
      }
      setError('')
      setStep(4)
    } else if (step === 4) {
      if (!agreedToGuidelines) {
        setError('Please agree to the community guidelines')
        return
      }
      await completeOnboarding()
    }
  }

  async function completeOnboarding() {
    if (!userId) return

    setSaving(true)
    setError('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio,
          user_role: userRole,
          role_state: 'offline',
        })
        .eq('id', userId)

      if (error) throw error

      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-rb-blue/5 via-rb-white to-rb-blue/10">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 border border-rb-gray/10">
          {/* Branding */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-[#2D3436] mb-2">RecoveryBridge</h2>
            <Body16 className="text-rb-gray italic">"Connection is the antidote to addiction"</Body16>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-3 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-gradient-to-r from-[#3B82F6] to-[#2563EB] shadow-sm' : 'bg-gray-200'
                }`}
                role="progressbar"
                aria-valuenow={step}
                aria-valuemin={1}
                aria-valuemax={4}
                aria-label={`Step ${s} of 4`}
              />
            ))}
          </div>
          <Body16 className="text-center text-rb-gray text-sm mb-8">Step {step} of 4</Body16>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center">
            <Heading1 className="mb-4">Welcome to RecoveryBridge</Heading1>
            <Body16 className="mb-8 text-rb-gray leading-relaxed">
              RecoveryBridge is a safe, supportive space where people in recovery can connect with
              listeners who understand the journey. Whether you're here to offer support or seek it,
              you're part of a compassionate community working to make the world a better place in recovery.
            </Body16>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-8 border-2 border-[#3B82F6]/20 shadow-sm">
              <div className="flex items-center gap-2 justify-center mb-3">
                <span className="text-2xl" role="img" aria-label="Heart">💙</span>
                <Body18 className="font-bold text-[#2D3436]">Our Mission</Body18>
              </div>
              <Body16 className="text-rb-gray">
                We believe recovery is stronger together. Every conversation here is built on empathy,
                respect, and the shared understanding that healing takes courage.
              </Body16>
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white py-3.5 rounded-full font-semibold hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started →
            </button>
          </div>
        )}

        {/* Step 2: Role Selection */}
        {step === 2 && (
          <div>
            <Heading1 className="mb-4 text-center">How would you like to participate?</Heading1>
            <Body16 className="mb-8 text-center text-rb-gray">
              You can switch between these roles anytime from your dashboard.
            </Body16>

            <div className="space-y-3 mb-8">
              <button
                onClick={() => setUserRole('person_in_recovery')}
                className={`w-full p-5 rounded-xl border-4 text-left transition-all shadow-sm hover:shadow-md ${
                  userRole === 'person_in_recovery'
                    ? 'border-[#3B82F6] bg-gradient-to-br from-blue-50 to-blue-25 shadow-md'
                    : 'border-rb-gray/40 hover:border-[#3B82F6]'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl" role="img" aria-label="Star">🌟</span>
                  <Body18 className="font-bold text-[#2D3436]">Person in Recovery</Body18>
                </div>
                <Body16 className="text-rb-gray text-sm">
                  I'm on my recovery journey and may seek support or offer it to others.
                </Body16>
              </button>

              <button
                onClick={() => setUserRole('professional')}
                className={`w-full p-5 rounded-xl border-4 text-left transition-all shadow-sm hover:shadow-md ${
                  userRole === 'professional'
                    ? 'border-[#3B82F6] bg-gradient-to-br from-blue-50 to-blue-25 shadow-md'
                    : 'border-rb-gray/40 hover:border-[#3B82F6]'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl" role="img" aria-label="Handshake">🤝</span>
                  <Body18 className="font-bold text-[#2D3436]">Allies for Long-Term Recovery</Body18>
                </div>
                <Body16 className="text-rb-gray text-sm">
                  Giving back by offering support to others on their journey.
                </Body16>
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <Body16 className="text-red-700 font-medium">{error}</Body16>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-full font-semibold border-2 border-rb-gray text-rb-gray hover:border-[#3B82F6] hover:text-[#3B82F6] transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white py-3 rounded-full font-semibold hover:shadow-lg transition-all transform hover:scale-[1.02]"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Bio */}
        {step === 3 && (
          <div>
            <div className="text-center mb-8">
              <span className="text-4xl mb-4 inline-block" role="img" aria-label="Writing">✍️</span>
            </div>
            <Heading1 className="mb-4 text-center">Tell us about yourself</Heading1>
            <Body16 className="mb-8 text-center text-rb-gray">
              Share what you're comfortable with. This helps others understand how to connect with you.
            </Body16>

            <div className="mb-8">
              <label className="body-16 block mb-3 font-medium text-[#2D3436]">
                About You
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border-2 border-rb-gray/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all resize-none"
                placeholder="Share your story, what brings you here, or what you hope to offer others..."
              />
              <Body16 className="mt-2 text-rb-gray text-sm">
                💭 Not sure what to share? Consider: What brings you to RecoveryBridge? What does recovery look like for you? What's one thing you'd like others to know about you? What helps you most in your recovery journey?
              </Body16>
              <Body16 className="mt-2 text-rb-gray text-sm italic">
                This appears on your profile and helps others connect with you.
              </Body16>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <Body16 className="text-red-700 font-medium">{error}</Body16>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-full font-semibold border-2 border-rb-gray text-rb-gray hover:border-[#3B82F6] hover:text-[#3B82F6] transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white py-3 rounded-full font-semibold hover:shadow-lg transition-all transform hover:scale-[1.02]"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Community Guidelines */}
        {step === 4 && (
          <div>
            <Heading1 className="mb-4 text-center">Community Guidelines</Heading1>
            <Body16 className="mb-6 text-center">
              RecoveryBridge is built on the belief that connection is the antidote to addiction and we do not heal in isolation. This is a space where your story matters, your struggles are valid, and your progress—no matter how small—deserves celebration.
            </Body16>

            <div className="bg-[#F8F9FA] rounded-2xl p-6 mb-8 space-y-4">
              <div>
                <Body18 className="mb-2"><span role="img" aria-label="Blue heart">💙</span> Lead with Compassion</Body18>
                <Body16>
                  We're all doing our best. Approach every conversation with compassion, remembering that everyone here is on their own unique journey. Your kindness can be someone's lifeline today.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2"><span role="img" aria-label="Lock">🔒</span> Honor Sacred Trust</Body18>
                <Body16>
                  What's shared here is sacred. Protect each other's stories and privacy as if they were your own. This trust is what makes vulnerability possible.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2"><span role="img" aria-label="Star">🌟</span> Celebrate Every Step</Body18>
                <Body16>
                  Recovery isn't linear, and every journey looks different. Whether someone is on day 1 or year 10, meet them where they are with encouragement, not advice. Your role is to listen, not to fix.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2"><span role="img" aria-label="SOS">🆘</span> You Are Worth Saving</Body18>
                <Body16>
                  If you're in crisis, please reach out for immediate help: <strong>988</strong> (Suicide & Crisis Lifeline), <strong>911</strong> (Emergency), or text <strong>HOME to 741741</strong> (Crisis Text Line). RecoveryBridge is here for peer support, but your safety comes first. There's no shame in reaching out for professional help—it's a sign of strength.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2"><span role="img" aria-label="Sparkles">✨</span> Practice Self-Care</Body18>
                <Body16>
                  You can't pour from an empty cup. It's okay to step away, set boundaries, or take breaks. Taking care of yourself isn't selfish—it's essential to your recovery.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2"><span role="img" aria-label="Raised hands">🙌</span> Share Your Wins</Body18>
                <Body16>
                  Recovery is hard work and deserves recognition. Celebrate your victories—whether it's 24 hours sober, getting out of bed, or reaching out for help. We're here to cheer you on.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2"><span role="img" aria-label="Shield">🛡️</span> Protect Our Community</Body18>
                <Body16>
                  If something doesn't feel right or someone needs help, please let us know. Reporting concerns helps us keep this space safe for everyone. You're not causing trouble—you're protecting our community.
                </Body16>
              </div>
            </div>

            <label className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-blue-50 border-2 border-[#3B82F6]/30 cursor-pointer hover:border-[#3B82F6] transition-all">
              <input
                type="checkbox"
                checked={agreedToGuidelines}
                onChange={(e) => setAgreedToGuidelines(e.target.checked)}
                className="mt-1 w-5 h-5 accent-[#3B82F6] cursor-pointer"
              />
              <Body16 className="font-medium text-[#2D3436]">
                I commit to showing up with compassion, honoring confidentiality, and helping create a safe space where everyone can heal and grow together.
              </Body16>
            </label>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <Body16 className="text-red-700 font-medium">{error}</Body16>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-full font-semibold border-2 border-rb-gray text-rb-gray hover:border-[#3B82F6] hover:text-[#3B82F6] transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white py-3 rounded-full font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
              >
                {saving ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Complete Onboarding ✓'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
