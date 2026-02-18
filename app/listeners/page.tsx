'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { TIME, SPECIALTY_TAGS } from '@/lib/constants'
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
  tags: string[] | null
  always_available: boolean
  last_heartbeat_at: string | null
  helpful_count?: number
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

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [currentUserTags, setCurrentUserTags] = useState<string[] | null>(null)

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

      // Load current user's tags for "recommended" matching
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('tags')
        .eq('id', user.id)
        .single()

      if (myProfile) {
        setCurrentUserTags(myProfile.tags)
      }

      // Load available listeners with tags
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, user_role, bio, tagline, tags, always_available, last_heartbeat_at')
        .or('role_state.eq.available,always_available.eq.true')
        .neq('id', user.id)
        .limit(100)

      if (error) throw error

      const heartbeatThreshold = new Date(Date.now() - TIME.HEARTBEAT_THRESHOLD_MS).toISOString()
      const onlineListeners = (data || []).filter(listener => {
        if (listener.always_available) return true
        if (!listener.last_heartbeat_at) return false
        return listener.last_heartbeat_at >= heartbeatThreshold
      })

      // Load helpful counts for these listeners
      const listenerIds = onlineListeners.map(l => l.id)
      if (listenerIds.length > 0) {
        const { data: feedback } = await supabase
          .from('session_feedback')
          .select('to_user_id, helpful')
          .in('to_user_id', listenerIds)
          .eq('helpful', true)

        const helpfulCounts = new Map<string, number>()
        feedback?.forEach(f => {
          helpfulCounts.set(f.to_user_id, (helpfulCounts.get(f.to_user_id) || 0) + 1)
        })

        const listenersWithCounts = onlineListeners.map(l => ({
          ...l,
          helpful_count: helpfulCounts.get(l.id) || 0,
        }))

        setListeners(listenersWithCounts)
      } else {
        setListeners(onlineListeners)
      }
    } catch (error) {
      console.error('Error loading listeners:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort listeners
  const filteredListeners = useMemo(() => {
    let result = [...listeners]

    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(l =>
        l.display_name.toLowerCase().includes(query) ||
        l.bio?.toLowerCase().includes(query) ||
        l.tagline?.toLowerCase().includes(query) ||
        l.tags?.some(t => t.toLowerCase().includes(query))
      )
    }

    // Tag filter
    if (selectedTags.length > 0) {
      result = result.filter(l =>
        l.tags && selectedTags.some(tag => l.tags!.includes(tag))
      )
    }

    // Sort: listeners with matching tags first, then by helpful count
    result.sort((a, b) => {
      // Tag match score (how many of your tags match theirs)
      const aTagMatch = currentUserTags && a.tags
        ? a.tags.filter(t => currentUserTags.includes(t)).length
        : 0
      const bTagMatch = currentUserTags && b.tags
        ? b.tags.filter(t => currentUserTags.includes(t)).length
        : 0

      if (aTagMatch !== bTagMatch) return bTagMatch - aTagMatch

      // Then by helpful count
      return (b.helpful_count || 0) - (a.helpful_count || 0)
    })

    return result
  }, [listeners, searchQuery, selectedTags, currentUserTags])

  function toggleTagFilter(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
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

  // Check which tags are present among current online listeners
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    listeners.forEach(l => l.tags?.forEach(t => tagSet.add(t)))
    return SPECIALTY_TAGS.filter(t => tagSet.has(t))
  }, [listeners])

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
            <Body16 className="text-rb-gray italic">&ldquo;Your story matters here&rdquo;</Body16>
            <Body16 className="text-rb-gray mt-2">Connect with someone who&apos;s here to support you</Body16>
          </div>

          {/* Search & Filter Bar */}
          {listeners.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-4 sm:p-5 mb-4 sm:mb-6 border border-rb-gray/10">
              <div className="flex gap-3 items-center">
                {/* Search input */}
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, bio, or topic..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all"
                  />
                </div>
                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    showFilters || selectedTags.length > 0
                      ? 'bg-rb-blue text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-expanded={showFilters}
                  aria-label="Toggle tag filters"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filter
                  {selectedTags.length > 0 && (
                    <span className="bg-white/20 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {selectedTags.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tag filters */}
              {showFilters && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Body16 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter by topic</Body16>
                  {availableTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTagFilter(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            selectedTags.includes(tag)
                              ? 'bg-rb-blue text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          aria-pressed={selectedTags.includes(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                      {selectedTags.length > 0 && (
                        <button
                          onClick={() => setSelectedTags([])}
                          className="px-3 py-1.5 rounded-full text-xs font-medium text-red-600 hover:bg-red-50 transition-all"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  ) : (
                    <Body16 className="text-sm text-gray-400 italic">No listeners have set specialty tags yet</Body16>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Results count */}
          {listeners.length > 0 && (searchQuery || selectedTags.length > 0) && (
            <Body16 className="text-sm text-rb-gray mb-3">
              Showing {filteredListeners.length} of {listeners.length} listener{listeners.length !== 1 ? 's' : ''}
            </Body16>
          )}

          {listeners.length === 0 ? (
            <div className="bg-gradient-to-br from-white to-rb-blue/5 rounded-2xl p-8 sm:p-12 text-center shadow-lg border border-rb-blue/20">
              <span className="text-5xl mb-4 block" role="img" aria-label="Waiting">⏳</span>
              <Body18 className="mb-4 text-[#2D3436] font-bold">No listeners available right now</Body18>
              <Body16 className="text-rb-gray">
                Check back soon, or try setting yourself as available to support others!
              </Body16>
            </div>
          ) : filteredListeners.length === 0 ? (
            <div className="bg-gradient-to-br from-white to-rb-blue/5 rounded-2xl p-8 sm:p-12 text-center shadow-lg border border-rb-blue/20">
              <span className="text-5xl mb-4 block" role="img" aria-label="Search">🔍</span>
              <Body18 className="mb-4 text-[#2D3436] font-bold">No listeners match your filters</Body18>
              <Body16 className="text-rb-gray mb-4">
                Try adjusting your search or removing some filters.
              </Body16>
              <button
                onClick={() => { setSearchQuery(''); setSelectedTags([]) }}
                className="px-5 py-2.5 bg-rb-blue text-white rounded-full text-sm font-semibold hover:shadow-lg transition-all"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {filteredListeners.map((listener) => {
                const tagMatchCount = currentUserTags && listener.tags
                  ? listener.tags.filter(t => currentUserTags.includes(t)).length
                  : 0

                return (
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
                          {tagMatchCount > 0 && (
                            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              {tagMatchCount} match{tagMatchCount !== 1 ? 'es' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Body16 className="text-sm text-rb-gray italic">
                            {listener.user_role === 'person_in_recovery' && 'Person in Recovery'}
                            {listener.user_role === 'professional' && 'Allies for Long-Term Recovery'}
                            {listener.user_role === 'ally' && 'Recovery Support (Legacy)'}
                          </Body16>
                          {(listener.helpful_count || 0) > 0 && (
                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                              👍 {listener.helpful_count} helpful
                            </span>
                          )}
                        </div>
                        {listener.bio && (
                          <Body16 className="text-sm text-rb-gray leading-relaxed line-clamp-2">
                            {listener.bio}
                          </Body16>
                        )}
                        {/* Tags */}
                        {listener.tags && listener.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {listener.tags.map(tag => (
                              <span
                                key={tag}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  currentUserTags?.includes(tag)
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
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
                )
              })}
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
            We couldn&apos;t connect you with this listener right now.
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

              {/* Role & helpful count */}
              <div className="text-center space-y-1">
                {previewProfile.user_role && (
                  <Body16 className="text-sm text-rb-gray italic">
                    {previewProfile.user_role === 'person_in_recovery' && 'Person in Recovery'}
                    {previewProfile.user_role === 'professional' && 'Allies for Long-Term Recovery'}
                    {previewProfile.user_role === 'ally' && 'Recovery Support (Legacy)'}
                  </Body16>
                )}
                {(previewProfile.helpful_count || 0) > 0 && (
                  <Body16 className="text-sm text-amber-700">
                    👍 Rated helpful {previewProfile.helpful_count} time{previewProfile.helpful_count !== 1 ? 's' : ''}
                  </Body16>
                )}
              </div>

              {/* Tagline */}
              {previewProfile.tagline && (
                <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-rb-blue">
                  <Body16 className="text-gray-700 italic text-center">
                    &ldquo;{previewProfile.tagline}&rdquo;
                  </Body16>
                </div>
              )}

              {/* Tags */}
              {previewProfile.tags && previewProfile.tags.length > 0 && (
                <div>
                  <Body16 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Topics</Body16>
                  <div className="flex flex-wrap gap-1.5">
                    {previewProfile.tags.map(tag => (
                      <span
                        key={tag}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          currentUserTags?.includes(tag)
                            ? 'bg-green-100 text-green-700'
                            : 'bg-rb-blue/10 text-rb-blue'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
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
