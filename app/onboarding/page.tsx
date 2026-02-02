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
    <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
        {/* Progress indicator */}
        <div className="flex gap-2 mb-6 sm:mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-rb-blue' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center">
            <Heading1 className="mb-4">Welcome to RecoveryBridge</Heading1>
            <Body16 className="mb-6">
              RecoveryBridge is a safe, supportive space where people in recovery can connect with
              listeners who understand the journey. Whether you're here to offer support or seek it,
              you're part of a compassionate community.
            </Body16>
            <div className="bg-[#E8E4F0] rounded-2xl p-6 mb-8">
              <Body18 className="mb-3">Our Mission</Body18>
              <Body16>
                We believe recovery is stronger together. Every conversation here is built on empathy,
                respect, and the shared understanding that healing takes courage.
              </Body16>
            </div>
            <button
              onClick={handleNext}
              className="w-full py-3 rounded-full font-semibold text-white transition"
              style={{ backgroundColor: 'rb-blue-TEMP' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rb-blue-hover-TEMP'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rb-blue-TEMP'}
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 2: Role Selection */}
        {step === 2 && (
          <div>
            <Heading1 className="mb-4 text-center">How would you like to participate?</Heading1>
            <Body16 className="mb-8 text-center">
              You can switch between these roles anytime from your dashboard.
            </Body16>

            <div className="space-y-4 mb-8">
              <button
                onClick={() => setUserRole('person_in_recovery')}
                className={`w-full p-6 rounded-2xl border-2 text-left transition ${
                  userRole === 'person_in_recovery'
                    ? 'border-rb-blue bg-[#E8E4F0]'
                    : 'border-gray-200 hover:border-rb-blue/50'
                }`}
              >
                <Body18 className="mb-2">People in Recovery</Body18>
                <Body16>
                  I'm on my recovery journey and may seek support or offer it to others.
                </Body16>
              </button>

              <button
                onClick={() => setUserRole('professional')}
                className={`w-full p-6 rounded-2xl border-2 text-left transition ${
                  userRole === 'professional'
                    ? 'border-rb-blue bg-[#E8E4F0]'
                    : 'border-gray-200 hover:border-rb-blue/50'
                }`}
              >
                <Body18 className="mb-2">Allies in Long-Term Recovery</Body18>
                <Body16>
                  Giving back by offering support to others on their journey.
                </Body16>
              </button>

              <button
                onClick={() => setUserRole('ally')}
                className={`w-full p-6 rounded-2xl border-2 text-left transition ${
                  userRole === 'ally'
                    ? 'border-rb-blue bg-[#E8E4F0]'
                    : 'border-gray-200 hover:border-rb-blue/50'
                }`}
              >
                <Body18 className="mb-2">Recovery Support</Body18>
                <Body16>
                  Supporting the recovery community with empathy and understanding.
                </Body16>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <Body16 className="text-red-600">{error}</Body16>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-full font-semibold border-2 transition"
                style={{ borderColor: 'rb-blue-TEMP', color: 'rb-blue-TEMP' }}
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-3 rounded-full font-semibold text-white transition"
                style={{ backgroundColor: 'rb-blue-TEMP' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rb-blue-hover-TEMP'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rb-blue-TEMP'}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Bio */}
        {step === 3 && (
          <div>
            <Heading1 className="mb-4 text-center">Tell us about yourself</Heading1>
            <Body16 className="mb-8 text-center">
              Share what you're comfortable with. This helps others understand how to connect with you.
            </Body16>

            <div className="mb-8">
              <label className="body-16 block mb-2">About You</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rb-blue"
                placeholder="Share your story, what brings you here, or what you hope to offer others..."
              />
              <Body16 className="mt-2 text-gray-500">
                Optional: This appears on your profile and helps others connect with you.
              </Body16>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <Body16 className="text-red-600">{error}</Body16>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-full font-semibold border-2 transition"
                style={{ borderColor: 'rb-blue-TEMP', color: 'rb-blue-TEMP' }}
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-3 rounded-full font-semibold text-white transition"
                style={{ backgroundColor: 'rb-blue-TEMP' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rb-blue-hover-TEMP'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rb-blue-TEMP'}
              >
                Continue
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
                <Body18 className="mb-2">💙 Lead with Compassion</Body18>
                <Body16>
                  We're all doing our best. Approach every conversation with compassion, remembering that everyone here is on their own unique journey. Your kindness can be someone's lifeline today.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2">🔒 Honor Sacred Trust</Body18>
                <Body16>
                  What's shared here is sacred. Protect each other's stories and privacy as if they were your own. This trust is what makes vulnerability possible.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2">🌟 Celebrate Every Step</Body18>
                <Body16>
                  Recovery isn't linear, and every journey looks different. Whether someone is on day 1 or year 10, meet them where they are with encouragement, not advice. Your role is to listen, not to fix.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2">🆘 You Are Worth Saving</Body18>
                <Body16>
                  If you're in crisis, please reach out for immediate help: <strong>988</strong> (Suicide & Crisis Lifeline), <strong>911</strong> (Emergency), or text <strong>HOME to 741741</strong> (Crisis Text Line). RecoveryBridge is here for peer support, but your safety comes first. There's no shame in reaching out for professional help—it's a sign of strength.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2">✨ Practice Self-Care</Body18>
                <Body16>
                  You can't pour from an empty cup. It's okay to step away, set boundaries, or take breaks. Taking care of yourself isn't selfish—it's essential to your recovery.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2">🙌 Share Your Wins</Body18>
                <Body16>
                  Recovery is hard work and deserves recognition. Celebrate your victories—whether it's 24 hours sober, getting out of bed, or reaching out for help. We're here to cheer you on.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2">🛡️ Protect Our Community</Body18>
                <Body16>
                  If something doesn't feel right or someone needs help, please let us know. Reporting concerns helps us keep this space safe for everyone. You're not causing trouble—you're protecting our community.
                </Body16>
              </div>
            </div>

            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToGuidelines}
                onChange={(e) => setAgreedToGuidelines(e.target.checked)}
                className="mt-1 w-5 h-5"
                style={{ accentColor: 'rb-blue-TEMP' }}
              />
              <Body16>
                I commit to showing up with compassion, honoring confidentiality, and helping create a safe space where everyone can heal and grow together.
              </Body16>
            </label>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <Body16 className="text-red-600">{error}</Body16>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-full font-semibold border-2 transition"
                style={{ borderColor: 'rb-blue-TEMP', color: 'rb-blue-TEMP' }}
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={saving}
                className="flex-1 py-3 rounded-full font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: 'rb-blue-TEMP' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rb-blue-hover-TEMP'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rb-blue-TEMP'}
              >
                {saving ? 'Saving...' : 'Complete Onboarding'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
