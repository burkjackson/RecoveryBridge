'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import TagSelector from '@/components/TagSelector'

const STEP_NAMES = ['Welcome', 'Your Role', 'Your Profile', 'Community Guidelines', 'One Last Thing']

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [userRole, setUserRole] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false)
  const [referralSource, setReferralSource] = useState('')
  const [otherReferral, setOtherReferral] = useState('')
  const [podcastName, setPodcastName] = useState('')
  const [websiteName, setWebsiteName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  function goToStep(n: number) {
    setStep(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function checkUser(retryCount = 0) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user && retryCount === 0) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return checkUser(1)
    }

    if (!user) {
      router.push('/login')
      return
    }
    setUserId(user.id)

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
      goToStep(2)
    } else if (step === 2) {
      if (!userRole) {
        setError('Please select a role')
        return
      }
      setError('')
      goToStep(3)
    } else if (step === 3) {
      if (!bio.trim()) {
        setError('Please tell us a bit about yourself')
        return
      }
      setError('')
      goToStep(4)
    } else if (step === 4) {
      if (!agreedToGuidelines) {
        setError('Please agree to the community guidelines')
        return
      }
      setError('')
      goToStep(5)
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
          referral_source: referralSource === 'other'
            ? (otherReferral.trim() || 'other')
            : referralSource === 'podcast'
              ? (podcastName.trim() ? `podcast: ${podcastName.trim()}` : 'podcast')
              : referralSource === 'website_blog'
                ? (websiteName.trim() ? `website: ${websiteName.trim()}` : 'website_blog')
                : (referralSource || null),
        })
        .eq('id', userId)

      if (error) throw error

      // Send welcome email (fire and forget — don't block navigation)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        fetch('/api/email/welcome', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ displayName, userRole }),
        }).catch(() => {})
      }

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
            className="mx-auto mb-4 max-w-[400px] w-full"
          />
          <Body16 className="text-gray-500">{STEP_NAMES[step - 1]}</Body16>
        </div>

        {/* Progress indicator */}
        <div
          className="flex gap-2 mb-3"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-label={`Step ${step} of 5`}
        >
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all ${s <= step ? 'bg-rb-blue' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <Body16 className="text-center text-gray-500 text-sm mb-8">Step {step} of 5</Body16>

        {/* Screen reader announcements for errors */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">{error}</div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center">
            <Heading1 className="mb-4">Welcome to RecoveryBridge</Heading1>
            <Body16 className="mb-8 text-gray-600 leading-relaxed">
              RecoveryBridge is a safe, peer-to-peer space where people in recovery connect with
              listeners who understand the journey. Whether you're here to offer support or seek it,
              you're not alone — and you're in the right place.
            </Body16>
            <div className="bg-amber-50 rounded-lg p-6 mb-8 border-l-4 border-amber-400 text-left">
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
              className="w-full bg-rb-blue text-white py-3 rounded-lg font-semibold hover:bg-rb-blue-hover transition-all"
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
              {[
                {
                  value: 'person_in_recovery',
                  title: 'Person in Recovery',
                  desc: "I'm on my recovery journey and may seek support or offer it to others.",
                },
                {
                  value: 'professional',
                  title: 'Allies in Long-Term Recovery',
                  desc: 'A professional advocate giving back by offering support to others on their journey.',
                },
              ].map(({ value, title, desc }) => (
                <button
                  key={value}
                  onClick={() => setUserRole(value)}
                  className={`w-full p-5 rounded-lg text-left transition-all relative ${
                    userRole === value
                      ? 'border-2 border-rb-blue bg-blue-50 shadow-sm'
                      : 'border border-gray-200 hover:border-rb-blue'
                  }`}
                >
                  {userRole === value && (
                    <span className="absolute top-3 right-3 text-rb-blue">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                  <Body18 className="font-bold text-gray-900 mb-1">{title}</Body18>
                  <Body16 className="text-gray-600 text-sm">{desc}</Body16>
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <Body16 className="text-sm text-red-700">{error}</Body16>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => goToStep(1)}
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
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-rb-blue rounded">
              <Body16 className="text-rb-dark text-sm">
                <strong>Privacy tip:</strong> If you wish to remain anonymous, be mindful when choosing your username, profile picture, and bio.
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
                maxLength={500}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all resize-none"
                placeholder="Share your story, what brings you here, or what you hope to offer others..."
              />
              <div className="flex justify-between items-start mt-2 gap-4">
                <Body16 className="text-gray-500 text-sm">
                  What brings you here? What does recovery look like for you? What's one thing you'd like others to know? This appears on your profile.
                </Body16>
                <span className={`text-sm shrink-0 tabular-nums ${bio.length >= 450 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                  {bio.length} / 500
                </span>
              </div>
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
                onClick={() => goToStep(2)}
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
            <Body16 className="mb-6 text-gray-600">
              RecoveryBridge is built on the belief that connection is the antidote to addiction and we do not heal in isolation. This is a space where your story matters, your struggles are valid, and your progress—no matter how small—deserves celebration.
            </Body16>

            <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-4">
              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">Lead with Compassion</Body18>
                <Body16 className="text-gray-600">
                  We're all doing our best. Approach every conversation with compassion, remembering that everyone here is on their own unique journey. Your kindness can be someone's lifeline today.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">Honor Sacred Trust</Body18>
                <Body16 className="text-gray-600">
                  What's shared here is sacred. Protect each other's stories and privacy as if they were your own. This trust is what makes vulnerability possible.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">Celebrate Every Step</Body18>
                <Body16 className="text-gray-600">
                  Recovery isn't linear, and every journey looks different. Whether someone is on day 1 or year 10, meet them where they are with encouragement, not advice. Your role is to listen, not to fix.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">You Are Worth Saving</Body18>
                <Body16 className="text-gray-600">
                  If you're in crisis, please reach out for immediate help: <strong>988</strong> (Suicide & Crisis Lifeline), <strong>911</strong> (Emergency), or text <strong>HOME to 741741</strong> (Crisis Text Line). RecoveryBridge is here for peer support, but your safety comes first. There's no shame in reaching out for professional help—it's a sign of strength.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">Practice Self-Care</Body18>
                <Body16 className="text-gray-600">
                  You can't pour from an empty cup. It's okay to step away, set boundaries, or take breaks. Taking care of yourself isn't selfish—it's essential to your recovery.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">Share Your Wins</Body18>
                <Body16 className="text-gray-600">
                  Recovery is hard work and deserves recognition. Celebrate your victories—whether it's 24 hours sober, getting out of bed, or reaching out for help. We're here to cheer you on.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900">Protect Our Community</Body18>
                <Body16 className="text-gray-600">
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
                onClick={() => goToStep(3)}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:border-gray-400 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={!agreedToGuidelines}
                className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
              How did you hear about RecoveryBridge? This helps us understand how people find us.{' '}
              <span className="text-gray-400">(optional)</span>
            </Body16>

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Social Media</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { value: 'facebook', label: 'Facebook' },
                  { value: 'instagram', label: 'Instagram' },
                  { value: 'threads', label: 'Threads' },
                  { value: 'tiktok', label: 'TikTok' },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
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

              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Other</p>
              <div className="space-y-2">
                {[
                  { value: 'podcast', label: 'Podcast' },
                  { value: 'website_blog', label: 'Website or Blog' },
                  { value: 'search_engine', label: 'Search Engine (Google, etc.)' },
                  { value: 'friend_family', label: 'Friend or Family Member' },
                  { value: 'other', label: 'Other' },
                ].map(({ value, label }) => (
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
            </div>

            {referralSource === 'podcast' && (
              <input
                type="text"
                placeholder="Which podcast? (optional)"
                value={podcastName}
                onChange={e => setPodcastName(e.target.value)}
                className="w-full p-4 border-2 border-rb-blue rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rb-blue mb-6"
                maxLength={200}
                autoFocus
              />
            )}

            {referralSource === 'website_blog' && (
              <input
                type="text"
                placeholder="Which website or blog? (optional)"
                value={websiteName}
                onChange={e => setWebsiteName(e.target.value)}
                className="w-full p-4 border-2 border-rb-blue rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rb-blue mb-6"
                maxLength={200}
                autoFocus
              />
            )}

            {referralSource === 'other' && (
              <input
                type="text"
                placeholder="Please tell us where you heard about us"
                value={otherReferral}
                onChange={e => setOtherReferral(e.target.value)}
                className="w-full p-4 border-2 border-rb-blue rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rb-blue mb-6"
                maxLength={200}
                autoFocus
              />
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => goToStep(4)}
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
