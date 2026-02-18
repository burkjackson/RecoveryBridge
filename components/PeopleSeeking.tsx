'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Body16, Body18 } from '@/components/ui/Typography'
import ErrorState from '@/components/ErrorState'
import Modal from '@/components/Modal'

interface Seeker {
  id: string
  display_name: string
  bio: string | null
  tagline: string | null
  tags: string[] | null
  avatar_url: string | null
  user_role: string | null
}

interface PeopleSeekingProps {
  currentUserId: string
  currentRoleState: string | null
}

export default function PeopleSeeking({ currentUserId, currentRoleState }: PeopleSeekingProps) {
  const [seekers, setSeekers] = useState<Seeker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [blockModal, setBlockModal] = useState({ show: false, reason: '' })
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const isConnecting = useRef(false)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    if (currentRoleState === 'available') {
      loadPeopleSeeking()
    }
  }, [currentRoleState])

  // Real-time: refresh when profiles change (someone starts/stops requesting)
  useEffect(() => {
    if (currentRoleState !== 'available') return

    const channel = supabase
      .channel('people-seeking-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          loadPeopleSeeking()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, currentRoleState])

  // Also refresh when sessions change (seeker gets connected)
  useEffect(() => {
    if (currentRoleState !== 'available') return

    const channel = supabase
      .channel('people-seeking-sessions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessions',
        },
        () => {
          loadPeopleSeeking()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, currentRoleState])

  async function loadPeopleSeeking() {
    try {
      setError(null)

      // Get profiles with role_state = 'requesting'
      const { data: requestingProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, bio, tagline, tags, avatar_url, user_role')
        .eq('role_state', 'requesting')
        .neq('id', currentUserId)

      if (profilesError) throw profilesError

      if (!requestingProfiles || requestingProfiles.length === 0) {
        setSeekers([])
        return
      }

      // Filter out seekers who already have an active session
      const seekerIds = requestingProfiles.map(s => s.id)
      const { data: activeSessions } = await supabase
        .from('sessions')
        .select('seeker_id')
        .eq('status', 'active')
        .in('seeker_id', seekerIds)

      const connectedSeekerIds = new Set(activeSessions?.map(s => s.seeker_id) || [])
      const filteredSeekers = requestingProfiles.filter(s => !connectedSeekerIds.has(s.id))

      setSeekers(filteredSeekers)
    } catch (err) {
      console.error('Error loading people seeking support:', err)
      setError('We couldn\'t load support requests right now. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function connectWithSeeker(seekerId: string) {
    if (isConnecting.current) return
    isConnecting.current = true
    setConnecting(seekerId)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if listener is blocked
      const { data: blockCheck } = await supabase
        .from('user_blocks')
        .select('id, reason')
        .eq('user_id', user.id)
        .maybeSingle()

      if (blockCheck) {
        setBlockModal({ show: true, reason: blockCheck.reason })
        setConnecting(null)
        return
      }

      // Create session: current user is listener, requesting user is seeker
      const { data: session, error } = await supabase
        .from('sessions')
        .insert([
          {
            listener_id: user.id,
            seeker_id: seekerId,
            status: 'active'
          }
        ])
        .select()
        .single()

      if (error) throw error

      // Navigate to chat
      router.push(`/chat/${session.id}`)
    } catch (error: any) {
      console.error('Error creating session:', error)
      setErrorModal({ show: true, message: error.message || 'An unexpected error occurred' })
    } finally {
      setConnecting(null)
      isConnecting.current = false
    }
  }

  function getDisplayMessage(tagline: string | null, bio: string | null): string {
    if (tagline && tagline.trim()) {
      return tagline
    }
    if (!bio || bio.trim() === '') {
      return 'Looking for support'
    }
    return bio.length > 60 ? bio.substring(0, 60) + '...' : bio
  }

  // Only show to available listeners
  if (currentRoleState !== 'available') {
    return null
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
        <Body18 className="font-semibold text-gray-900 mb-4">People Seeking Support</Body18>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
              <div className="h-8 w-20 bg-gray-200 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
        <Body18 className="font-semibold text-gray-900 mb-4">People Seeking Support</Body18>
        <ErrorState
          type="inline"
          message={error}
          onRetry={() => {
            setLoading(true)
            loadPeopleSeeking()
          }}
          retryText="Try Again"
        />
      </div>
    )
  }

  if (seekers.length === 0) {
    return (
      <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
        <Body18 className="font-semibold text-gray-900 mb-3">People Seeking Support</Body18>
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <Body16 className="text-gray-600 mb-2">No one is seeking support right now</Body16>
          <Body16 className="text-sm text-gray-500">
            You&apos;ll be notified when someone needs help
          </Body16>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <Body18 className="font-semibold text-gray-900">People Seeking Support</Body18>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-full border border-purple-200">
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
          <Body16 className="text-sm text-purple-700 font-semibold">
            {seekers.length} Seeking
          </Body16>
        </div>
      </div>

      <div className="space-y-2">
        {seekers.map((seeker) => (
          <div
            key={seeker.id}
            className="flex items-center gap-3 p-3 bg-purple-50/50 rounded-lg hover:bg-purple-50 transition-all"
          >
            {/* Avatar */}
            {seeker.avatar_url ? (
              <img
                src={seeker.avatar_url}
                alt={seeker.display_name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
                {seeker.display_name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Body16 className="font-semibold text-gray-900 truncate">
                  {seeker.display_name}
                </Body16>
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse flex-shrink-0" aria-label="Seeking support"></span>
              </div>
              <Body16 className="text-sm text-gray-600 truncate">
                {getDisplayMessage(seeker.tagline, seeker.bio)}
              </Body16>
              {seeker.tags && seeker.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {seeker.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                      {tag}
                    </span>
                  ))}
                  {seeker.tags.length > 3 && (
                    <span className="text-[10px] text-gray-400">+{seeker.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>

            {/* Connect Button */}
            <button
              onClick={() => connectWithSeeker(seeker.id)}
              disabled={connecting === seeker.id}
              aria-label={`Connect with ${seeker.display_name}`}
              className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition-all transform hover:scale-105 whitespace-nowrap flex-shrink-0"
            >
              {connecting === seeker.id ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </span>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Account Blocked Modal */}
      <Modal
        isOpen={blockModal.show}
        onClose={() => setBlockModal({ show: false, reason: '' })}
        title="Account Restricted"
        confirmText="OK"
        confirmStyle="primary"
      >
        <p className="text-lg mb-4">
          Your account has been restricted and you cannot create new chat sessions at this time.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm">
            <strong>Reason:</strong>
            <br />
            {blockModal.reason}
          </p>
        </div>
        <p className="text-sm text-rb-gray">
          Please contact support for more information.
        </p>
      </Modal>

      {/* Connection Error Modal */}
      <Modal
        isOpen={errorModal.show}
        onClose={() => setErrorModal({ show: false, message: '' })}
        title="Connection Failed"
        confirmText="Try Again"
        confirmStyle="danger"
      >
        <p className="text-lg mb-4">
          We couldn&apos;t connect you with this person right now.
        </p>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm">
            This happens sometimes! Please try again in a moment.
          </p>
          {errorModal.message && (
            <p className="text-xs text-rb-gray mt-2">
              Technical details: {errorModal.message}
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
