'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import TagSelector from '@/components/TagSelector'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [userRole, setUserRole] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false)
  const [referralSource, setReferralSource] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser(retryCount = 0) {
    const { data: { user } } = await supabase.auth.getUser()

    // If no user and this is first attempt, wait and retry once
    // This handles the case where session cookies are still syncing after signup
    if (!user && retryCount === 0) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return checkUser(1)
    }

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
      setError('')
      setStep(5)
    } else if (step === 5) {
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
          tags: tags.length > 0 ? tags : null,
          referral_source: referralSource || null,
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
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-sm p-6 sm:p-8 md:p-10">
          {/* Branding */}
          <div className="text-center mb-6">
            <img
              src="/logo-with-text.png"
              alt="RecoveryBridge Logo"
              className="mx-auto mb-4"
              style={{ width: '400px' }}
            />
            <Body16 className="text-gray-500">Set up your profile</Body16>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-rb-blue' : 'bg-gray-200'
                }`}
                role="progressbar"
                aria-valuenow={step}
                aria-valuemin={1}
                aria-valuemax={5}
                aria-label={`Step ${s} of 5`}
              />
            ))}
          </div>
          <Body16 className="text-center text-gray-500 text-sm mb-8">Step {step} of 5</Body16>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center">
            <Heading1 className="mb-4">Welcome to RecoveryBridge</Heading1>
            <Body16 className="mb-8 text-gray-600 leading-relaxed">
              RecoveryBridge is a safe, supportive space where people in recovery can connect with
              listeners who understand the journey. Whether you're here to offer support or seek it,
              you're part of a compassionate community working to make the world a better place in recovery.
            </Body16>
            <div className="bg-blue-50 rounded-lg p-6 mb-8 border-l-4 border-rb-blue">
              <Body18 className="font-bold text-gray-900 mb-3">Our Mission</Body18>
              <Body16 className="text-gray-700 mb-4 leading-relaxed">
                We believe that <strong>connection is the antidote to addiction</strong> and that we do not heal in isolation.
                RecoveryBridge exists to create a space where your story matters, your struggles are valid, and your
                progress—no matter how small—deserves celebration.
              </Body16>
              <Body16 className="text-gray-700 mb-4 leading-relaxed">
                Every conversation here is built on empathy, respect, and the shared understanding that healing takes courage.
                We're here to remind you that <strong>you are worth saving</strong>, that recovery is stronger together,
                and that showing up—even on the hardest days—is an act of bravery.
              </Body16>
              <Body16 className="text-gray-600 leading-relaxed">
                This is not just an app. It's a community of people who understand that recovery isn't linear,
                that every journey looks different, and that sometimes the most powerful thing we can do is simply listen
                with compassion and be present for one another.
              </Body16>
            </div>
            <div className="bg-amber-50 rounded-lg p-6 mb-8 border-l-4 border-amber-400">
              <Body18 className="font-bold text-gray-900 mb-2">Age Requirement</Body18>
              <Body16 className="text-gray-700 mb-3">
                RecoveryBridge is designed for adults 18 years and older. By continuing,
                you confirm that you meet this age requirement.
              </Body16>
              <Body16 className="text-gray-600 text-sm">
                If you're under 18 and need support, we encourage you to reach out to
                age-appropriate resources like the <strong>Teen Line</strong> (text TEEN to 839863)
                or the <strong>988 Suicide & Crisis Lifeline</strong> which serves all ages.
              </Body16>
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-all"
            >
              Get Started →
            </button>
          </div>
        )}

        {/* Step 2: Role Selection */}
        {step === 2 && (
          <div>
            <Heading1 className="mb-4 text-center">How would you like to participate?</Heading1>
            <Body16 className="mb-8 text-center text-gray-600">
              You can switch between these roles anytime from your dashboard.
            </Body16>

            <div className="space-y-3 mb-8">
              <button
                onClick={() => setUserRole('person_in_recovery')}
                className={`w-full p-5 rounded-lg text-left transition-all ${
                  userRole === 'person_in_recovery'
                    ? 'border-2 border-rb-blue bg-blue-50 shadow-sm'
                    : 'border border-gray-200 hover:border-rb-blue'
                }`}
              >
                <Body18 className="font-bold text-gray-900 mb-1">Person in Recovery</Body18>
                <Body16 className="text-gray-600 text-sm">
                  I'm on my recovery journey and may seek support or offer it to others.
                </Body16>
              </button>

              <button
                onClick={() => setUserRole('professional')}
                className={`w-full p-5 rounded-lg text-left transition-all ${
                  userRole === 'professional'
                    ? 'border-2 border-rb-blue bg-blue-50 shadow-sm'
                    : 'border border-gray-200 hover:border-rb-blue'
                }`}
              >
                <Body18 className="font-bold text-gray-900 mb-1">Allies in Long-Term Recovery</Body18>
                <Body16 className="text-gray-600 text-sm">
                  A professional advocate giving back by offering support to others on their journey.
                </Body16>
              </button>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <Body16 className="text-sm text-red-700">{error}</Body16>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:border-gray-400 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Bio */}
        {step === 3 && (
          <div>
            <Heading1 className="mb-4 text-center">Tell us about yourself</Heading1>
            <Body16 className="mb-6 text-center text-gray-600">
              Share what you're comfortable with. This helps others understand how to connect with you.
            </Body16>

            {/* Privacy reminder */}
            <div className="mb-6 p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
              <Body16 className="text-purple-900 text-sm">
                <strong>Privacy tip:</strong> If you wish to remain anonymous, please be mindful when choosing your username, profile picture, and filling out your bio.
              </Body16>
            </div>

            <div className="mb-8">
              <label className="block mb-3 text-sm font-medium text-gray-700">
                About You
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all resize-none"
                placeholder="Share your story, what brings you here, or what you hope to offer others..."
              />
              <Body16 className="mt-2 text-gray-500 text-sm">
                Not sure what to share? Consider: What brings you to RecoveryBridge? What does recovery look like for you? What's one thing you'd like others to know about you?
              </Body16>
              <Body16 className="mt-2 text-gray-500 text-sm italic">
                This appears on your profile and helps others connect with you.
              </Body16>
            </div>

            {/* Specialty Tags */}
            <div className="mb-8">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Specialty Tags <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Body16 className="text-gray-500 text-sm mb-3">
                Select topics you relate to or can offer support with. This helps match you with the right people.
              </Body16>
              <TagSelector
                selectedTags={tags}
                onChange={setTags}
              />
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <Body16 className="text-sm text-red-700">{error}</Body16>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:border-gray-400 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-all"
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
            <Body16 className="mb-6 text-justify text-gray-600">
              RecoveryBridge is built on the belief that connection is the antidote to addiction and we do not heal in isolation. This is a space where your story matters, your struggles are valid, and your progress—no matter how small—deserves celebration.
            </Body16>

            <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-4">
              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">Lead with Compassion</Body18>
                <Body16 className="text-gray-600 text-justify">
                  We're all doing our best. Approach every conversation with compassion, remembering that everyone here is on their own unique journey. Your kindness can be someone's lifeline today.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">Honor Sacred Trust</Body18>
                <Body16 className="text-gray-600 text-justify">
                  What's shared here is sacred. Protect each other's stories and privacy as if they were your own. This trust is what makes vulnerability possible.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">Celebrate Every Step</Body18>
                <Body16 className="text-gray-600 text-justify">
                  Recovery isn't linear, and every journey looks different. Whether someone is on day 1 or year 10, meet them where they are with encouragement, not advice. Your role is to listen, not to fix.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">You Are Worth Saving</Body18>
                <Body16 className="text-gray-600 text-justify">
                  If you're in crisis, please reach out for immediate help: <strong>988</strong> (Suicide & Crisis Lifeline), <strong>911</strong> (Emergency), or text <strong>HOME to 741741</strong> (Crisis Text Line). RecoveryBridge is here for peer support, but your safety comes first. There's no shame in reaching out for professional help—it's a sign of strength.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">Practice Self-Care</Body18>
                <Body16 className="text-gray-600 text-justify">
                  You can't pour from an empty cup. It's okay to step away, set boundaries, or take breaks. Taking care of yourself isn't selfish—it's essential to your recovery.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">Share Your Wins</Body18>
                <Body16 className="text-gray-600 text-justify">
                  Recovery is hard work and deserves recognition. Celebrate your victories—whether it's 24 hours sober, getting out of bed, or reaching out for help. We're here to cheer you on.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">Protect Our Community</Body18>
                <Body16 className="text-gray-600 text-justify">
                  If something doesn't feel right or someone needs help, please let us know. Reporting concerns helps us keep this space safe for everyone. You're not causing trouble—you're protecting our community.
                </Body16>
              </div>
            </div>

            <label className="flex items-start gap-3 mb-6 p-4 rounded-lg bg-blue-50 border border-rb-blue cursor-pointer hover:bg-blue-100 transition-all">
              <input
                type="checkbox"
                checked={agreedToGuidelines}
                onChange={(e) => setAgreedToGuidelines(e.target.checked)}
                className="mt-1 w-5 h-5 accent-rb-blue cursor-pointer"
              />
              <Body16 className="font-medium text-gray-900">
                I commit to showing up with compassion, honoring confidentiality, and helping create a safe space where everyone can heal and grow together.
              </Body16>
            </label>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <Body16 className="text-sm text-red-700">{error}</Body16>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:border-gray-400 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: How did you hear about us? */}
        {step === 5 && (
          <div>
            <Heading1 className="mb-2 text-center">One last thing!</Heading1>
            <Body16 className="mb-8 text-center text-gray-600">
              How did you hear about RecoveryBridge? <span className="text-gray-400">(optional)</span>
            </Body16>

            {(() => {
              const options = [
                { value: 'facebook',      label: '👍 Facebook' },
                { value: 'instagram',     label: '📸 Instagram' },
                { value: 'threads',       label: '🧵 Threads' },
                { value: 'tiktok',        label: '🎵 TikTok' },
                { value: 'website_blog',  label: '🌐 Website or Blog' },
                { value: 'search_engine', label: '🔍 Search Engine (Google, etc.)' },
                { value: 'friend_family', label: '🤝 Friend or Family Member' },
                { value: 'other',         label: '💬 Other' },
              ]
              return (
                <div className="space-y-3 mb-8">
                  {options.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        referralSource === value
                          ? 'border-rb-blue bg-blue-50'
                          : 'border-gray-200 hover:border-rb-blue/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="referral_source"
                        value={value}
                        checked={referralSource === value}
                        onChange={() => setReferralSource(value)}
                        className="w-4 h-4 accent-rb-blue"
                      />
                      <Body16 className="font-medium text-gray-800">{label}</Body16>
                    </label>
                  ))}
                </div>
              )
            })()}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:border-gray-400 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={saving}
                className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                  'Complete Onboarding'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
