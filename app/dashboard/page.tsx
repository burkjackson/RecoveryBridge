'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import { SkeletonRoleCard } from '@/components/Skeleton'
import ErrorState from '@/components/ErrorState'
import Footer from '@/components/Footer'
import NotificationSettings from '@/components/NotificationSettings'
import AvailableListeners from '@/components/AvailableListeners'
import PeopleSeeking from '@/components/PeopleSeeking'
import type { Profile, SessionWithUserName, ProfileUpdateData, FavoriteWithProfile } from '@/lib/types/database'
import { TIME, NOTIFICATION } from '@/lib/constants'
import ThemeToggle from '@/components/ThemeToggle'

function DashboardContent() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSessions, setActiveSessions] = useState<SessionWithUserName[]>([])
  const [recentSessions, setRecentSessions] = useState<SessionWithUserName[]>([])
  const [availableListenerCount, setAvailableListenerCount] = useState(0)
  const [favorites, setFavorites] = useState<FavoriteWithProfile[]>([])
  const [connectingFavorite, setConnectingFavorite] = useState<string | null>(null)
  const [error, setError] = useState<{ show: boolean; message: string; action?: () => void }>({ show: false, message: '' })
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [trainingBannerDismissed, setTrainingBannerDismissed] = useState(false)
  const [showTrainingComplete, setShowTrainingComplete] = useState(false)
  const [recentOpen, setRecentOpen] = useState(false)
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false)
  const [showPostChatBanner, setShowPostChatBanner] = useState(false)
  const [postChatFeeling, setPostChatFeeling] = useState<'good' | 'struggling' | null>(null)
  const postChatFeelingRef = useRef<'good' | 'struggling' | null>(null)
  const profileRef = useRef<Profile | null>(null)
  const searchParams = useSearchParams()
  const lastNotifyTimestampRef = useRef<number>(0)
  const notifyCountRef = useRef<number>(0)
  const router = useRouter()
  const supabase = createClient()

  // Keep profileRef in sync for use in realtime callbacks
  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  // Restore re-notification tracking state from sessionStorage on mount
  useEffect(() => {
    try {
      const storedTs = sessionStorage.getItem(NOTIFICATION.STORAGE_KEY_LAST_NOTIFY)
      const storedCount = sessionStorage.getItem(NOTIFICATION.STORAGE_KEY_NOTIFY_COUNT)
      if (storedTs) lastNotifyTimestampRef.current = parseInt(storedTs, 10)
      if (storedCount) notifyCountRef.current = parseInt(storedCount, 10)
    } catch {
      // sessionStorage may not be available
    }
  }, [])

  // Show post-chat check-in banner for seekers returning from a session.
  // Only auto-dismiss if the user hasn't selected 'struggling' — never dismiss
  // while they're reading crisis resources.
  useEffect(() => {
    if (searchParams.get('postChat') === 'true') {
      setShowPostChatBanner(true)
      setPostChatFeeling(null)
      postChatFeelingRef.current = null
      const timer = setTimeout(() => {
        if (postChatFeelingRef.current !== 'struggling') {
          setShowPostChatBanner(false)
        }
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get('trainingComplete') === 'true') {
      setShowTrainingComplete(true)
      const timer = setTimeout(() => setShowTrainingComplete(false), 6000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  useEffect(() => {
    loadProfile()
    loadActiveSessions()
    loadRecentSessions()
    loadFavorites()
    cleanupStaleSessions() // Clean up abandoned sessions in the background

    // Subscribe to new sessions
    const channel = supabase
      .channel('sessions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessions'
        },
        (payload) => {
          loadActiveSessions()
          // Auto-navigate to chat when a session is created involving me
          const newSession = payload.new as Record<string, unknown>
          const myId = profileRef.current?.id
          if (
            newSession.status === 'active' &&
            (newSession.seeker_id === myId || newSession.listener_id === myId)
          ) {
            router.push(`/chat/${newSession.id}`)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions'
        },
        () => {
          loadActiveSessions()
          loadRecentSessions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Heartbeat system: Send "I'm still here" signal every 30 seconds when available or requesting
  // Also checks if re-notification is needed when in requesting state
  useEffect(() => {
    if (!profile || (profile.role_state !== 'available' && profile.role_state !== 'requesting')) {
      return
    }

    // Send initial heartbeat immediately
    sendHeartbeat()

    // Then send heartbeat at regular intervals (and check re-notification for seekers)
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat()
      if (profileRef.current?.role_state === 'requesting') {
        checkAndRenotify()
      }
    }, TIME.HEARTBEAT_INTERVAL_MS)

    return () => {
      clearInterval(heartbeatInterval)
    }
  }, [profile?.role_state])

  // Session poll: while seeker is requesting, poll every 2s for an active session.
  // This is a reliable fallback alongside the realtime subscription — Supabase
  // realtime postgres_changes can miss INSERT events if RLS filters the payload
  // before it reaches the subscriber.
  useEffect(() => {
    if (profile?.role_state !== 'requesting') return

    async function checkForSession() {
      if (profileRef.current?.role_state !== 'requesting') return
      try {
        const { data: activeSession } = await supabase
          .from('sessions')
          .select('id')
          .eq('seeker_id', profileRef.current.id)
          .eq('status', 'active')
          .maybeSingle()

        if (activeSession) {
          router.push(`/chat/${activeSession.id}`)
        }
      } catch {
        // Silent — don't disrupt the seeker experience if poll fails
      }
    }

    // Check immediately, then every 2 seconds
    checkForSession()
    const pollInterval = setInterval(checkForSession, 2000)

    return () => clearInterval(pollInterval)
  }, [profile?.role_state])

  // Listener-side poll: while available, poll every 2s for a seeker who connected
  // directly (e.g. via the Connect button on Available Listeners or via Favorites).
  // Realtime INSERT events are filtered by RLS before reaching the subscriber, so
  // polling is the reliable fallback.
  useEffect(() => {
    if (profile?.role_state !== 'available') return

    async function checkForListenerSession() {
      if (profileRef.current?.role_state !== 'available') return
      try {
        const { data: activeSession } = await supabase
          .from('sessions')
          .select('id')
          .eq('listener_id', profileRef.current.id)
          .eq('status', 'active')
          .maybeSingle()

        if (activeSession) {
          router.push(`/chat/${activeSession.id}`)
        }
      } catch {
        // Silent
      }
    }

    // Check immediately, then every 2 seconds
    checkForListenerSession()
    const pollInterval = setInterval(checkForListenerSession, 2000)

    return () => clearInterval(pollInterval)
  }, [profile?.role_state])

  async function sendHeartbeat() {
    if (!profile || (profile.role_state !== 'available' && profile.role_state !== 'requesting')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch('/api/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: profile.id })
      })
    } catch (error) {
      console.error('Failed to send heartbeat:', error)
    }
  }

  async function checkAndRenotify() {
    if (!profileRef.current || profileRef.current.role_state !== 'requesting') return

    const now = Date.now()
    const elapsed = now - lastNotifyTimestampRef.current

    // Not enough time has passed since last notification
    if (elapsed < TIME.RENOTIFY_DELAY_MS) return

    // Already sent max re-notifications
    if (notifyCountRef.current >= NOTIFICATION.MAX_RENOTIFY_COUNT) return

    // Check if seeker already has an active session (a listener connected)
    try {
      const { data: activeSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('seeker_id', profileRef.current.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (activeSession) return // Already connected, no need to re-notify

      // Send re-notification
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          seekerId: profileRef.current.id,
          isRenotification: true
        })
      })

      // Update tracking state
      lastNotifyTimestampRef.current = now
      notifyCountRef.current += 1

      // Persist to sessionStorage
      try {
        sessionStorage.setItem(NOTIFICATION.STORAGE_KEY_LAST_NOTIFY, String(now))
        sessionStorage.setItem(NOTIFICATION.STORAGE_KEY_NOTIFY_COUNT, String(notifyCountRef.current))
      } catch {
        // sessionStorage may not be available
      }
    } catch (error) {
      console.error('Re-notification check failed:', error)
    }
  }

  async function cleanupStaleSessions() {
    try {
      // Get auth token to authorize the cleanup request
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return // Not authenticated, skip cleanup

      const response = await fetch('/api/cleanup-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.cleaned > 0) {
          // Refresh the active sessions list if any were cleaned up
          loadActiveSessions()
        }
      }
    } catch (error) {
      // Silent fail - don't disrupt user experience if cleanup fails
      console.error('Session cleanup failed:', error)
    }
  }

  async function loadProfile() {
    try {
      // Use getSession() instead of getUser() for better browser navigation support
      const { data: { session } } = await supabase.auth.getSession()
      let user = session?.user

      if (!user) {
        // Try refreshing the session before redirecting
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
        user = refreshedSession?.user
        
        if (!user) {
          router.push('/login')
          return
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadActiveSessions() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const user = session.user

      // Get active sessions with both users' display names in a single query
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          id, status, created_at, listener_id, seeker_id,
          listener:profiles!sessions_listener_id_fkey(id, display_name),
          seeker:profiles!sessions_seeker_id_fkey(id, display_name)
        `)
        .eq('status', 'active')
        .or(`listener_id.eq.${user.id},seeker_id.eq.${user.id}`)

      if (error) throw error

      const sessionsWithNames = (sessions || []).map((session: any) => {
        const otherUser = session.listener_id === user.id ? session.seeker : session.listener
        return {
          ...session,
          otherUserName: otherUser?.display_name || 'User'
        }
      })

      setActiveSessions(sessionsWithNames)
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  async function loadRecentSessions() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const user = session.user

      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          id, status, created_at, ended_at, listener_id, seeker_id,
          listener:profiles!sessions_listener_id_fkey(id, display_name),
          seeker:profiles!sessions_seeker_id_fkey(id, display_name)
        `)
        .eq('status', 'ended')
        .or(`listener_id.eq.${user.id},seeker_id.eq.${user.id}`)
        .order('ended_at', { ascending: false })
        .limit(5)

      if (error) throw error

      const sessionsWithNames = (sessions || []).map((session: any) => {
        const otherUser = session.listener_id === user.id ? session.seeker : session.listener
        return {
          ...session,
          otherUserName: otherUser?.display_name || 'User'
        }
      })

      setRecentSessions(sessionsWithNames)
    } catch (error) {
      console.error('Error loading recent sessions:', error)
    }
  }

  async function loadFavorites() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          id,
          user_id,
          favorite_user_id,
          created_at,
          favorite_profile:profiles!user_favorites_favorite_user_id_fkey(
            display_name,
            bio,
            tagline,
            avatar_url,
            role_state,
            always_available,
            last_heartbeat_at,
            tags,
            user_role
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      const normalized = (data || []).map((row: any) => ({
        ...row,
        favorite_profile: Array.isArray(row.favorite_profile)
          ? row.favorite_profile[0]
          : row.favorite_profile,
      }))
      setFavorites(normalized as unknown as FavoriteWithProfile[])
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }

  async function connectWithFavorite(favoriteUserId: string) {
    if (connectingFavorite || !profile) return
    setConnectingFavorite(favoriteUserId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert([{ listener_id: favoriteUserId, seeker_id: profile.id, status: 'active' }])
        .select()
        .single()

      if (error) throw error
      router.push(`/chat/${newSession.id}`)
    } catch (error) {
      console.error('Error connecting with favorite:', error)
    } finally {
      setConnectingFavorite(null)
    }
  }

  async function endAllActiveSessions() {
    if (!profile) return

    try {
      // End all active sessions where user is either listener or seeker
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('status', 'active')
        .or(`listener_id.eq.${profile.id},seeker_id.eq.${profile.id}`)

      if (error) throw error
    } catch (error) {
      console.error('Error ending sessions:', error)
    }
  }

  async function handleSignOut() {
    // End all active sessions before signing out
    await endAllActiveSessions()
    await supabase.auth.signOut()
    router.push('/')
  }

  // Called when listener clicks the "I'm Here To Listen" button.
  // If they're available and want to go offline, check if any seekers are waiting first.
  async function handleListenerToggle() {
    if (profile?.role_state === 'available') {
      // Check for seekers currently in requesting state
      try {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role_state', 'requesting')
          .neq('id', profile.id)

        if (count && count > 0) {
          // Seekers are waiting — ask the listener to confirm before going offline
          setShowOfflineConfirm(true)
          return
        }
      } catch {
        // If the check fails, allow the toggle to proceed normally
      }

      setRoleState('offline')
    } else {
      setRoleState('available')
    }
  }

  async function setRoleState(newState: Profile['role_state']) {
    if (!profile) return

    try {
      // Set heartbeat timestamp when going available or requesting
      const updateData: ProfileUpdateData = { role_state: newState }
      if (newState === 'available' || newState === 'requesting') {
        updateData.last_heartbeat_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id)

      if (error) throw error

      // Only update local state after DB confirms — prevents stale UI on failure
      setProfile({ ...profile, role_state: newState })

      // If going offline, end all active sessions
      if (newState === 'offline') {
        await endAllActiveSessions()
      }

      // If leaving requesting state, clear re-notification tracking
      if (newState !== 'requesting') {
        lastNotifyTimestampRef.current = 0
        notifyCountRef.current = 0
        try {
          sessionStorage.removeItem(NOTIFICATION.STORAGE_KEY_LAST_NOTIFY)
          sessionStorage.removeItem(NOTIFICATION.STORAGE_KEY_NOTIFY_COUNT)
        } catch {
          // sessionStorage may not be available
        }
      }

      // If requesting support, send notifications to available listeners
      // Seeker stays on dashboard — auto-navigates to chat when a listener connects
      if (newState === 'requesting') {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            console.error('No session found for notification')
            return
          }

          const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              seekerId: profile.id,
              favoriteListenerIds: favorites.map(f => f.favorite_user_id)
            })
          })

          const result = await response.json()

          // Record notification timestamp for re-notification tracking
          const now = Date.now()
          lastNotifyTimestampRef.current = now
          notifyCountRef.current = 0
          try {
            sessionStorage.setItem(NOTIFICATION.STORAGE_KEY_LAST_NOTIFY, String(now))
            sessionStorage.setItem(NOTIFICATION.STORAGE_KEY_NOTIFY_COUNT, '0')
          } catch {
            // sessionStorage may not be available
          }
        } catch (notifError) {
          console.error('Failed to send notifications:', notifError)
          // Don't block the user flow if notifications fail
        }
      }
    } catch (error) {
      console.error('Error updating role state:', error)
      setError({
        show: true,
        message: 'We couldn\'t update your status right now. Please try again in a moment.',
        action: () => setRoleState(newState)
      })
    }
  }

  if (loading) {
    return (
      <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="flex gap-4 items-start mb-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-7 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-48 sm:w-64" />
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-32 sm:w-48" />
              </div>
            </div>
          </div>

          {/* Role cards skeleton */}
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4" role="status" aria-label="Loading dashboard">
            <SkeletonRoleCard />
            <SkeletonRoleCard />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 sm:mb-8 border border-rb-gray/10">
          {/* Top Navigation Bar */}
          <div className="flex justify-between items-center mb-6">
            {/* Left: Logo */}
            <img
              src="/logo-icon.png"
              alt="RecoveryBridge"
              className="h-10 sm:h-12 w-auto"
            />

            {/* Right: Theme toggle + Sign Out */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={handleSignOut}
                className="min-h-[44px] px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-900 text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-all whitespace-nowrap"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Welcome Section */}
          <div className="flex gap-3 items-start mb-4">
            {/* Avatar */}
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-rb-blue flex-shrink-0 shadow-md"
              />
            )}
            <div className="flex-1 min-w-0">
              <Heading1 className="text-base sm:text-xl md:text-2xl break-words mb-1">Welcome back, {profile?.display_name}!</Heading1>
              <Body16 className="text-rb-gray dark:text-gray-400 font-medium italic text-sm mb-2">"{profile?.tagline || 'Your story matters here'}"</Body16>
              {profile?.user_role && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rb-blue/10 text-rb-blue dark:bg-blue-900/30 dark:text-blue-300">
                  {profile.user_role === 'person_in_recovery' && 'Person in Recovery'}
                  {profile.user_role === 'professional' && 'Allies in Long-Term Recovery'}
                  {profile.user_role === 'ally' && 'Recovery Support'}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => router.push('/profile')}
              className="min-h-[44px] px-6 py-2.5 bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full text-sm font-semibold hover:shadow-lg transition-all"
            >
              Profile
            </button>
          </div>
        </div>

        {/* Post-chat check-in banner (seekers returning from a session) */}
        {showPostChatBanner && (
          <div className={`mb-6 rounded-xl p-4 shadow-sm border ${postChatFeeling === 'struggling' ? 'bg-purple-50 dark:bg-purple-900/20 border-rb-purple/40' : 'bg-blue-50 dark:bg-blue-900/20 border-rb-blue/30 dark:border-blue-800'}`}>
            {postChatFeeling === 'good' ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0" aria-hidden="true">💙</span>
                <Body16 className="font-semibold text-rb-dark dark:text-gray-100 text-sm flex-1">Glad to hear it — take care of yourself today.</Body16>
                <button
                  onClick={() => setShowPostChatBanner(false)}
                  aria-label="Dismiss"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-rb-gray dark:text-gray-400 hover:text-rb-dark dark:hover:text-gray-100 transition-colors flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ) : postChatFeeling === 'struggling' ? (
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0" aria-hidden="true">🤝</span>
                <div className="flex-1 min-w-0">
                  <Body16 className="font-semibold text-rb-dark dark:text-gray-100 text-sm">You don't have to go through this alone.</Body16>
                  <Body16 className="text-rb-gray dark:text-gray-400 text-sm mt-1">Reach out anytime — support is available 24/7.</Body16>
                  <div className="flex flex-col gap-2 mt-3">
                    <button
                      onClick={() => { setShowPostChatBanner(false); setRoleState('requesting') }}
                      className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rb-purple text-white rounded-full text-sm font-semibold hover:bg-rb-purple/90 transition-colors shadow-sm"
                    >
                      🤝 Talk to a listener again
                    </button>
                    <div className="flex flex-wrap gap-2">
                      <a href="tel:988" className="min-h-[44px] inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-rb-blue text-rb-blue rounded-full text-sm font-semibold hover:bg-rb-blue-light dark:hover:bg-gray-700 transition-colors">Call 988</a>
                      <a href="sms:741741&body=HELLO" className="min-h-[44px] inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-rb-gray dark:text-gray-300 rounded-full text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Text HOME to 741741</a>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowPostChatBanner(false)}
                  aria-label="Dismiss"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-rb-gray dark:text-gray-400 hover:text-rb-dark dark:hover:text-gray-100 transition-colors flex-shrink-0 -mt-1 -mr-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0" aria-hidden="true">💙</span>
                <div className="flex-1 min-w-0">
                  <Body16 className="font-semibold text-rb-dark dark:text-gray-100 text-sm">Thanks for connecting — how are you feeling?</Body16>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => { postChatFeelingRef.current = 'good'; setPostChatFeeling('good'); setTimeout(() => setShowPostChatBanner(false), 3000) }}
                      aria-label="Feeling good"
                      className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-semibold hover:bg-green-50 hover:border-green-300 transition-colors"
                    >
                      <span aria-hidden="true">👍</span> Good
                    </button>
                    <button
                      onClick={() => { postChatFeelingRef.current = 'struggling'; setPostChatFeeling('struggling') }}
                      aria-label="Feeling like I'm struggling"
                      className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-semibold hover:bg-purple-50 hover:border-purple-300 transition-colors"
                    >
                      <span aria-hidden="true">👎</span> Struggling
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowPostChatBanner(false)}
                  aria-label="Dismiss"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-rb-gray dark:text-gray-400 hover:text-rb-dark dark:hover:text-gray-100 transition-colors flex-shrink-0 -mt-1 -mr-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Training complete toast */}
        {showTrainingComplete && (
          <div className="mb-6 flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 shadow-sm">
            <span className="text-2xl flex-shrink-0" aria-hidden="true">✅</span>
            <div className="flex-1 min-w-0">
              <Body16 className="font-semibold text-green-800 dark:text-green-200 text-sm">Training complete — thank you!</Body16>
              <Body16 className="text-green-700 dark:text-green-300 text-sm mt-0.5">You're ready to show up as a safe, empathetic listener.</Body16>
            </div>
            <button
              onClick={() => setShowTrainingComplete(false)}
              aria-label="Dismiss"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 transition-colors flex-shrink-0 -mt-1 -mr-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Listener training nudge */}
        {!trainingBannerDismissed && profile && !profile.listener_training_completed_at && (
          <div className="mb-6 flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 shadow-sm">
            <span className="text-2xl flex-shrink-0" aria-hidden="true">🤝</span>
            <div className="flex-1 min-w-0">
              <Body16 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">Complete your listener training</Body16>
              <Body16 className="text-blue-800 dark:text-blue-300 text-sm mt-0.5">RecoveryBridge is built on safe, empathetic listening. Take 5 minutes to read through our core principles before your first conversation.</Body16>
              <button
                onClick={() => router.push('/training')}
                className="mt-3 min-h-[44px] inline-flex items-center gap-1 px-5 py-2 bg-rb-blue hover:bg-rb-blue-hover text-white rounded-full text-sm font-semibold transition-colors"
              >
                Start Training →
              </button>
            </div>
            <button
              onClick={() => setTrainingBannerDismissed(true)}
              aria-label="Dismiss"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 transition-colors flex-shrink-0 -mt-1 -mr-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Onboarding Nudge Banner */}
        {!nudgeDismissed && profile && (!profile.user_role || !profile.bio) && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 shadow-sm">
            <span className="text-2xl flex-shrink-0" aria-hidden="true">✏️</span>
            <div className="flex-1 min-w-0">
              <Body16 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Finish setting up your profile</Body16>
              <Body16 className="text-amber-800 dark:text-amber-300 text-sm mt-0.5">Choose your role and add a bio so others can find and connect with you.</Body16>
              <button
                onClick={() => router.push('/onboarding')}
                className="mt-3 min-h-[44px] inline-flex items-center gap-1 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-sm font-semibold transition-colors"
              >
                Complete Setup →
              </button>
            </div>
            <button
              onClick={() => setNudgeDismissed(true)}
              aria-label="Dismiss"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors flex-shrink-0 -mt-1 -mr-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Error State */}
        {error.show && (
          <ErrorState
            type="banner"
            message={error.message}
            onRetry={() => {
              setError({ show: false, message: '' })
              if (error.action) error.action()
            }}
          />
        )}

        {/* Role Buttons */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8" role="group" aria-label="Choose your current role">
          <button
            onClick={handleListenerToggle}
            aria-label={profile?.role_state === 'available' ? 'You are currently available to listen. Click to go offline' : 'Make yourself available to listen and support others'}
            aria-pressed={profile?.role_state === 'available'}
            className={`p-8 rounded-2xl text-center transition-all duration-200 ${
              profile?.role_state === 'available'
                ? 'bg-rb-blue-light dark:bg-gray-700 border-4 border-rb-blue shadow-lg animate-pulse-glow-blue'
                : 'bg-white dark:bg-gray-800 border-4 border-rb-blue shadow-md hover:shadow-xl hover:border-rb-blue-hover'
            }`}
            style={profile?.role_state === 'available' ? {
              boxShadow: '0 10px 25px -5px rgba(90, 122, 140, 0.3), 0 8px 10px -6px rgba(90, 122, 140, 0.2)'
            } : {}}
          >
            <Body18 className="font-bold text-rb-blue mb-2 text-lg">I'm Here To Listen</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 text-sm mb-4">Offer support and connection to others</Body16>
            {profile?.role_state === 'available' ? (
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/70 dark:bg-gray-800/70 rounded-xl">
                <span className="w-2 h-2 bg-rb-blue rounded-full animate-pulse"></span>
                <Body16 className="text-sm text-rb-blue font-semibold" aria-live="polite">You're Available</Body16>
              </div>
            ) : (
              <Body16 className="text-sm text-rb-blue font-medium">Click to become available</Body16>
            )}
          </button>

          <button
            onClick={() => setRoleState(profile?.role_state === 'requesting' ? 'offline' : 'requesting')}
            aria-label={profile?.role_state === 'requesting' ? 'You are currently looking for support. Click to cancel' : 'Request support and connect with an available listener'}
            aria-pressed={profile?.role_state === 'requesting'}
            className={`p-8 rounded-2xl text-center transition-all duration-200 ${
              profile?.role_state === 'requesting'
                ? 'bg-rb-purple-light dark:bg-gray-700 border-4 border-rb-purple shadow-lg animate-pulse-glow-purple'
                : 'bg-white dark:bg-gray-800 border-4 border-rb-purple shadow-md hover:shadow-xl hover:border-rb-purple/70'
            }`}
            style={profile?.role_state === 'requesting' ? {
              boxShadow: '0 10px 25px -5px rgba(184, 169, 201, 0.4), 0 8px 10px -6px rgba(184, 169, 201, 0.3)'
            } : {}}
          >
            <Body18 className="font-bold text-rb-purple mb-2 text-lg">I Need Support</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 text-sm mb-4">Connect with someone who understands</Body16>
            {profile?.role_state === 'requesting' ? (
              <div className="space-y-3" aria-live="polite">
                {/* Animated waiting indicator */}
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 bg-rb-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-rb-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-rb-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <Body16 className="text-sm text-rb-purple font-semibold">Finding you a listener…</Body16>
                <Body16 className="text-xs text-rb-purple/80 leading-relaxed">
                  {availableListenerCount > 0
                    ? `${availableListenerCount} listener${availableListenerCount === 1 ? '' : 's'} notified — someone will connect shortly.`
                    : 'Notifying all available listeners now.'}
                </Body16>
                <Body16 className="text-xs text-rb-gray dark:text-gray-400">Most listeners respond within 2 minutes.</Body16>
                <Body16 className="text-xs text-rb-purple/60 mt-1">Tap to cancel</Body16>
              </div>
            ) : (
              <Body16 className="text-sm text-rb-purple font-medium">Click to find a listener</Body16>
            )}
          </button>
        </div>

        {/* Notification Settings — surfaced early so new listeners discover push opt-in */}
        <div className="mb-4 sm:mb-6">
          <NotificationSettings profile={profile} onProfileUpdate={setProfile} />
        </div>

        {/* My Favorites */}
        {favorites.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-amber-400 text-lg">⭐</span>
              <Body18 className="font-semibold text-rb-dark dark:text-gray-100">My Favorites</Body18>
            </div>
            <div className="space-y-2">
              {favorites.map(fav => {
                const fp = fav.favorite_profile
                const heartbeatThreshold = new Date(Date.now() - TIME.HEARTBEAT_THRESHOLD_MS).toISOString()
                const isOnline = fp.always_available || (
                  fp.last_heartbeat_at !== null &&
                  fp.role_state === 'available' &&
                  fp.last_heartbeat_at >= heartbeatThreshold
                )
                return (
                  <div key={fav.id} className="flex items-center gap-3 p-3 bg-amber-50/40 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/40 rounded-lg">
                    {/* Avatar */}
                    {fp.avatar_url ? (
                      <img src={fp.avatar_url} alt={fp.display_name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-rb-blue flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {fp.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Body16 className="font-semibold text-rb-dark dark:text-gray-100 truncate">{fp.display_name}</Body16>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                      </div>
                      <Body16 className="text-sm text-rb-gray dark:text-gray-400">
                        {isOnline ? 'Available now' : 'Offline'}
                      </Body16>
                    </div>

                    {/* Connect — only when seeker is requesting and favorite is online */}
                    {profile?.role_state === 'requesting' && isOnline && (
                      <button
                        onClick={() => connectWithFavorite(fav.favorite_user_id)}
                        disabled={connectingFavorite === fav.favorite_user_id}
                        aria-label={`Connect with ${fp.display_name}`}
                        className="min-h-[44px] px-4 py-2 bg-rb-blue text-white rounded-lg text-sm font-semibold hover:bg-rb-blue-hover transition-all flex-shrink-0 disabled:opacity-50"
                      >
                        {connectingFavorite === fav.favorite_user_id ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* People Seeking Support - only visible to available listeners */}
        {profile && (
          <PeopleSeeking
            currentUserId={profile.id}
            currentRoleState={profile.role_state}
          />
        )}

        {/* Available Listeners */}
        <AvailableListeners onCountChange={setAvailableListenerCount} currentUserId={profile?.id} currentRoleState={profile?.role_state} />

        {/* Discover more listeners */}
        <div className="mb-6 text-center">
          <button
            onClick={() => router.push('/listeners')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-rb-blue/30 text-rb-blue text-sm font-semibold hover:bg-rb-blue-light dark:hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            Browse All Listeners
          </button>
        </div>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-8">
            <Body18 className="font-semibold text-rb-dark dark:text-gray-100 mb-4">Active Conversations</Body18>
            <div className="space-y-2" role="list" aria-label="Active chat sessions">
              {activeSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/chat/${session.id}`)}
                  aria-label={`Open chat with ${session.otherUserName}`}
                  role="listitem"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Body16 className="font-medium text-rb-dark dark:text-gray-100 mb-1">
                        {session.otherUserName}
                      </Body16>
                      <Body16 className="text-sm text-rb-gray dark:text-gray-400">
                        Continue your conversation
                      </Body16>
                    </div>
                    <span className="text-gray-400 dark:text-gray-500">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions — collapsible accordion */}
        {recentSessions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-8 overflow-hidden">
            <button
              onClick={() => setRecentOpen((o) => !o)}
              aria-expanded={recentOpen}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Body18 className="font-semibold text-rb-dark dark:text-gray-100">Recent Conversations</Body18>
              <span className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${recentOpen ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>

            {recentOpen && (
              <div className="px-6 pb-5 space-y-2" role="list" aria-label="Recent chat sessions">
                {recentSessions.map((session) => {
                  const endedAt = session.ended_at ? new Date(session.ended_at) : null
                  const startedAt = new Date(session.created_at)
                  const durationMs = endedAt ? endedAt.getTime() - startedAt.getTime() : null
                  const durationMin = durationMs !== null ? Math.round(durationMs / 60000) : null
                  const dateLabel = endedAt
                    ? endedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : ''
                  return (
                    <div
                      key={session.id}
                      role="listitem"
                      className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <Body16 className="font-medium text-rb-dark dark:text-gray-100 mb-0.5">
                            {session.otherUserName}
                          </Body16>
                          <Body16 className="text-sm text-rb-gray dark:text-gray-400">
                            {dateLabel}{durationMin !== null && durationMin > 0 ? ` · ${durationMin} min` : ''}
                          </Body16>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <Footer />
      </div>

      {/* Offline Confirmation Modal */}
      {showOfflineConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="offline-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowOfflineConfirm(false)}
            aria-hidden="true"
          />

          {/* Modal card */}
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-5">
              <span className="text-4xl block mb-3" aria-hidden="true">🙏</span>
              <h2 id="offline-confirm-title" className="text-lg font-bold text-rb-dark dark:text-gray-100 mb-2">
                Someone is waiting for support
              </h2>
              <p className="text-sm text-rb-gray dark:text-gray-400 leading-relaxed">
                There are people looking for a listener right now. Are you sure you want to go offline?
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Primary: stay available */}
              <button
                onClick={() => setShowOfflineConfirm(false)}
                className="min-h-[48px] w-full px-6 py-3 bg-rb-blue hover:bg-rb-blue-hover text-white rounded-full text-sm font-semibold transition-colors"
                autoFocus
              >
                Stay Available
              </button>

              {/* Secondary: go offline anyway */}
              <button
                onClick={() => {
                  setShowOfflineConfirm(false)
                  setRoleState('offline')
                }}
                className="min-h-[48px] w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-sm font-semibold transition-colors"
              >
                Go Offline Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  )
}
