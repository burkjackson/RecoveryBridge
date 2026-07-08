'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import TagSelector from '@/components/TagSelector'

// Step metadata keyed by step id. The visible sequence depends on the user's
// intent — people who only want support skip the listener-specific steps.
const STEP_META: Record<string, string> = {
  welcome: 'Welcome',
  intent: 'What brings you here',
  community: 'Our Community',
  role: 'About You',
  profile: 'Your Profile',
  guidelines: 'Community Guidelines',
  training: 'Listener Training',
  referral: 'One Last Thing',
}

const SEEKER_STEPS = ['welcome', 'intent', 'profile', 'guidelines', 'referral']
const LISTENER_STEPS = ['welcome', 'intent', 'community', 'role', 'profile', 'guidelines', 'training', 'referral']

function getSteps(intent: string): string[] {
  return intent === 'seeking' ? SEEKER_STEPS : LISTENER_STEPS
}

const TRAINING_SECTIONS = [
  {
    id: 'presence',
    title: 'The Art of Being Present',
    icon: '🤝',
    intro: "Active listening isn't about having the right answers — it's about showing up fully, without distraction or judgment. For someone in recovery, being truly heard can be transformative.",
    points: [
      'Give your complete attention. Put away distractions and focus entirely on the person in front of you.',
      "Let silences breathe. Pauses aren't awkward — they give people space to find their words.",
      'Reflect back what you hear: "It sounds like you\'re feeling..." shows you\'re really listening.',
      "Resist the urge to jump ahead. Stay with them in the moment they're in, not the solution you're imagining.",
    ],
    ack: 'I understand that my presence and attention are the most powerful tools I have as a listener.',
  },
  {
    id: 'empathy',
    title: 'Empathy Over Advice',
    icon: '💙',
    intro: "People in recovery often have plenty of advice. What they rarely have is someone who truly hears them without trying to fix them. Your job isn't to solve — it's to witness.",
    points: [
      'Validate feelings without minimizing them. "That makes complete sense" goes a long way.',
      'Avoid "at least..." statements that redirect away from someone\'s pain.',
      "Share your own experience sparingly and only when it truly serves them — this conversation is about them.",
      '"I hear you" will often mean more than any advice you could give.',
    ],
    ack: 'I understand that empathy and validation are more helpful than advice or solutions.',
  },
  {
    id: 'safe-space',
    title: 'Creating a Safe Space',
    icon: '🌿',
    intro: "Safety isn't just physical. Emotional safety means someone can share anything — their shame, their setbacks, their fears — without fear of judgment, criticism, or rejection.",
    points: [
      "What's shared here stays here. Confidentiality is the foundation of trust.",
      'Use person-first, recovery-affirming language. Say "person in recovery" rather than labels that carry stigma.',
      "Meet people where they are, not where you think they should be. Recovery is not linear.",
      "You don't need the perfect words. Your calm, non-judgmental presence is enough.",
    ],
    ack: 'I will protect confidentiality and create a space free from judgment or shame.',
  },
  {
    id: 'boundaries',
    title: 'Your Boundaries & Self-Care',
    icon: '🛡️',
    intro: "You cannot pour from an empty cup. Showing up for others requires showing up for yourself first. Setting limits isn't selfish — it's what makes sustainable listening possible.",
    points: [
      'You are a peer listener, not a therapist. You are not expected to carry what professionals are trained to carry.',
      "It's okay to end or step away from a session if you feel overwhelmed or triggered.",
      'If a conversation stirs something in you, honor it and take care of yourself afterward.',
      'Check in with yourself before and after each conversation. You matter too.',
    ],
    ack: 'I will honor my own limits and practice self-care so I can sustainably support others.',
  },
  {
    id: 'scope',
    title: 'What This Is (and Isn\'t)',
    icon: '🧭',
    intro: "RecoveryBridge is peer support — not therapy, not sponsorship, not crisis counseling. Understanding the scope protects both you and the people you listen to.",
    points: [
      "You are not a therapist, sponsor, counselor, or medical professional in this role — and you shouldn't try to be.",
      "Don't offer diagnoses, treatment advice, or medication guidance.",
      "You're here to listen and witness, not to direct someone's recovery plan.",
      "If someone needs professional support, gently encourage them to seek it — that's not a failure, it's good care.",
    ],
    ack: "I understand the scope of peer listening and won't overstep into professional roles.",
  },
  {
    id: 'all-paths',
    title: 'All Paths Are Valid',
    icon: '🌐',
    intro: "Recovery looks different for everyone. RecoveryBridge is not affiliated with any program, religion, or philosophy — and neither are you while you're here.",
    points: [
      "Don't recommend or advocate for specific recovery programs (AA, NA, SMART Recovery, faith-based, etc.) unless someone directly asks about your personal experience.",
      "Keep your spiritual, religious, or philosophical beliefs to yourself unless you're invited to share them.",
      "Someone's recovery path is theirs to choose — your job is to support them on it, not redirect them to yours.",
      'Phrases like "have you tried..." or "you should look into..." steer people away from feeling heard.',
    ],
    ack: "I will respect every person's chosen path and keep my own program preferences and beliefs out of conversations unless asked.",
  },
  {
    id: 'meet-them',
    title: 'Meeting People Where They Are',
    icon: '🌱',
    intro: "Not everyone who reaches out is sober. Not everyone is trying to be. Harm reduction is a valid approach to recovery, and shame is never a tool for healing.",
    points: [
      "Don't shame or judge someone for still using, drinking, or struggling — they reached out, and that takes courage.",
      "Relapse is part of many people's recovery journey. Treat it as something that happened, not a moral failure.",
      "Your role isn't to push someone toward sobriety — it's to make them feel safe enough to keep talking.",
      '"I\'m glad you reached out" is more powerful than any opinion about where someone should be in their recovery.',
    ],
    ack: "I will meet people where they are without judgment, shame, or pressure about where they \"should\" be.",
  },
  {
    id: 'crisis',
    title: 'When Someone Is in Crisis',
    icon: '🆘',
    intro: "Occasionally someone may reach out in a moment of serious crisis. You don't need to have all the answers — but you do need to know what to do.",
    points: [
      'If someone mentions self-harm, suicidal thoughts, or being in immediate danger, take it seriously.',
      'Gently share crisis resources: call or text 988, text HOME to 741741 (Crisis Text Line), or call 911.',
      'You are not responsible for someone\'s safety — trained professionals are. Your role is to connect them to help.',
      "It's okay — and sometimes necessary — to end a session and encourage someone to call for immediate support.",
    ],
    ack: 'I know how to recognize a crisis and will direct people to emergency resources when needed.',
  },
]

export default function OnboardingPage() {
  const [stepIndex, setStepIndex] = useState(0)
  const [intent, setIntent] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [userRole, setUserRole] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false)
  const [trainingAcknowledged, setTrainingAcknowledged] = useState<Record<string, boolean>>({})
  const [expandedTrainingSection, setExpandedTrainingSection] = useState<string>('presence')
  const [referralSource, setReferralSource] = useState('')
  const [otherReferral, setOtherReferral] = useState('')
  const [podcastName, setPodcastName] = useState('')
  const [websiteName, setWebsiteName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [consentVersion, setConsentVersion] = useState<string | null>(null)
  const [consentAcceptedAt, setConsentAcceptedAt] = useState<string | null>(null)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [healthDataConsent, setHealthDataConsent] = useState(false)
  const [healthDataConsentAt, setHealthDataConsentAt] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const steps = getSteps(intent)
  const currentKey = steps[stepIndex] ?? 'welcome'
  const totalSteps = steps.length
  const isLastStep = stepIndex === totalSteps - 1

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function back() {
    setError('')
    setStepIndex((i) => Math.max(0, i - 1))
    scrollTop()
  }

  function advance() {
    setStepIndex((i) => i + 1)
    scrollTop()
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
    setConsentVersion((user.user_metadata?.consent_version as string) ?? null)
    setConsentAcceptedAt((user.user_metadata?.consent_accepted_at as string) ?? null)
    setAgeConfirmed((user.user_metadata?.age_confirmed as boolean) ?? false)
    setHealthDataConsent((user.user_metadata?.health_data_consent as boolean) ?? false)
    setHealthDataConsentAt((user.user_metadata?.health_data_consent_at as string) ?? null)

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
    if (currentKey === 'intent') {
      if (!intent) {
        setError('Please choose what brings you here')
        return
      }
    } else if (currentKey === 'role') {
      if (!userRole) {
        setError('Please select a role')
        return
      }
    } else if (currentKey === 'profile') {
      // Bio is required for listeners (it shows on their profile) but optional
      // for seekers — they're reminded later via the dashboard profile nudge.
      if (intent !== 'seeking' && !bio.trim()) {
        setError('Please tell us a bit about yourself')
        return
      }
    } else if (currentKey === 'guidelines') {
      if (!agreedToGuidelines) {
        setError('Please agree to the community guidelines')
        return
      }
    } else if (currentKey === 'training') {
      const allAcknowledged = TRAINING_SECTIONS.every(s => trainingAcknowledged[s.id])
      if (!allAcknowledged) {
        setError('Please read and acknowledge all sections to continue')
        return
      }
    }

    setError('')
    if (isLastStep) {
      await completeOnboarding()
    } else {
      advance()
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
          // Seekers skip the role step — default them to person_in_recovery.
          user_role: userRole || 'person_in_recovery',
          role_state: 'offline',
          tags: tags.length > 0 ? tags : null,
          // Only mark training complete for paths that actually include it.
          // Seekers complete it just-in-time when they first choose to listen.
          listener_training_completed_at: steps.includes('training')
            ? new Date().toISOString()
            : null,
          consent_version: consentVersion,
          consent_accepted_at: consentAcceptedAt,
          age_confirmed: ageConfirmed,
          health_data_consent: healthDataConsent,
          health_data_consent_at: healthDataConsentAt,
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

      // Send welcome email + admin notification (fire and forget — don't block navigation)
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

        fetch('/api/admin/notify-signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
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
    <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sm:p-8 md:p-10">

        {/* Branding */}
        <div className="text-center mb-6">
          <img
            src="/logo-with-text.png"
            alt="RecoveryBridge Logo"
            className="mx-auto mb-4 max-w-[400px] w-full dark:brightness-0 dark:invert"
          />
          <Body16 className="text-gray-500 dark:text-gray-300">{STEP_META[currentKey]}</Body16>
        </div>

        {/* Progress indicator */}
        <div
          className="flex gap-2 mb-3"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Step ${stepIndex + 1} of ${totalSteps}`}
        >
          {steps.map((key, i) => (
            <div
              key={key}
              className={`h-2 flex-1 rounded-full transition-all ${i <= stepIndex ? 'bg-rb-blue' : 'bg-gray-200 dark:bg-gray-600'}`}
            />
          ))}
        </div>
        <Body16 className="text-center text-gray-500 dark:text-gray-300 text-sm mb-8">Step {stepIndex + 1} of {totalSteps}</Body16>

        {/* Screen reader announcements for errors */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">{error}</div>

        {/* Step: Welcome */}
        {currentKey === 'welcome' && (
          <div className="text-center">
            <Heading1 className="mb-4">Welcome to RecoveryBridge</Heading1>
            <Body16 className="mb-8 text-gray-600 dark:text-gray-300 leading-relaxed">
              RecoveryBridge is a safe, peer-to-peer space where people in recovery connect with
              listeners who understand the journey. Whether you're here to offer support or seek it,
              you're not alone — and you're in the right place.
            </Body16>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 mb-4 border-l-4 border-amber-400 dark:border-amber-800 text-left">
              <Body18 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Age Requirement</Body18>
              <Body16 className="text-gray-700 dark:text-gray-300 mb-3">
                RecoveryBridge is designed for adults 18 years and older. By continuing,
                you confirm that you meet this age requirement.
              </Body16>
              <Body16 className="text-gray-600 dark:text-gray-300 text-sm">
                If you're under 18 and need support, we encourage you to reach out to
                age-appropriate resources like the <strong>Teen Line</strong> (text TEEN to 839863)
                or the <strong>988 Suicide & Crisis Lifeline</strong> which serves all ages.
              </Body16>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8 border-l-4 border-rb-blue dark:border-rb-blue text-left">
              <Body18 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Peer Support — Not Professional Advice</Body18>
              <Body16 className="text-gray-700 dark:text-gray-300 mb-3">
                Our listeners are everyday people who are here to listen and help —
                but they are <strong>not licensed therapists, counselors, medical professionals, or
                trained peer support specialists</strong>. Conversations here are informal human
                connection, not clinical or professional care of any kind.
              </Body16>
              <Body16 className="text-gray-600 dark:text-gray-300 text-sm">
                Guidance shared on RecoveryBridge may sometimes be incomplete, inaccurate, or not
                right for your situation. Please use your own judgment, and always consult a
                qualified professional for medical, mental health, or crisis needs.
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

        {/* Step: Intent */}
        {currentKey === 'intent' && (
          <div>
            <Heading1 className="mb-4 text-center">What brings you here?</Heading1>
            <Body16 className="mb-8 text-center text-gray-600 dark:text-gray-300">
              This just helps us set things up for you. You can change your mind anytime from your dashboard.
            </Body16>

            <div className="space-y-3 mb-8">
              {[
                {
                  value: 'seeking',
                  icon: '💬',
                  title: 'I’m looking for support',
                  desc: 'Connect with a listener who understands what you’re going through.',
                },
                {
                  value: 'listening',
                  icon: '🤝',
                  title: 'I want to support others',
                  desc: 'Be there to listen for people who reach out. Includes a short listener training.',
                },
                {
                  value: 'both',
                  icon: '💙',
                  title: 'Both',
                  desc: 'I may seek support and offer it to others. Includes the listener training.',
                },
              ].map(({ value, icon, title, desc }) => (
                <button
                  key={value}
                  onClick={() => { setIntent(value); setError('') }}
                  className={`w-full p-5 rounded-lg text-left transition-all relative ${
                    intent === value
                      ? 'border-2 border-rb-blue bg-blue-50 dark:bg-gray-700 shadow-sm'
                      : 'border border-gray-200 dark:border-gray-600 hover:border-rb-blue dark:hover:border-rb-blue'
                  }`}
                >
                  {intent === value && (
                    <span className="absolute top-3 right-3 text-rb-blue">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0" aria-hidden="true">{icon}</span>
                    <div>
                      <Body18 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</Body18>
                      <Body16 className="text-gray-600 dark:text-gray-300 text-sm">{desc}</Body16>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-800 rounded">
                <Body16 className="text-sm text-red-700 dark:text-red-300">{error}</Body16>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={back}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-rb-blue text-white py-3 rounded-lg font-semibold hover:bg-rb-blue-hover transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step: Our Community */}
        {currentKey === 'community' && (
          <div>
            <Heading1 className="mb-2 text-center">You&rsquo;re in good company</Heading1>
            <Body16 className="mb-6 text-center text-gray-600 dark:text-gray-300">
              RecoveryBridge is built by people who believe connection is the antidote to addiction.
            </Body16>

            {/* Trust pillars */}
            <div className="space-y-3 mb-6">
              {[
                {
                  icon: '🔒',
                  title: 'Private by design',
                  body: 'Your conversations are never shared, sold, or used for advertising. You choose what to share and with whom.',
                },
                {
                  icon: '🤝',
                  title: 'Peer-to-peer, not transactional',
                  body: 'Everyone here has lived experience with recovery — as seekers, supporters, or both. Nobody is being paid to listen.',
                },
                {
                  icon: '🌱',
                  title: 'All paths are welcome',
                  body: "No judgment about where you are in your journey. Day 1 or year 10 — you belong here.",
                },
                {
                  icon: '🆘',
                  title: 'Crisis resources always available',
                  body: 'The 988 Lifeline and Crisis Text Line are always one tap away inside the app.',
                },
              ].map(({ icon, title, body }) => (
                <div key={title} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">{icon}</span>
                  <div>
                    <Body16 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</Body16>
                    <Body16 className="text-sm text-gray-600 dark:text-gray-300">{body}</Body16>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={back}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-rb-blue text-white py-3 rounded-lg font-semibold hover:bg-rb-blue-hover transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step: Role Selection */}
        {currentKey === 'role' && (
          <div>
            <Heading1 className="mb-4 text-center">Which best describes you?</Heading1>
            <Body16 className="mb-8 text-center text-gray-600 dark:text-gray-300">
              This shows on your listener profile. You can change it anytime from your dashboard.
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
                      ? 'border-2 border-rb-blue bg-blue-50 dark:bg-gray-700 shadow-sm'
                      : 'border border-gray-200 dark:border-gray-600 hover:border-rb-blue dark:hover:border-rb-blue'
                  }`}
                >
                  {userRole === value && (
                    <span className="absolute top-3 right-3 text-rb-blue">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                  <Body18 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</Body18>
                  <Body16 className="text-gray-600 dark:text-gray-300 text-sm">{desc}</Body16>
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-800 rounded">
                <Body16 className="text-sm text-red-700 dark:text-red-300">{error}</Body16>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={back}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-rb-blue text-white py-3 rounded-lg font-semibold hover:bg-rb-blue-hover transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step: Profile */}
        {currentKey === 'profile' && (
          <div>
            <Heading1 className="mb-4 text-center">Tell us about yourself</Heading1>
            <Body16 className="mb-6 text-center text-gray-600 dark:text-gray-300">
              {intent === 'seeking'
                ? "Totally optional — share only what you're comfortable with. You can skip this and add it later anytime."
                : 'Share what you\'re comfortable with. This helps others understand how to connect with you.'}
            </Body16>

            {/* Privacy reminder */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-gray-700 border-l-4 border-rb-blue rounded">
              <Body16 className="text-rb-dark dark:text-gray-100 text-sm">
                <strong>Privacy tip:</strong> If you wish to remain anonymous, be mindful when choosing your username, profile picture, and bio.
              </Body16>
            </div>

            <div className="mb-8">
              <label className="block mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                About You {intent === 'seeking' && <span className="text-gray-400 dark:text-gray-300 font-normal">(optional)</span>}
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={6}
                maxLength={500}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all resize-none dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                placeholder="Share your story, what brings you here, or what you hope to offer others..."
              />
              <div className="flex justify-between items-start mt-2 gap-4">
                <Body16 className="text-gray-500 dark:text-gray-300 text-sm">
                  What brings you here? What does recovery look like for you? What's one thing you'd like others to know? This appears on your profile.
                </Body16>
                <span className={`text-sm shrink-0 tabular-nums ${bio.length >= 450 ? 'text-amber-600 font-medium' : 'text-gray-400 dark:text-gray-300'}`}>
                  {bio.length} / 500
                </span>
              </div>
            </div>

            {/* Specialty Tags */}
            <div className="mb-8">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Specialty Tags <span className="text-gray-400 dark:text-gray-300 font-normal">(optional)</span>
              </label>
              <Body16 className="text-gray-500 dark:text-gray-300 text-sm mb-3">
                Select topics you relate to or can offer support with. This helps match you with the right people.
              </Body16>
              <TagSelector
                selectedTags={tags}
                onChange={setTags}
              />
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-800 rounded">
                <Body16 className="text-sm text-red-700 dark:text-red-300">{error}</Body16>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={back}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-rb-blue text-white py-3 rounded-lg font-semibold hover:bg-rb-blue-hover transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step: Community Guidelines */}
        {currentKey === 'guidelines' && (
          <div>
            <Heading1 className="mb-4 text-center">Community Guidelines</Heading1>
            <Body16 className="mb-6 text-gray-600 dark:text-gray-300">
              RecoveryBridge is built on the belief that connection is the antidote to addiction and we do not heal in isolation. This is a space where your story matters, your struggles are valid, and your progress—no matter how small—deserves celebration.
            </Body16>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-8 space-y-4">
              <div>
                <Body18 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Lead with Compassion</Body18>
                <Body16 className="text-gray-600 dark:text-gray-300">
                  We're all doing our best. Approach every conversation with compassion, remembering that everyone here is on their own unique journey. Your kindness can be someone's lifeline today.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Honor Sacred Trust</Body18>
                <Body16 className="text-gray-600 dark:text-gray-300">
                  What's shared here is sacred. Protect each other's stories and privacy as if they were your own. This trust is what makes vulnerability possible.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Celebrate Every Step</Body18>
                <Body16 className="text-gray-600 dark:text-gray-300">
                  Recovery isn't linear, and every journey looks different. Whether someone is on day 1 or year 10, meet them where they are with encouragement, not advice. Your role is to listen, not to fix.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">You Are Worth Saving</Body18>
                <Body16 className="text-gray-600 dark:text-gray-300">
                  If you're in crisis, please reach out for immediate help: <strong>988</strong> (Suicide & Crisis Lifeline), <strong>911</strong> (Emergency), or text <strong>HOME to 741741</strong> (Crisis Text Line). RecoveryBridge is here for peer support, but your safety comes first. There's no shame in reaching out for professional help—it's a sign of strength.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Practice Self-Care</Body18>
                <Body16 className="text-gray-600 dark:text-gray-300">
                  You can't pour from an empty cup. It's okay to step away, set boundaries, or take breaks. Taking care of yourself isn't selfish—it's essential to your recovery.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Share Your Wins</Body18>
                <Body16 className="text-gray-600 dark:text-gray-300">
                  Recovery is hard work and deserves recognition. Celebrate your victories—whether it's 24 hours sober, getting out of bed, or reaching out for help. We're here to cheer you on.
                </Body16>
              </div>

              <div>
                <Body18 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Protect Our Community</Body18>
                <Body16 className="text-gray-600 dark:text-gray-300">
                  If something doesn't feel right or someone needs help, please let us know. Reporting concerns helps us keep this space safe for everyone. You're not causing trouble—you're protecting our community.
                </Body16>
              </div>
            </div>

            <label className="flex items-start gap-3 mb-6 p-4 rounded-lg bg-blue-50 dark:bg-gray-700 border border-rb-blue cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-600 transition-all">
              <input
                type="checkbox"
                checked={agreedToGuidelines}
                onChange={(e) => setAgreedToGuidelines(e.target.checked)}
                className="mt-1 w-5 h-5 accent-rb-blue cursor-pointer"
              />
              <Body16 className="font-medium text-gray-900 dark:text-gray-100">
                I commit to showing up with compassion, honoring confidentiality, and helping create a safe space where everyone can heal and grow together.
              </Body16>
            </label>

            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-800 rounded">
                <Body16 className="text-sm text-red-700 dark:text-red-300">{error}</Body16>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={back}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={!agreedToGuidelines || saving}
                className="flex-1 bg-rb-blue text-white py-3 rounded-lg font-semibold hover:bg-rb-blue-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                  isLastStep ? 'Complete Setup' : 'Continue →'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Listener Training */}
        {currentKey === 'training' && (
          <div>
            <Heading1 className="mb-3 text-center">Listener Training</Heading1>
            <Body16 className="text-center text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
              Before you start supporting others, take a few minutes to read through these core principles.
              RecoveryBridge is built on safe, empathetic listening — and so are you.
            </Body16>

            {/* Progress pills */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {TRAINING_SECTIONS.map(s => (
                <span
                  key={s.id}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition-all ${
                    trainingAcknowledged[s.id]
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {trainingAcknowledged[s.id] ? '✓ ' : ''}{s.title}
                </span>
              ))}
            </div>

            <div className="space-y-3 mb-8">
              {TRAINING_SECTIONS.map((section) => {
                const isOpen = expandedTrainingSection === section.id
                const isAcked = trainingAcknowledged[section.id]
                return (
                  <div
                    key={section.id}
                    className={`rounded-lg border-2 transition-all ${
                      isAcked
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                        : isOpen
                          ? 'border-rb-blue bg-blue-50 dark:bg-gray-700'
                          : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedTrainingSection(isOpen ? '' : section.id)}
                      className="w-full flex items-center justify-between p-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl" aria-hidden="true">{section.icon}</span>
                        <Body18 className={`font-semibold ${isAcked ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          {section.title}
                        </Body18>
                      </div>
                      <span className="text-gray-400 dark:text-gray-300 text-sm ml-2 shrink-0">
                        {isAcked ? (
                          <span className="text-green-600 dark:text-green-400">✓</span>
                        ) : (
                          <span>{isOpen ? '▲' : '▼'}</span>
                        )}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4">
                        <Body16 className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                          {section.intro}
                        </Body16>
                        <ul className="space-y-2 mb-5">
                          {section.points.map((point, i) => (
                            <li key={i} className="flex gap-3 items-start">
                              <span className="text-rb-blue mt-1 shrink-0">•</span>
                              <Body16 className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{point}</Body16>
                            </li>
                          ))}
                        </ul>
                        <label className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-rb-blue cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition-all">
                          <input
                            type="checkbox"
                            checked={!!trainingAcknowledged[section.id]}
                            onChange={() => setTrainingAcknowledged(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                            className="mt-1 w-5 h-5 accent-rb-blue cursor-pointer shrink-0"
                          />
                          <Body16 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {section.ack}
                          </Body16>
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {TRAINING_SECTIONS.every(s => trainingAcknowledged[s.id]) && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-700 rounded-lg">
                <Body18 className="font-semibold text-green-700 dark:text-green-400 mb-1">You're ready to listen.</Body18>
                <Body16 className="text-green-600 dark:text-green-500 text-sm">
                  Thank you for taking this seriously. The people who reach out are trusting you with something real — and you're prepared to honor that.
                </Body16>
              </div>
            )}

            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-800 rounded">
                <Body16 className="text-sm text-red-700 dark:text-red-300">{error}</Body16>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={back}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-rb-blue text-white py-3 rounded-lg font-semibold hover:bg-rb-blue-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Continue →
              </button>
            </div>

            {!TRAINING_SECTIONS.every(s => trainingAcknowledged[s.id]) && (
              <Body16 className="text-center text-gray-400 dark:text-gray-300 text-sm mt-3">
                Read and acknowledge all 8 sections to continue
              </Body16>
            )}
          </div>
        )}

        {/* Step: How did you hear about us? */}
        {currentKey === 'referral' && (
          <div>
            <Heading1 className="mb-2 text-center">One last thing!</Heading1>
            <Body16 className="mb-8 text-center text-gray-600 dark:text-gray-300">
              How did you hear about RecoveryBridge? This helps us understand how people find us.{' '}
              <span className="text-gray-400 dark:text-gray-300">(optional)</span>
            </Body16>

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-300 mb-2 px-1">Social Media</p>
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
                        ? 'border-rb-blue bg-blue-50 dark:bg-gray-700'
                        : 'border-gray-200 dark:border-gray-600 hover:border-rb-blue/50 dark:hover:border-rb-blue/50'
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
                    <Body16 className="font-medium text-gray-800 dark:text-gray-100">{label}</Body16>
                  </label>
                ))}
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-300 mb-2 px-1">Other</p>
              <div className="space-y-2">
                {[
                  { value: 'podcast', label: 'Podcast', placeholder: 'Which podcast? (optional)', detail: podcastName, setDetail: setPodcastName },
                  { value: 'website_blog', label: 'Website or Blog', placeholder: 'Which website or blog? (optional)', detail: websiteName, setDetail: setWebsiteName },
                  { value: 'search_engine', label: 'Search Engine (Google, etc.)' },
                  { value: 'friend_family', label: 'Friend or Family Member' },
                  { value: 'other', label: 'Other', placeholder: 'Please tell us where you heard about us', detail: otherReferral, setDetail: setOtherReferral },
                ].map(({ value, label, placeholder, detail, setDetail }) => (
                  <div key={value}>
                    <label
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        referralSource === value
                          ? 'border-rb-blue bg-blue-50 dark:bg-gray-700'
                          : 'border-gray-200 dark:border-gray-600 hover:border-rb-blue/50 dark:hover:border-rb-blue/50'
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
                      <Body16 className="font-medium text-gray-800 dark:text-gray-100">{label}</Body16>
                    </label>
                    {referralSource === value && placeholder && setDetail && (
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={detail}
                        onChange={e => setDetail(e.target.value)}
                        className="w-full mt-2 p-4 border-2 border-rb-blue rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:border-rb-blue dark:bg-gray-700 dark:border-gray-600"
                        maxLength={200}
                        autoFocus
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={back}
                className="flex-1 py-3 rounded-lg font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={saving}
                className="flex-1 bg-rb-blue text-white py-3 rounded-lg font-semibold hover:bg-rb-blue-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
