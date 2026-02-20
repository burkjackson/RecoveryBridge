'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Body16, Body18 } from '@/components/ui/Typography'
import ErrorState from '@/components/ErrorState'
import Modal from '@/components/Modal'
import { TIME } from '@/lib/constants'

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
}

export default function AvailableListeners({ onCountChange, currentUserId }: AvailableListenersProps) {
  const [listeners, setListeners] = useState<Listener[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profilePreview, setProfilePreview] = useState<Listener | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [hasSharedSession, setHasSharedSession] = useState<Set<string>>(new Set())
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null)
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
      let sharedIds = new Set<string>()

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

  function getDisplayMessage(tagline: string | null, bio: string | null): string {
    if (tagline && tagline.trim()) return tagline
    if (!bio || bio.trim() === '') return 'Available to listen'
    return bio.length > 60 ? bio.substring(0, 60) + '...' : bio
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
        <Body18 className="font-semibold text-gray-900 mb-4">Available Listeners</Body18>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
        <Body18 className="font-semibold text-gray-900 mb-4">Available Listeners</Body18>
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

  if (listeners.length === 0) {
    return (
      <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
        <Body18 className="font-semibold text-gray-900 mb-3">Available Listeners</Body18>
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <Body16 className="text-gray-600 mb-2">No listeners available right now</Body16>
          <Body16 className="text-sm text-gray-500">
            Check back in a few minutes, or set yourself as "Available to Listen" to help others!
          </Body16>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <Body18 className="font-semibold text-gray-900">Available Listeners</Body18>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <Body16 className="text-sm text-green-700 font-semibold">
            {listeners.length} Online
          </Body16>
        </div>
      </div>

      <div className="space-y-2">
        {listeners.map((listener) => (
          <button
            key={listener.id}
            onClick={() => setProfilePreview(listener)}
            aria-label={`View ${listener.display_name}'s profile`}
            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all text-left"
          >
            {/* Avatar */}
            {listener.avatar_url ? (
              <img
                src={listener.avatar_url}
                alt={listener.display_name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-rb-blue flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {listener.display_name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Body16 className="font-semibold text-gray-900 truncate">
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
              <Body16 className="text-sm text-gray-600 truncate">
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
                    <span className="text-[10px] text-gray-400">+{listener.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>

            {/* Online indicator */}
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <Body16 className="text-sm text-gray-600 text-center">
          Click <strong>"I Need Support"</strong> above to connect with an available listener
        </Body16>
      </div>

      {/* Profile Preview Modal */}
      {profilePreview && (
        <Modal
          isOpen={!!profilePreview}
          onClose={() => setProfilePreview(null)}
          title={profilePreview.display_name}
          confirmText="Close"
          confirmStyle="primary"
        >
          <div className="space-y-4">
            {/* Avatar + status */}
            <div className="flex items-center gap-3">
              {profilePreview.avatar_url ? (
                <img
                  src={profilePreview.avatar_url}
                  alt={profilePreview.display_name}
                  className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-rb-blue flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {profilePreview.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                {profilePreview.tagline && (
                  <p className="text-sm italic text-gray-600">"{profilePreview.tagline}"</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs text-green-600 font-medium">
                    Available to listen{profilePreview.always_available ? ' · Always Available ⚡' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio */}
            {profilePreview.bio && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">About</p>
                <p className="text-sm text-gray-700">{profilePreview.bio}</p>
              </div>
            )}

            {/* Tags */}
            {profilePreview.tags && profilePreview.tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Specialties</p>
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
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(profilePreview.id)
                  }}
                  disabled={togglingFavorite === profilePreview.id}
                  className={`min-h-[44px] w-full px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    favoriteIds.has(profilePreview.id)
                      ? 'bg-amber-50 border-2 border-amber-200 text-amber-800 hover:bg-amber-100'
                      : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:bg-gray-100'
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
    </div>
  )
}
