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

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [error, setError] = useState<{ show: boolean; message: string; action?: () => void }>({ show: false, message: '' })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
    loadActiveSessions()

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
          console.log('🔔 New session created:', payload)
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
        (payload) => {
          console.log('🔔 Session updated:', payload)
          loadActiveSessions()
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status)
      })

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

    // Then send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat()
    }, 30000) // 30 seconds

    return () => {
      clearInterval(heartbeatInterval)
    }
  }, [profile?.role_state])

  async function sendHeartbeat() {
    if (!profile || profile.role_state !== 'available') {
      return
    }

    try {
      await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id })
      })
    } catch (error) {
      console.error('Failed to send heartbeat:', error)
    }
  }

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('👤 Current user ID:', user.id)

      // Get active sessions
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'active')
        .or(`listener_id.eq.${user.id},seeker_id.eq.${user.id}`)

      if (error) throw error

      console.log('💬 Found active sessions:', sessions)

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

      console.log('✅ Sessions with names:', sessionsWithNames)
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

  async function setRoleState(newState: string) {
    if (!profile) return

    try {
      // Set heartbeat timestamp when going available
      const updateData: any = { role_state: newState }
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
          const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              seekerName: profile.display_name,
              seekerId: profile.id
            })
          })

          const result = await response.json()
          console.log('Notification result:', result)

          if (result.notified > 0) {
            console.log(`✅ Notified ${result.notified} listener(s)`)
          }
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
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 border border-rb-gray/10">
          <div className="flex gap-4 items-start mb-4">
            {/* Avatar */}
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 border-rb-blue flex-shrink-0 shadow-md"
              />
            )}
            <div className="flex-1 min-w-0">
              <Heading1 className="text-xl sm:text-2xl md:text-3xl break-words mb-2">Welcome back, {profile?.display_name}!</Heading1>
              <Body16 className="text-rb-gray font-medium italic mb-1">"Your story matters here"</Body16>
              <Body16 className="text-rb-gray text-sm">Choose how you'd like to engage today</Body16>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-4 min-h-[44px] min-w-[44px] px-4 py-3 text-sm bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full hover:shadow-lg transition-all transform hover:scale-105 whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
          <div className="flex gap-3 pt-4 border-t border-rb-gray/10">
            <button
              onClick={() => router.push('/profile')}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-sm text-rb-blue hover:text-rb-blue-hover font-semibold transition"
            >
              <span role="img" aria-label="Profile">👤</span> View Profile →
            </button>
          </div>
        </div>

        {/* Role Display */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
          <Body18 className="mb-2">Your Role</Body18>
          <Body16>
            {profile?.user_role === 'person_in_recovery' && 'Person in Recovery'}
            {profile?.user_role === 'professional' && 'Allies for Long-Term Recovery'}
            {profile?.user_role === 'ally' && 'Recovery Support (Legacy)'}
            {!profile?.user_role && 'Not set'}
          </Body16>
        </div>

        {/* Notification Settings */}
        <div className="mb-4 sm:mb-6">
          <NotificationSettings />
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
        <div className="grid sm:grid-cols-2 gap-4 mb-6 sm:mb-8" role="group" aria-label="Choose your current role">
          <button
            onClick={() => setRoleState(profile?.role_state === 'available' ? 'offline' : 'available')}
            aria-label={profile?.role_state === 'available' ? 'You are currently available to listen. Click to go offline' : 'Make yourself available to listen and support others'}
            aria-pressed={profile?.role_state === 'available'}
            className={`p-5 sm:p-6 rounded-xl text-left transition-all border-4 shadow-sm hover:shadow-md active:shadow-inner ${
              profile?.role_state === 'available'
                ? 'border-[#3B82F6] bg-gradient-to-br from-blue-50 to-blue-25 shadow-md'
                : 'border-rb-gray bg-white hover:border-[#3B82F6] active:border-[#3B82F6]'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl" role="img" aria-label="Headphones">🎧</span>
              <Body18 className="font-bold text-[#2D3436]">I'm Here To Listen</Body18>
            </div>
            <Body16 className="text-rb-gray text-sm mb-3">Offer support and connection to others on their journey</Body16>
            {profile?.role_state === 'available' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full w-fit">
                <span className="w-2 h-2 bg-[#3B82F6] rounded-full animate-pulse"></span>
                <Body16 className="text-sm text-[#3B82F6] font-bold" aria-live="polite">Available Now</Body16>
              </div>
            ) : (
              <Body16 className="text-xs text-rb-gray italic">Click to make yourself available</Body16>
            )}
          </button>

          <button
            onClick={() => setRoleState(profile?.role_state === 'requesting' ? 'offline' : 'requesting')}
            aria-label={profile?.role_state === 'requesting' ? 'You are currently looking for support. Click to cancel' : 'Request support and connect with an available listener'}
            aria-pressed={profile?.role_state === 'requesting'}
            className={`p-5 sm:p-6 rounded-xl text-left transition-all border-4 shadow-sm hover:shadow-md active:shadow-inner ${
              profile?.role_state === 'requesting'
                ? 'border-[#A855F7] bg-gradient-to-br from-purple-50 to-purple-25 shadow-md'
                : 'border-rb-gray bg-white hover:border-[#A855F7] active:border-[#A855F7]'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl" role="img" aria-label="Handshake">🤝</span>
              <Body18 className="font-bold text-[#2D3436]">I Need Support</Body18>
            </div>
            <Body16 className="text-rb-gray text-sm mb-3">Connect with someone who understands your journey</Body16>
            {profile?.role_state === 'requesting' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-full w-fit">
                <span className="w-2 h-2 bg-[#A855F7] rounded-full animate-pulse"></span>
                <Body16 className="text-sm text-[#A855F7] font-bold" aria-live="polite">Seeking Support</Body16>
              </div>
            ) : (
              <Body16 className="text-xs text-rb-gray italic">Click to find a listener</Body16>
            )}
          </button>
        </div>

        {/* Available Listeners */}
        <AvailableListeners />

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <div className="bg-gradient-to-br from-white to-rb-blue/5 rounded-2xl p-6 sm:p-8 shadow-lg mb-6 sm:mb-8 border border-rb-blue/20">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl" role="img" aria-label="Chat">💬</span>
              <Body18 className="font-bold text-[#2D3436]">Your Active Conversations</Body18>
            </div>
            <div className="space-y-3" role="list" aria-label="Active chat sessions">
              {activeSessions.map((session: any) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/chat/${session.id}`)}
                  aria-label={`Open chat with ${session.otherUserName}`}
                  role="listitem"
                  className="w-full p-5 bg-white rounded-xl text-left hover:shadow-md transition-all border-2 border-rb-blue/30 hover:border-rb-blue transform hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Body16 className="font-bold text-[#2D3436] mb-1">
                        <span role="img" aria-label="Chat">💬</span> {session.otherUserName}
                      </Body16>
                      <Body16 className="text-sm text-rb-gray">
                        Continue your conversation
                      </Body16>
                    </div>
                    <span className="text-rb-blue font-semibold">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bio Display */}
        {profile?.bio && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-rb-gray/10 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl" role="img" aria-label="Person">👤</span>
              <Body18 className="font-bold text-[#2D3436]">About You</Body18>
            </div>
            <Body16 className="text-rb-gray leading-relaxed">{profile.bio}</Body16>
          </div>
        )}

        {/* Footer */}
        <Footer />
      </div>
    </main>
  )
}
