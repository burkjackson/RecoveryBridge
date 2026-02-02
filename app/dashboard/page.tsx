'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import { SkeletonRoleCard } from '@/components/Skeleton'
import ErrorState from '@/components/ErrorState'
import Footer from '@/components/Footer'

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

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function setRoleState(newState: string) {
    if (!profile) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role_state: newState })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, role_state: newState })

      // If requesting support, navigate to listeners page
      if (newState === 'requesting') {
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
        <div className="mb-6 sm:mb-8">
          <div className="flex gap-4 items-start mb-4">
            {/* Avatar */}
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-rb-blue flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <Heading1 className="text-xl sm:text-2xl md:text-3xl break-words">Welcome back, {profile?.display_name}!</Heading1>
              <Body16 className="mt-1 sm:mt-2">Your RecoveryBridge Dashboard</Body16>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-4 min-h-[44px] min-w-[44px] px-4 py-3 text-sm bg-rb-blue text-white rounded-full hover:bg-rb-blue-hover transition whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="inline-block min-h-[44px] py-3 text-sm text-rb-blue hover:text-rb-blue-hover transition"
          >
            View Profile →
          </button>
        </div>

        {/* Role Display */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
          <Body18 className="mb-2">Your Role</Body18>
          <Body16>
            {profile?.user_role === 'person_in_recovery' && 'People in Recovery'}
            {profile?.user_role === 'professional' && 'Allies in Long-Term Recovery'}
            {profile?.user_role === 'ally' && 'Recovery Support'}
            {!profile?.user_role && 'Not set'}
          </Body16>
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
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8" role="group" aria-label="Choose your current role">
          <button
            onClick={() => setRoleState(profile?.role_state === 'available' ? 'offline' : 'available')}
            aria-label={profile?.role_state === 'available' ? 'You are currently available to listen. Click to go offline' : 'Make yourself available to listen and support others'}
            aria-pressed={profile?.role_state === 'available'}
            className={`p-6 sm:p-8 rounded-xl sm:rounded-2xl text-left transition border-2 ${
              profile?.role_state === 'available'
                ? 'border-rb-blue bg-[#E8E4F0]'
                : 'border-rb-blue bg-white hover:bg-[#F8F9FA]'
            }`}
          >
            <Body18 className="mb-2"><span aria-hidden="true">🎧</span> I'm Here To Listen</Body18>
            <Body16>Make yourself available to support others</Body16>
            {profile?.role_state === 'available' && (
              <Body16 className="mt-4 text-sm text-rb-blue font-semibold" aria-live="polite">● You're available</Body16>
            )}
          </button>

          <button
            onClick={() => setRoleState(profile?.role_state === 'requesting' ? 'offline' : 'requesting')}
            aria-label={profile?.role_state === 'requesting' ? 'You are currently looking for support. Click to cancel' : 'Request support and connect with an available listener'}
            aria-pressed={profile?.role_state === 'requesting'}
            className={`p-6 sm:p-8 rounded-xl sm:rounded-2xl text-left transition border-2 ${
              profile?.role_state === 'requesting'
                ? 'border-[#B8A9C9] bg-[#E8E4F0]'
                : 'border-[#B8A9C9] bg-white hover:bg-[#F8F9FA]'
            }`}
          >
            <Body18 className="mb-2"><span aria-hidden="true">🤝</span> I Need Support</Body18>
            <Body16>Connect with an available listener</Body16>
            {profile?.role_state === 'requesting' && (
              <Body16 className="mt-4 text-sm text-[#B8A9C9] font-semibold" aria-live="polite">● Looking for support</Body16>
            )}
          </button>
        </div>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8">
            <Body18 className="mb-4"><span aria-hidden="true">💬</span> Active Chats</Body18>
            <div className="space-y-3" role="list" aria-label="Active chat sessions">
              {activeSessions.map((session: any) => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/chat/${session.id}`)}
                  aria-label={`Open chat with ${session.otherUserName}`}
                  role="listitem"
                  className="w-full p-4 bg-[#E8E4F0] rounded-lg text-left hover:bg-[#D6E5F3] transition border-2 border-rb-blue"
                >
                  <Body16 className="font-semibold text-[#2D3436]">
                    <span aria-hidden="true">💬</span> Chat with {session.otherUserName}
                  </Body16>
                  <Body16 className="text-sm text-rb-gray">
                    Click to open chat →
                  </Body16>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bio Display */}
        {profile?.bio && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
            <Body18 className="mb-2">About You</Body18>
            <Body16>{profile.bio}</Body16>
          </div>
        )}

        {/* Footer */}
        <Footer />
      </div>
    </main>
  )
}
