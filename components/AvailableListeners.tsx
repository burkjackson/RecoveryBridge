'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Body16, Body18 } from '@/components/ui/Typography'
import ErrorState from '@/components/ErrorState'
import Modal from '@/components/Modal'
import { TIME, UI } from '@/lib/constants'
import type { Profile } from '@/lib/types/database'

interface Listener {
  id: string
  display_name: string
  bio: string | null
  tagline: string | null
  tags: string[] | null
  avatar_url: string | null
  user_role: string
  always_available: boolean
  last_heartbeat_at: string | null
}

interface AvailableListenersProps {
  onCountChange?: (count: number) => void
  currentUserId?: string
  currentRoleState?: string | null
  currentUserProfile?: Profile | null
}

export default function AvailableListeners({ onCountChange, currentUserId, currentUserProfile }: AvailableListenersProps) {
  const router = useRouter()
  const [listeners, setListeners] = useState<Listener[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profilePreview, setProfilePreview] = useState<Listener | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [hasSharedSession, setHasSharedSession] = useState<Set<string>>(new Set())
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [blockModal, setBlockModal] = useState({ show: false, reason: '' })
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const supabase = createClient()

  useEffect(() => {
    loadAvailableListeners()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('available-listeners-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          loadAvailableListeners()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  async function loadAvailableListeners() {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      const userId = currentUserId || user?.id

      // Calculate timestamp for heartbeat threshold
      const heartbeatThreshold = new Date(Date.now() - TIME.HEARTBEAT_THRESHOLD_MS).toISOString()

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, bio, tagline, tags, avatar_url, user_role, last_heartbeat_at, always_available')
        .eq('role_state', 'available')
        .neq('id', userId || '')

      if (error) throw error

      // Filter to active listeners only
      const onlineListeners = (data || []).filter(listener => {
        if (listener.always_available) return true
        if (!listener.last_heartbeat_at) return false
        return listener.last_heartbeat_at >= heartbeatThreshold
      })

      // Load favorites and shared session history
      let favIds = new Set<string>()
      const sharedIds = new Set<string>()

      if (userId && onlineListeners.length > 0) {
        // Fetch current favorites
        const { data: favData } = await supabase
          .from('user_favorites')
          .select('favorite_user_id')
          .eq('user_id', userId)

        favIds = new Set((favData || []).map(f => f.favorite_user_id))
        setFavoriteIds(favIds)

        // Fetch shared ended sessions with visible listeners
        const listenerIds = onlineListeners.map(l => l.id)
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('listener_id, seeker_id')
          .eq('status', 'ended')
          .or(
            listenerIds
              .map(id =>
                `and(listener_id.eq.${id},seeker_id.eq.${userId}),and(seeker_id.eq.${id},listener_id.eq.${userId})`
              )
              .join(',')
          )

        ;(sessionData || []).forEach(s => {
          if (s.listener_id === userId) sharedIds.add(s.seeker_id)
          else sharedIds.add(s.listener_id)
        })
        setHasSharedSession(sharedIds)
      }

      // Sort: favorites first, then alphabetically
      const sorted = [...onlineListeners].sort((a, b) => {
        const aFav = favIds.has(a.id) ? 0 : 1
        const bFav = favIds.has(b.id) ? 0 : 1
        if (aFav !== bFav) return aFav - bFav
        return a.display_name.localeCompare(b.display_name)
      })

      setListeners(sorted)
      onCountChange?.(sorted.length)
    } catch (err) {
      console.error('Error loading available listeners:', err)
      setError('We couldn\'t load available listeners right now. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function toggleFavorite(listenerId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || togglingFavorite) return

    setTogglingFavorite(listenerId)
    const isFav = favoriteIds.has(listenerId)

    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev)
      if (isFav) next.delete(listenerId)
      else next.add(listenerId)
      return next
    })

    try {
      if (isFav) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('favorite_user_id', listenerId)
      } else {
        await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, favorite_user_id: listenerId })
      }
      // Re-load to apply sort
      loadAvailableListeners()
    } catch (err) {
      // Roll back optimistic update
      setFavoriteIds(prev => {
        const next = new Set(prev)
        if (isFav) next.add(listenerId)
        else next.delete(listenerId)
        return next
      })
      console.error('Error toggling favorite:', err)
    } finally {
      setTogglingFavorite(null)
    }
  }

  async function connectWithListener(listenerId: string) {
    if (connectingId) return
    setConnectingId(listenerId)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErrorModal({ show: true, message: 'You need to be signed in to connect.' })
        return
      }

      // Check if user is blocked
      const { data: blockCheck } = await supabase
        .from('user_blocks')
        .select('id, reason')
        .eq('user_id', user.id)
        .maybeSingle()

      if (blockCheck) {
        setBlockModal({ show: true, reason: blockCheck.reason })
        return
      }

      // Check for existing active session first
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('seeker_id', user.id)
        .eq('listener_id', listenerId)
        .eq('status', 'active')
        .maybeSingle()

      if (existingSession) {
        router.push(`/chat/${existingSession.id}`)
        return
      }

      // Create a new session
      const { data: session, error } = await supabase
        .from('sessions')
        .insert([{ seeker_id: user.id, listener_id: listenerId, status: 'active' }])
        .select()
        .single()

      if (error || !session) {
        console.error('Error creating session:', error)
        setErrorModal({ show: true, message: error?.message || 'An unexpected error occurred' })
        return
      }

      // Notify the listener with a distinct "direct connect" push (fire-and-forget —
      // shouldn't block navigation into the chat)
      supabase.auth.getSession().then(({ data: { session: authSession } }) => {
        if (!authSession) return
        fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession.access_token}`
          },
          body: JSON.stringify({ seekerId: user.id, targetListenerId: listenerId })
        }).catch(() => {})
      })

      // Mark both users as offline while in chat — seeker leaves seeking list,
      // listener becomes unavailable to other seekers until the session ends
      await supabase
        .from('profiles')
        .update({ role_state: 'offline' })
        .in('id', [user.id, listenerId])

      router.push(`/chat/${session.id}`)
    } catch (err) {
      console.error('Error connecting with listener:', err)
      setErrorModal({ show: true, message: err instanceof Error ? err.message : 'An unexpected error occurred' })
    } finally {
      setConnectingId(null)
    }
  }

  function getDisplayMessage(tagline: string | null, bio: string | null): string {
    if (tagline && tagline.trim()) return tagline
    if (!bio || bio.trim() === '') return 'Available to listen'
    return bio.length > UI.BIO_TRUNCATE_LENGTH ? bio.substring(0, UI.BIO_TRUNCATE_LENGTH) + '...' : bio
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm mb-6">
        <Body18 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Available Listeners</Body18>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm mb-6">
        <Body18 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Available Listeners</Body18>
        <ErrorState
          type="inline"
          message={error}
          onRetry={() => {
            setLoading(true)
            loadAvailableListeners()
          }}
          retryText="Try Again"
        />
      </div>
    )
  }

  // When the current user is available themselves, fall through to the main view
  // so we can show their own "You're visible" card even if no one else is online.
  if (listeners.length === 0 && currentUserProfile?.role_state !== 'available') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm mb-6">
        <Body18 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Available Listeners</Body18>
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <Body16 className="text-gray-600 dark:text-gray-300 mb-2">No listeners available right now</Body16>
          <Body16 className="text-sm text-gray-500 dark:text-gray-300">
            Check back in a few minutes, or set yourself as "Available to Listen" to help others!
          </Body16>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <Body18 className="font-semibold text-gray-900 dark:text-gray-100">Available Listeners</Body18>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <Body16 className="text-sm text-green-700 font-semibold">
            {listeners.length} Online
          </Body16>
        </div>
      </div>

      <div className="space-y-2">
        {/* Your own card — confirms you're listed and shows how seekers see you.
            Not connectable (no Connect button); use Edit profile instead. */}
        {currentUserProfile?.role_state === 'available' && (
          <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-rb-blue/40 bg-rb-blue-light/40 dark:bg-gray-700/40">
            {currentUserProfile.avatar_url ? (
              <Image
                src={currentUserProfile.avatar_url}
                alt={currentUserProfile.display_name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-rb-blue flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {currentUserProfile.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Body16 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{currentUserProfile.display_name}</Body16>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rb-blue text-white flex-shrink-0">You</span>
                <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" aria-hidden="true"></span>
              </div>
              <Body16 className="text-xs text-rb-gray dark:text-gray-300">
                You&apos;re visible to people seeking support right now — this is how they see you.
              </Body16>
            </div>
            <button
              onClick={() => router.push('/profile')}
              aria-label="Edit your profile"
              className="min-h-[44px] px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex-shrink-0 whitespace-nowrap"
            >
              Edit profile
            </button>
          </div>
        )}

        {/* If you're the only one available, reassure rather than show an empty list */}
        {listeners.length === 0 && (
          <div className="text-center py-4">
            <Body16 className="text-sm text-rb-gray dark:text-gray-300">
              You&apos;re the only listener online right now — seekers can still reach you.
            </Body16>
          </div>
        )}

        {listeners.slice(0, 5).map((listener) => (
          <div
            key={listener.id}
            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-all"
          >
            {/* Avatar — clicking opens bio */}
            <button
              onClick={() => setProfilePreview(listener)}
              aria-label={`View ${listener.display_name}'s profile`}
              className="flex-shrink-0"
            >
              {listener.avatar_url ? (
                <Image
                  src={listener.avatar_url}
                  alt={listener.display_name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-rb-blue flex items-center justify-center text-white font-bold text-sm hover:opacity-80 transition-opacity">
                  {listener.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {/* Info — clicking opens bio */}
            <button
              onClick={() => setProfilePreview(listener)}
              aria-label={`View ${listener.display_name}'s profile`}
              className="flex-1 min-w-0 text-left"
            >
              <div className="flex items-center gap-2">
                <Body16 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {listener.display_name}
                </Body16>
                {favoriteIds.has(listener.id) && (
                  <span className="text-amber-400 flex-shrink-0" title="Favorited" aria-label="Favorited">⭐</span>
                )}
                {listener.always_available && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                    ⚡
                  </span>
                )}
              </div>
              <Body16 className="text-sm text-gray-600 dark:text-gray-300 truncate">
                {getDisplayMessage(listener.tagline, listener.bio)}
              </Body16>
              {listener.tags && listener.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {listener.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rb-blue/10 text-rb-blue">
                      {tag}
                    </span>
                  ))}
                  {listener.tags.length > 3 && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-300">+{listener.tags.length - 3}</span>
                  )}
                </div>
              )}
            </button>

            {/* Right side: Connect — opens a profile preview first so it takes two
                taps to start a session (avoids accidental connects) */}
            <div className="flex-shrink-0">
              <button
                onClick={() => setProfilePreview(listener)}
                disabled={connectingId === listener.id}
                aria-label={`View ${listener.display_name}'s profile and connect`}
                className="min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold bg-rb-blue text-white hover:bg-rb-blue-hover disabled:opacity-60 transition-all whitespace-nowrap"
              >
                {connectingId === listener.id ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Body16 className="text-sm text-gray-600 dark:text-gray-300 text-center">
          Tap a listener to view their profile, then <strong>Connect</strong> to start a private chat.
          {listeners.length > 5 && (
            <> Showing 5 of {listeners.length} — use <strong>Browse All Listeners</strong> to see everyone.</>
          )}
        </Body16>
      </div>

      {/* Profile Preview Modal */}
      {profilePreview && (
        <Modal
          isOpen={!!profilePreview}
          onClose={() => setProfilePreview(null)}
          title={profilePreview.display_name}
          type="confirm"
          confirmText="Connect"
          cancelText="Close"
          confirmStyle="primary"
          onConfirm={() => {
            const id = profilePreview.id
            setProfilePreview(null)
            connectWithListener(id)
          }}
        >
          <div className="space-y-4">
            {/* Avatar + status */}
            <div className="flex items-center gap-3">
              {profilePreview.avatar_url ? (
                <Image
                  src={profilePreview.avatar_url}
                  alt={profilePreview.display_name}
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-rb-blue flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {profilePreview.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                {profilePreview.tagline && (
                  <p className="text-sm italic text-gray-600 dark:text-gray-300">"{profilePreview.tagline}"</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></span>
                  <span className="text-xs text-green-600 font-medium">
                    Available to listen{profilePreview.always_available ? ' · Always Available ⚡' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio */}
            {profilePreview.bio && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-1">About</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{profilePreview.bio}</p>
              </div>
            )}

            {/* Tags */}
            {profilePreview.tags && profilePreview.tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-2">Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {profilePreview.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-rb-blue/10 text-rb-blue">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite toggle — only for people you've had a past session with */}
            {hasSharedSession.has(profilePreview.id) && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(profilePreview.id)
                  }}
                  disabled={togglingFavorite === profilePreview.id}
                  className={`min-h-[44px] w-full px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    favoriteIds.has(profilePreview.id)
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {togglingFavorite === profilePreview.id
                    ? 'Saving...'
                    : favoriteIds.has(profilePreview.id)
                      ? '⭐ Remove from favorites'
                      : '☆ Save to favorites'
                  }
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-sm dark:text-gray-300">
            <strong>Reason:</strong>
            <br />
            {blockModal.reason}
          </p>
        </div>
        <p className="text-sm text-rb-gray dark:text-gray-300">
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
          We couldn&apos;t connect you with this listener right now.
        </p>
        <div className="bg-orange-50 dark:bg-amber-900/20 border border-orange-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm">
            This happens sometimes! Please try again in a moment, or try connecting with a different listener.
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
