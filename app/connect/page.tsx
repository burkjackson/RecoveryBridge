'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getActiveBlock } from '@/lib/blocks'
import { acceptSeeker } from '@/lib/acceptSeeker'

/**
 * /connect?seekerId=XXX — where a support-request notification lands.
 *
 * This page used to create the session the moment it loaded. That turned out
 * to be the mechanism behind the worst outcome on the platform: tapping the
 * notification *is* the connection, so a lock-screen tap, a glance, or an
 * accidental open put a waiting person into a room with someone who was never
 * going to type. Because a seeker can only have one active session, that also
 * took them out of the queue — nobody else could reach them, and the
 * missed-connection follow-up counted them as helped.
 *
 * Measured 25 Aug 2026: two accounts had done exactly this ~50 times between
 * them, leaving 44 people writing into silence. One had never sent a message
 * in its life.
 *
 * So the tap now only *offers* the connection. Everything up to the confirm is
 * read-only; the seeker stays 'requesting' and visible to every other listener
 * until someone actually says they're ready to talk.
 */

type Phase =
  | { kind: 'checking' }
  | { kind: 'ready'; seekerName: string }
  | { kind: 'connecting' }
  | { kind: 'unavailable'; message: string }

function ConnectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const seekerId = searchParams.get('seekerId')
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' })

  /** Why the seeker can't be connected to right now, phrased for a human. */
  const describeUnavailable = useCallback(
    async (supabase: ReturnType<typeof createClient>): Promise<string> => {
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('seeker_id', seekerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return activeSession
        ? 'Someone else is already talking with this person.'
        : 'This person is no longer waiting for support — they may have stepped away.'
    },
    [seekerId]
  )

  // Read-only preflight. Deliberately creates nothing.
  const check = useCallback(async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Carry the destination through login so the seeker id survives — this
      // page is reached by tapping a push notification, and losing the id
      // means the listener lands on a dashboard with no idea who needed them.
      router.replace(`/login?redirect=${encodeURIComponent(`/connect?seekerId=${seekerId}`)}`)
      return
    }

    if (user.id === seekerId) {
      router.replace('/dashboard')
      return
    }

    const [blockCheck, { data: existingSession }] = await Promise.all([
      getActiveBlock(supabase, user.id),
      supabase
        .from('sessions')
        .select('id')
        .eq('listener_id', user.id)
        .eq('seeker_id', seekerId)
        .eq('status', 'active')
        .maybeSingle(),
    ])

    if (blockCheck) {
      router.replace('/dashboard')
      return
    }

    // Already in this conversation — no point asking again, just go.
    if (existingSession) {
      router.replace(`/chat/${existingSession.id}`)
      return
    }

    const { data: seeker } = await supabase
      .from('profiles')
      .select('id, display_name, role_state')
      .eq('id', seekerId)
      .maybeSingle()

    if (!seeker || seeker.role_state !== 'requesting') {
      setPhase({ kind: 'unavailable', message: await describeUnavailable(supabase) })
      return
    }

    setPhase({ kind: 'ready', seekerName: seeker.display_name || 'Someone' })
  }, [router, seekerId, describeUnavailable])

  // The only path that creates anything, and only from a deliberate tap.
  async function accept() {
    setPhase({ kind: 'connecting' })
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/dashboard')
      return
    }

    // seekerId is guaranteed non-null here — the effect below redirects to
    // /dashboard before check()/accept() can run without one.
    const result = await acceptSeeker(supabase, { listenerId: user.id, seekerId: seekerId! })

    if (result.kind === 'blocked') {
      router.replace('/dashboard')
      return
    }

    if (result.kind === 'conflict' || result.kind === 'error') {
      // Between the preflight and this tap the seeker may have been taken by
      // someone else, or left. The DB enforces both (unique active session per
      // seeker; a trigger requiring the counterpart to still be 'requesting'),
      // so read back what actually happened rather than guessing.
      setPhase({ kind: 'unavailable', message: await describeUnavailable(supabase) })
      return
    }

    router.replace(`/chat/${result.id}`)
  }

  /** Declining leaves the seeker 'requesting' so another listener can reach them. */
  function decline() {
    router.replace('/dashboard')
  }

  useEffect(() => {
    if (!seekerId) {
      router.replace('/dashboard')
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fire-and-forget async kickoff; every setPhase inside check() happens after an await, so nothing is set synchronously during the effect body
    check()
  }, [seekerId, router, check])

  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center p-4 bg-[#F8F9FA] dark:bg-gray-900"
    >
      <div className="w-full max-w-md text-center" aria-live="polite">
        {(phase.kind === 'checking' || phase.kind === 'connecting') && (
          <div className="p-8">
            <div className="w-12 h-12 border-4 border-rb-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-rb-gray dark:text-gray-300 font-medium">
              {phase.kind === 'connecting' ? 'Opening the chat…' : 'Checking…'}
            </p>
          </div>
        )}

        {phase.kind === 'unavailable' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sm:p-8">
            <p className="text-rb-dark dark:text-gray-100 font-medium mb-6">{phase.message}</p>
            <button
              onClick={() => router.replace('/dashboard')}
              className="min-h-[44px] w-full px-5 py-3 bg-rb-blue text-white rounded-lg font-semibold hover:bg-rb-blue-hover transition"
            >
              Back to dashboard
            </button>
          </div>
        )}

        {phase.kind === 'ready' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sm:p-8">
            <p className="text-4xl mb-3" aria-hidden="true">💙</p>
            <h1 className="text-xl font-bold text-rb-dark dark:text-gray-100 mb-2">
              {phase.seekerName} is waiting to talk
            </h1>
            <p className="text-sm text-rb-gray dark:text-gray-300 mb-6 leading-relaxed">
              Only say yes if you can give them your attention now — connecting takes them out of
              the queue, so no one else can reach them while you&rsquo;re in the chat. If now
              isn&rsquo;t good, leaving them waiting is genuinely the kinder choice.
            </p>

            <div className="space-y-2">
              <button
                onClick={accept}
                className="min-h-[44px] w-full px-5 py-3 bg-rb-blue text-white rounded-lg font-semibold hover:bg-rb-blue-hover transition"
              >
                I&rsquo;m ready — start the chat
              </button>
              <button
                onClick={decline}
                className="min-h-[44px] w-full px-5 py-3 bg-white dark:bg-gray-700 text-rb-gray dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              >
                Not right now
              </button>
            </div>

            <p className="text-xs text-rb-gray dark:text-gray-400 mt-4">
              Choosing &ldquo;not right now&rdquo; keeps them visible to other listeners.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-[#F8F9FA] dark:bg-gray-900">
        <div className="text-center p-8">
          <div className="w-12 h-12 border-4 border-rb-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-rb-gray dark:text-gray-300 font-medium">Checking…</p>
        </div>
      </main>
    }>
      <ConnectInner />
    </Suspense>
  )
}
