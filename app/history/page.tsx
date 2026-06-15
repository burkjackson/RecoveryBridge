'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import Footer from '@/components/Footer'

interface SessionFeedback {
  helpful: boolean | null
  thank_you_note: string | null
  from_user_id: string
  to_user_id: string
}

interface SessionRecord {
  id: string
  created_at: string
  ended_at: string | null
  listener_id: string
  seeker_id: string
  listener: { display_name: string | null; avatar_url: string | null } | null
  seeker: { display_name: string | null; avatar_url: string | null } | null
  feedback: SessionFeedback[]
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirect=/history')
        return
      }
      setUserId(user.id)

      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select(`
          id, created_at, ended_at, listener_id, seeker_id,
          listener:profiles!sessions_listener_id_fkey(display_name, avatar_url),
          seeker:profiles!sessions_seeker_id_fkey(display_name, avatar_url),
          feedback:session_feedback(helpful, thank_you_note, from_user_id, to_user_id)
        `)
        .eq('status', 'ended')
        .or(`listener_id.eq.${user.id},seeker_id.eq.${user.id}`)
        .order('ended_at', { ascending: false })
        .limit(100)

      if (fetchError) throw fetchError

      setSessions((data as unknown as SessionRecord[]) || [])
    } catch (err: unknown) {
      console.error('Error loading session history:', err)
      setError('Failed to load session history. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function formatDuration(createdAt: string, endedAt: string | null): string {
    if (!endedAt) return '—'
    const minutes = Math.round((new Date(endedAt).getTime() - new Date(createdAt).getTime()) / 60000)
    if (minutes < 1) return '< 1 min'
    return `${minutes} min`
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Stats derived from loaded data
  const totalSessions = sessions.length
  const asListener = userId ? sessions.filter(s => s.listener_id === userId).length : 0
  const asSeeker = userId ? sessions.filter(s => s.seeker_id === userId).length : 0

  if (loading) {
    return (
      <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
        <div className="max-w-3xl mx-auto">
          {/* Header skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-rb-gray/10 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-2" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
          {/* Card skeletons */}
          <div className="space-y-4" role="status" aria-label="Loading session history">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-2">
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-rb-gray/10 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 min-h-[44px] py-2 text-sm text-rb-blue hover:text-rb-blue-hover font-semibold transition"
              >
                ← Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="min-h-[44px] px-4 sm:px-6 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all whitespace-nowrap"
              >
                Sign Out
              </button>
            </div>
            <Heading1>Session History</Heading1>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center border border-red-100 dark:border-red-900/30">
            <span className="text-4xl mb-4 block" role="img" aria-label="Error">⚠️</span>
            <Body18 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Something went wrong</Body18>
            <Body16 className="text-rb-gray mb-4">{error}</Body16>
            <button
              onClick={loadHistory}
              className="min-h-[44px] px-6 py-2.5 bg-rb-blue text-white rounded-full text-sm font-semibold hover:bg-rb-blue-hover transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-rb-gray/10 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <img
              src="/logo-icon.png"
              alt="RecoveryBridge"
              className="h-10 sm:h-12 w-auto"
            />
            <button
              onClick={handleSignOut}
              className="min-h-[44px] px-4 sm:px-6 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 min-h-[44px] py-2 text-sm text-rb-blue hover:text-rb-blue-hover font-semibold transition mb-3"
          >
            ← Dashboard
          </button>
          <Heading1>Session History</Heading1>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center border border-rb-gray/10 dark:border-gray-700">
            <p className="text-3xl font-bold text-rb-dark dark:text-white mb-1">{totalSessions}</p>
            <Body16 className="text-xs text-rb-gray dark:text-gray-400 font-medium">Total Sessions</Body16>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center border border-rb-gray/10 dark:border-gray-700">
            <p className="text-3xl font-bold text-rb-blue dark:text-blue-400 mb-1">{asListener}</p>
            <Body16 className="text-xs text-rb-gray dark:text-gray-400 font-medium">As Listener</Body16>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center border border-rb-gray/10 dark:border-gray-700">
            <p className="text-3xl font-bold text-rb-purple dark:text-purple-400 mb-1">{asSeeker}</p>
            <Body16 className="text-xs text-rb-gray dark:text-gray-400 font-medium">As Seeker</Body16>
          </div>
        </div>

        {/* Session List */}
        {sessions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-10 text-center border border-rb-gray/10 dark:border-gray-700">
            <span className="text-5xl mb-4 block" role="img" aria-label="No sessions">💬</span>
            <Body18 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">No sessions yet</Body18>
            <Body16 className="text-rb-gray mb-6">Your past support sessions will appear here.</Body16>
            <a
              href="/listeners"
              className="inline-flex items-center min-h-[44px] px-6 py-2.5 bg-rb-blue text-white rounded-full text-sm font-semibold hover:bg-rb-blue-hover transition-all"
            >
              Find a Listener
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => {
              const isListener = userId === session.listener_id
              const otherPerson = isListener ? session.seeker : session.listener
              const otherName = otherPerson?.display_name || 'Anonymous'
              const duration = formatDuration(session.created_at, session.ended_at)
              const dateStr = session.ended_at
                ? formatDate(session.ended_at)
                : formatDate(session.created_at)
              const timeStr = session.ended_at
                ? formatTime(session.ended_at)
                : formatTime(session.created_at)

              // Find feedback received by the current user
              const receivedFeedback = userId
                ? session.feedback?.find(f => f.to_user_id === userId)
                : undefined

              return (
                <div
                  key={session.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-rb-gray/10 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Date + Time */}
                      <div className="flex items-center gap-2 mb-1">
                        <Body16 className="text-sm font-semibold text-rb-dark dark:text-gray-100">
                          {dateStr}
                        </Body16>
                        <span className="text-xs text-rb-gray dark:text-gray-400">{timeStr}</span>
                      </div>

                      {/* Other person */}
                      <Body16 className="text-sm text-rb-gray dark:text-gray-300 mb-2">
                        With <span className="font-medium text-rb-dark dark:text-gray-100">{otherName}</span>
                      </Body16>

                      {/* Meta row: duration + feedback badge */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-rb-gray dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 rounded-full">
                          ⏱ {duration}
                        </span>
                        {receivedFeedback?.helpful === true && (
                          <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-0.5 rounded-full font-medium">
                            👍 Helpful
                          </span>
                        )}
                      </div>

                      {/* Thank-you note */}
                      {receivedFeedback?.thank_you_note && (
                        <blockquote className="mt-3 pl-3 border-l-4 border-rb-blue/40 bg-blue-50 dark:bg-blue-900/10 rounded-r-lg py-2 pr-3">
                          <Body16 className="text-sm text-rb-blue dark:text-blue-300 italic">
                            &ldquo;{receivedFeedback.thank_you_note}&rdquo;
                          </Body16>
                        </blockquote>
                      )}
                    </div>

                    {/* Role badge */}
                    <span
                      className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                        isListener
                          ? 'bg-rb-blue/10 text-rb-blue dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-rb-purple/20 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      }`}
                    >
                      {isListener ? 'Listener' : 'Seeker'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
