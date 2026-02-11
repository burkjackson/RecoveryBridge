'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Body16, Body18 } from '@/components/ui/Typography'
import ErrorState from '@/components/ErrorState'
import { TIME } from '@/lib/constants'

interface Listener {
  id: string
  display_name: string
  bio: string
  tagline: string | null
  avatar_url: string | null
  user_role: string
}

export default function AvailableListeners() {
  const [listeners, setListeners] = useState<Listener[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
          table: 'profiles',
          filter: 'role_state=eq.available'
        },
        () => {
          console.log('🔔 Available listeners updated')
          loadAvailableListeners()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadAvailableListeners() {
    try {
      setError(null) // Clear any previous errors
      const { data: { user } } = await supabase.auth.getUser()

      // Calculate timestamp for heartbeat threshold
      const heartbeatThreshold = new Date(Date.now() - TIME.HEARTBEAT_THRESHOLD_MS).toISOString()

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, bio, tagline, avatar_url, user_role, last_heartbeat_at')
        .eq('role_state', 'available')
        .neq('id', user?.id || '') // Exclude current user
        .not('last_heartbeat_at', 'is', null) // Exclude profiles without heartbeat
        .gte('last_heartbeat_at', heartbeatThreshold) // Only show listeners with recent heartbeat

      if (error) throw error

      setListeners(data || [])
    } catch (err) {
      console.error('Error loading available listeners:', err)
      setError('We couldn\'t load available listeners right now. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function getDisplayMessage(tagline: string | null, bio: string): string {
    // Use tagline if available
    if (tagline && tagline.trim()) {
      return tagline
    }
    // Fall back to bio excerpt
    if (!bio || bio.trim() === '') {
      return 'Available to listen'
    }
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
          <div
            key={listener.id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
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
              <Body16 className="font-semibold text-gray-900 truncate">
                {listener.display_name}
              </Body16>
              <Body16 className="text-sm text-gray-600 truncate">
                {getDisplayMessage(listener.tagline, listener.bio)}
              </Body16>
            </div>

            {/* Online indicator */}
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <Body16 className="text-sm text-gray-600 text-center">
          Click <strong>"I Need Support"</strong> above to connect with an available listener
        </Body16>
      </div>
    </div>
  )
}
