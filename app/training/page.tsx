'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { errorMessage } from '@/lib/errors'
import type { ListenerTrainingSectionId } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'

// Typed against the shared id list so a section added here without being added
// to LISTENER_TRAINING_SECTION_IDS is a compile error — the nudge cron counts
// "sections remaining" from that list and never sees this array.
interface TrainingSection {
  id: ListenerTrainingSectionId
  title: string
  icon: string
  intro: string
  points: string[]
  ack: string
}

const TRAINING_SECTIONS: readonly TrainingSection[] = [
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
      'Gently share crisis resources: text or call 988, text HOME to 741741 (Crisis Text Line), or call 911.',
      "You are not responsible for someone's safety — trained professionals are. Your role is to connect them to help.",
      "It's okay — and sometimes necessary — to end a session and encourage someone to call for immediate support.",
    ],
    ack: 'I know how to recognize a crisis and will direct people to emergency resources when needed.',
  },
]

export default function TrainingPage() {
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<string>('presence')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const allAcknowledged = TRAINING_SECTIONS.every(s => acknowledged[s.id])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      // Resume where they left off. Before this, closing the tab lost all eight
      // acknowledgements and the whole module had to be re-read.
      const { data: profile } = await supabase
        .from('profiles')
        .select('listener_training_progress')
        .eq('id', user.id)
        .maybeSingle()

      const saved = profile?.listener_training_progress
      if (saved && typeof saved === 'object') {
        setAcknowledged(saved as Record<string, boolean>)
        // Open the first section they haven't acknowledged yet.
        const next = TRAINING_SECTIONS.find(sec => !(saved as Record<string, boolean>)[sec.id])
        if (next) setExpanded(next.id)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount; the loaders it calls are stable for the life of the component
  }, [])

  // Persist one section's acknowledgement. Fire-and-forget: the checkbox has
  // already moved, and a dropped write only costs them that box on next load.
  // listener_training_progress_at is what tells the nudge cron they are still
  // working through the page rather than stalled.
  function toggleSection(sectionId: ListenerTrainingSectionId) {
    // Computed outside setAcknowledged on purpose: React can call a state
    // updater twice in StrictMode, and a write belongs in the handler rather
    // than inside the reducer.
    const next = { ...acknowledged, [sectionId]: !acknowledged[sectionId] }
    setAcknowledged(next)
    if (!userId) return

    supabase
      .from('profiles')
      .update({
        listener_training_progress: next,
        listener_training_progress_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .then(({ error: saveError }) => {
        if (saveError) console.error('Error saving training progress:', saveError)
      })
  }

  async function handleComplete() {
    if (!userId || !allAcknowledged) return
    setSaving(true)
    setError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ listener_training_completed_at: new Date().toISOString() })
        .eq('id', userId)
      if (error) throw error
      router.push('/dashboard?trainingComplete=true')
    } catch (e: unknown) {
      setError(errorMessage(e, 'Could not save your progress. Please try again.'))
      setSaving(false)
    }
  }

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sm:p-8 md:p-10">

        <div className="text-center mb-6">
          <Image src="/logo-with-text.png" alt="RecoveryBridge Logo" width={400} height={190} className="mx-auto mb-4 max-w-[400px] w-full h-auto dark:brightness-0 dark:invert" />
          <Body16 className="text-gray-500 dark:text-gray-300">Listener Training</Body16>
        </div>

        <div className="mb-6">
          <Heading1 className="mb-3 text-center">Listener Training</Heading1>
          <Body16 className="text-center text-gray-600 dark:text-gray-300 leading-relaxed">
            RecoveryBridge is a space built on safe, empathetic listening. Take a few minutes to read
            through these core principles — and acknowledge each one before you begin.
          </Body16>
        </div>

        {/* Progress pills */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TRAINING_SECTIONS.map(s => (
            <span
              key={s.id}
              className={`text-xs px-2 py-1 rounded-full font-medium transition-all ${
                acknowledged[s.id]
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {acknowledged[s.id] ? '✓ ' : ''}{s.title}
            </span>
          ))}
        </div>

        <div className="space-y-3 mb-8">
          {TRAINING_SECTIONS.map((section) => {
            const isOpen = expanded === section.id
            const isAcked = acknowledged[section.id]
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
                  onClick={() => setExpanded(isOpen ? '' : section.id)}
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
                    {isAcked
                      ? <span className="text-green-600 dark:text-green-400">✓</span>
                      : <span>{isOpen ? '▲' : '▼'}</span>
                    }
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
                        checked={!!isAcked}
                        onChange={() => toggleSection(section.id)}
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

        {allAcknowledged && (
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

        <button
          onClick={handleComplete}
          disabled={!allAcknowledged || saving}
          className="w-full bg-rb-blue text-white py-3 rounded-lg font-semibold hover:bg-rb-blue-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {saving ? 'Saving...' : 'Complete Training →'}
        </button>

        {!allAcknowledged && (
          <Body16 className="text-center text-gray-400 dark:text-gray-300 text-sm mt-3">
            Read and acknowledge all 8 sections to continue
          </Body16>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ← Back to dashboard
          </button>
        </div>
      </div>
    </main>
  )
}
