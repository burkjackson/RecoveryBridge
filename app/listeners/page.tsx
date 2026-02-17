'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { TIME } from '@/lib/constants'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import Modal from '@/components/Modal'
import { SkeletonListenerCard } from '@/components/Skeleton'
import Footer from '@/components/Footer'

interface Listener {
  id: string
  display_name: string
  avatar_url: string | null
  user_role: string | null
  bio: string | null
  tagline: string | null
  always_available: boolean
  last_heartbeat_at: string | null
}

export default function ListenersPage() {
  const [listeners, setListeners] = useState<Listener[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [blockModal, setBlockModal] = useState({ show: false, reason: '' })
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const [previewProfile, setPreviewProfile] = useState<Listener | null>(null)
  const [previewModal, setPreviewModal] = useState(false)
  const isConnecting = useRef(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadAvailableListeners()
  }, [])

  async function loadAvailableListeners() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, user_role, bio, tagline, always_available, last_heartbeat_at')
        .or('role_state.eq.available,always_available.eq.true')
        .neq('id', user.id)

      if (error) throw error

      // Filter to show only online listeners:
      // 1. Users with always_available enabled (stay online indefinitely), OR
      // 2. Users with recent heartbeat (within HEARTBEAT_THRESHOLD_MS, default 1 hour)
      const heartbeatThreshold = new Date(Date.now() - TIME.HEARTBEAT_THRESHOLD_MS).toISOString()
      const onlineListeners = (data || []).filter(listener => {
        if (listener.always_available) {
          return true
        }
        if (!listener.last_heartbeat_at) {
          return false
        }
        return listener.last_heartbeat_at >= heartbeatThreshold
      })

      setListeners(onlineListeners)
    } catch (error) {
      console.error('Error loading listeners:', error)
    } finally {
      setLoading(false)
    }
  }

  async function connectWithListener(listenerId: string) {
    if (isConnecting.current) return
    isConnecting.current = true
    setConnecting(listenerId)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if user is blocked
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

      // Create a new session
      const { data: session, error } = await supabase
        .from('sessions')
        .insert([
          {
            listener_id: listenerId,
            seeker_id: user.id,
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

  if (loading) {
    return (
      <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-rb-blue/5 via-rb-white to-rb-blue/10">
          <div className="max-w-4xl mx-auto">
            {/* Header skeleton */}
            <div className="mb-6 sm:mb-8">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-4" />
              <div className="h-8 bg-gray-200 rounded animate-pulse w-56 mb-2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-72" />
            </div>

            {/* Listener cards skeleton */}
            <div className="grid gap-4 sm:gap-6" role="status" aria-label="Loading available listeners">
              <SkeletonListenerCard />
              <SkeletonListenerCard />
              <SkeletonListenerCard />
            </div>
          </div>
        </main>
    )
  }

  return (
    <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-rb-blue/5 via-rb-white to-rb-blue/10">
      <div className="max-w-4xl mx-auto">
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 border border-rb-gray/10">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 min-h-[44px] py-2 text-sm text-rb-blue hover:text-rb-blue-hover font-semibold transition mb-4"
            >
              ← Back to Dashboard
            </button>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl" role="img" aria-label="Headphones">🎧</span>
              <Heading1 className="text-2xl sm:text-3xl">Available Listeners</Heading1>
            </div>
            <Body16 className="text-rb-gray italic">"Your story matters here"</Body16>
            <Body16 className="text-rb-gray mt-2">Connect with someone who's here to support you</Body16>
          </div>

          {listeners.length === 0 ? (
            <div className="bg-gradient-to-br from-white to-rb-blue/5 rounded-2xl p-8 sm:p-12 text-center shadow-lg border border-rb-blue/20">
              <span className="text-5xl mb-4 block" role="img" aria-label="Waiting">⏳</span>
              <Body18 className="mb-4 text-[#2D3436] font-bold">No listeners available right now</Body18>
              <Body16 className="text-rb-gray">
                Check back soon, or try setting yourself as available to support others!
              </Body16>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {listeners.map((listener) => (
                <div
                  key={listener.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 shadow-md hover:shadow-lg transition-all border-2 border-rb-blue/20 hover:border-rb-blue/40"
                >
                  <div className="flex gap-4 items-start">
                    {/* Avatar */}
                    {listener.avatar_url ? (
                      <img
                        src={listener.avatar_url}
                        alt={listener.display_name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 border-rb-blue flex-shrink-0 shadow-md"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border-3 border-rb-blue flex-shrink-0 shadow-md">
                        <span className="text-3xl sm:text-4xl" role="img" aria-label="User">👤</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Body18 className="font-bold text-[#2D3436]">{listener.display_name}</Body18>
                        <span className="w-2 h-2 bg-[#3B82F6] rounded-full animate-pulse" aria-label="Available"></span>
                      </div>
                      <div className="mb-2">
                        <Body16 className="text-sm text-rb-gray italic">
                          {listener.user_role === 'person_in_recovery' && 'Person in Recovery'}
                          {listener.user_role === 'professional' && 'Allies for Long-Term Recovery'}
                          {listener.user_role === 'ally' && 'Recovery Support (Legacy)'}
                        </Body16>
                      </div>
                      {listener.bio && (
                        <Body16 className="text-sm text-rb-gray leading-relaxed line-clamp-2">
                          {listener.bio}
                        </Body16>
                      )}
                      <button
                        onClick={() => {
                          setPreviewProfile(listener)
                          setPreviewModal(true)
                        }}
                        className="mt-2 text-sm text-rb-blue hover:text-rb-blue-hover font-medium transition underline underline-offset-2"
                      >
                        View Profile
                      </button>
                    </div>

                    {/* Connect Button */}
                    <button
                      onClick={() => connectWithListener(listener.id)}
                      disabled={connecting === listener.id}
                      aria-label={`Connect with ${listener.display_name}`}
                      className="min-h-[44px] px-5 sm:px-6 py-3 bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full font-semibold hover:shadow-lg disabled:opacity-50 transition-all transform hover:scale-105 whitespace-nowrap flex-shrink-0"
                    >
                      {connecting === listener.id ? (
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <Footer />

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
            We couldn't connect you with this listener right now.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
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

        {/* Profile Preview Modal */}
        <Modal
          isOpen={previewModal}
          onClose={() => setPreviewModal(false)}
          title={previewProfile ? `${previewProfile.display_name}'s Profile` : 'Profile'}
          confirmText="Connect"
          cancelText="Close"
          confirmStyle="primary"
          onConfirm={() => {
            setPreviewModal(false)
            if (previewProfile) connectWithListener(previewProfile.id)
          }}
        >
          {previewProfile && (
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex justify-center">
                {previewProfile.avatar_url ? (
                  <img
                    src={previewProfile.avatar_url}
                    alt={previewProfile.display_name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-rb-blue shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border-4 border-rb-blue shadow-lg">
                    <span className="text-5xl" role="img" aria-label="User">👤</span>
                  </div>
                )}
              </div>

              {/* Role */}
              {previewProfile.user_role && (
                <div className="text-center">
                  <Body16 className="text-sm text-rb-gray italic">
                    {previewProfile.user_role === 'person_in_recovery' && 'Person in Recovery'}
                    {previewProfile.user_role === 'professional' && 'Allies for Long-Term Recovery'}
                    {previewProfile.user_role === 'ally' && 'Recovery Support (Legacy)'}
                  </Body16>
                </div>
              )}

              {/* Tagline */}
              {previewProfile.tagline && (
                <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-rb-blue">
                  <Body16 className="text-gray-700 italic text-center">
                    &ldquo;{previewProfile.tagline}&rdquo;
                  </Body16>
                </div>
              )}

              {/* Bio */}
              {previewProfile.bio ? (
                <div>
                  <Body18 className="font-semibold text-gray-900 mb-2">About</Body18>
                  <Body16 className="text-gray-700 leading-relaxed">
                    {previewProfile.bio}
                  </Body16>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Body16 className="text-gray-500 italic">
                    {previewProfile.display_name} hasn&apos;t added a bio yet.
                  </Body16>
                </div>
              )}
            </div>
          )}
        </Modal>
    </main>
  )
}
