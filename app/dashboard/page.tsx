'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import { SkeletonRoleCard } from '@/components/Skeleton'
import ErrorState from '@/components/ErrorState'
import Footer from '@/components/Footer'
import NotificationSettings from '@/components/NotificationSettings'
import AvailableListeners from '@/components/AvailableListeners'
import type { Profile, SessionWithUserName, ProfileUpdateData } from '@/lib/types/database'
import { TIME } from '@/lib/constants'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSessions, setActiveSessions] = useState<SessionWithUserName[]>([])
  const [error, setError] = useState<{ show: boolean; message: string; action?: () => void }>({ show: false, message: '' })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
    loadActiveSessions()
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
        () => {
          loadActiveSessions()
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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Heartbeat system: Send "I'm still here" signal every 30 seconds when available
  useEffect(() => {
    if (!profile || profile.role_state !== 'available') {
      return
    }

    // Send initial heartbeat immediately
    sendHeartbeat()

    // Then send heartbeat at regular intervals
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat()
    }, TIME.HEARTBEAT_INTERVAL_MS)

    return () => {
      clearInterval(heartbeatInterval)
    }
  }, [profile?.role_state])

  async function sendHeartbeat() {
    if (!profile || profile.role_state !== 'available') {
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

      // Get active sessions
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'active')
        .or(`listener_id.eq.${user.id},seeker_id.eq.${user.id}`)

      if (error) throw error

      // Get other user's names for each session
      const sessionsWithNames = await Promise.all(
        (sessions || []).map(async (session) => {
          const otherUserId = session.listener_id === user.id
            ? session.seeker_id
            : session.listener_id

          const { data: otherUser } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', otherUserId)
            .single()

          return {
            ...session,
            otherUserName: otherUser?.display_name || 'User'
          }
        })
      )

      setActiveSessions(sessionsWithNames)
    } catch (error) {
      console.error('Error loading sessions:', error)
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

  async function setRoleState(newState: Profile['role_state']) {
    if (!profile) return

    try {
      // Set heartbeat timestamp when going available
      const updateData: ProfileUpdateData = { role_state: newState }
      if (newState === 'available') {
        updateData.last_heartbeat_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, role_state: newState })

      // If going offline, end all active sessions
      if (newState === 'offline') {
        await endAllActiveSessions()
      }

      // If requesting support, send notifications to available listeners
      if (newState === 'requesting') {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            console.error('No session found for notification')
            router.push('/listeners')
            return
          }

          const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              seekerName: profile.display_name,
              seekerId: profile.id
            })
          })

          const result = await response.json()
          // Notifications sent successfully
        } catch (notifError) {
          console.error('Failed to send notifications:', notifError)
          // Don't block the user flow if notifications fail
        }

        router.push('/listeners')
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
      <main id="main-content" className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="max-w-6xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="flex gap-4 items-start mb-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-7 bg-gray-200 rounded animate-pulse w-48 sm:w-64" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32 sm:w-48" />
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
    <main id="main-content" className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 sm:mb-8 border border-rb-gray/10">
          {/* Top Navigation Bar */}
          <div className="flex justify-between items-center mb-6">
            {/* Left: Logo */}
            <img
              src="/logo-icon.png"
              alt="RecoveryBridge"
              className="h-10 sm:h-12 w-auto"
            />

            {/* Right: Sign Out */}
            <button
              onClick={handleSignOut}
              className="min-h-[44px] px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-900 text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-all whitespace-nowrap"
            >
              Sign Out
            </button>
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
              <Body16 className="text-rb-gray font-medium italic text-sm mb-1">"{profile?.tagline || 'Your story matters here'}"</Body16>
              <Body16 className="text-rb-gray text-xs sm:text-sm">Choose how you'd like to engage today</Body16>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => router.push('/profile')}
              className="min-h-[44px] px-6 py-2.5 bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full text-sm font-semibold hover:shadow-lg transition-all"
            >
              Profile
            </button>
          </div>
        </div>

        {/* Role Display */}
        <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
          <Body16 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Role</Body16>
          <Body18 className="text-gray-900">
            {profile?.user_role === 'person_in_recovery' && 'Person in Recovery'}
            {profile?.user_role === 'professional' && 'Allies for Long-Term Recovery'}
            {profile?.user_role === 'ally' && 'Recovery Support (Legacy)'}
            {!profile?.user_role && 'Not set'}
          </Body18>
        </div>

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
            onClick={() => setRoleState(profile?.role_state === 'available' ? 'offline' : 'available')}
            aria-label={profile?.role_state === 'available' ? 'You are currently available to listen. Click to go offline' : 'Make yourself available to listen and support others'}
            aria-pressed={profile?.role_state === 'available'}
            className={`p-8 rounded-2xl text-center transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 ${
              profile?.role_state === 'available'
                ? 'bg-blue-50 border-4 border-blue-500 shadow-lg shadow-blue-500/50 animate-pulse-glow'
                : 'bg-white border-4 border-blue-500 shadow-md hover:shadow-xl'
            }`}
            style={profile?.role_state === 'available' ? {
              boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3), 0 8px 10px -6px rgba(59, 130, 246, 0.3)'
            } : {}}
          >
            <Body18 className="font-bold text-blue-600 mb-2 text-lg">I'm Here To Listen</Body18>
            <Body16 className="text-gray-600 text-sm mb-4">Offer support and connection to others</Body16>
            {profile?.role_state === 'available' ? (
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 rounded-xl">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                <Body16 className="text-sm text-blue-700 font-semibold" aria-live="polite">You're Available</Body16>
              </div>
            ) : (
              <Body16 className="text-sm text-blue-600 font-medium">Click to become available</Body16>
            )}
          </button>

          <button
            onClick={() => setRoleState(profile?.role_state === 'requesting' ? 'offline' : 'requesting')}
            aria-label={profile?.role_state === 'requesting' ? 'You are currently looking for support. Click to cancel' : 'Request support and connect with an available listener'}
            aria-pressed={profile?.role_state === 'requesting'}
            className={`p-8 rounded-2xl text-center transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 ${
              profile?.role_state === 'requesting'
                ? 'bg-purple-50 border-4 border-purple-500 shadow-lg shadow-purple-500/50 animate-pulse-glow'
                : 'bg-white border-4 border-purple-500 shadow-md hover:shadow-xl'
            }`}
            style={profile?.role_state === 'requesting' ? {
              boxShadow: '0 10px 25px -5px rgba(168, 85, 247, 0.3), 0 8px 10px -6px rgba(168, 85, 247, 0.3)'
            } : {}}
          >
            <Body18 className="font-bold text-purple-600 mb-2 text-lg">I Need Support</Body18>
            <Body16 className="text-gray-600 text-sm mb-4">Connect with someone who understands</Body16>
            {profile?.role_state === 'requesting' ? (
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 rounded-xl">
                <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>
                <Body16 className="text-sm text-purple-700 font-semibold" aria-live="polite">Finding Listener...</Body16>
              </div>
            ) : (
              <Body16 className="text-sm text-purple-600 font-medium">Click to find a listener</Body16>
            )}
          </button>
        </div>

        {/* Available Listeners */}
        <AvailableListeners />

        {/* Notification Settings */}
        <div className="mb-4 sm:mb-6">
          <NotificationSettings profile={profile} onProfileUpdate={setProfile} />
        </div>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
            <Body18 className="font-semibold text-gray-900 mb-4">Active Conversations</Body18>
            <div className="space-y-2" role="list" aria-label="Active chat sessions">
              {activeSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/chat/${session.id}`)}
                  aria-label={`Open chat with ${session.otherUserName}`}
                  role="listitem"
                  className="w-full p-4 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Body16 className="font-medium text-gray-900 mb-1">
                        {session.otherUserName}
                      </Body16>
                      <Body16 className="text-sm text-gray-600">
                        Continue your conversation
                      </Body16>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bio Display */}
        {profile?.bio && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <Body18 className="font-semibold text-gray-900 mb-3">About You</Body18>
            <Body16 className="text-gray-700 leading-relaxed">{profile.bio}</Body16>
          </div>
        )}

        {/* Footer */}
        <Footer />
      </div>
    </main>
  )
}
