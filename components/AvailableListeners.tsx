'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Body16, Body18 } from '@/components/ui/Typography'

interface Listener {
  id: string
  display_name: string
  bio: string
  avatar_url: string | null
  user_role: string
}

export default function AvailableListeners() {
  const [listeners, setListeners] = useState<Listener[]>([])
  const [loading, setLoading] = useState(true)
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
      const { data: { user } } = await supabase.auth.getUser()

      // Calculate timestamp for 2 minutes ago
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, bio, avatar_url, user_role, last_heartbeat_at')
        .eq('role_state', 'available')
        .neq('id', user?.id || '') // Exclude current user
        .gte('last_heartbeat_at', twoMinutesAgo) // Only show listeners with recent heartbeat

      if (error) throw error

      setListeners(data || [])
    } catch (error) {
      console.error('Error loading available listeners:', error)
    } finally {
      setLoading(false)
    }
  }

  function getBioSnippet(bio: string): string {
    if (!bio || bio.trim() === '') {
      return 'Available to listen'
    }
    return bio.length > 60 ? bio.substring(0, 60) + '...' : bio
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl" role="img" aria-label="Headphones">🎧</span>
          <Body18 className="font-semibold">Available Listeners</Body18>
        </div>
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

  if (listeners.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 shadow-sm mb-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl" role="img" aria-label="Headphones">🎧</span>
          <Body18 className="font-semibold text-[#2D3436]">Available Listeners</Body18>
        </div>
        <div className="text-center py-6">
          <span className="text-4xl mb-3 block" role="img" aria-label="Sleeping">😴</span>
          <Body16 className="text-rb-gray mb-2">No listeners available right now</Body16>
          <Body16 className="text-sm text-rb-gray">
            Check back in a few minutes, or set yourself as "Available to Listen" to help others!
          </Body16>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 shadow-sm mb-6 border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="Headphones">🎧</span>
          <Body18 className="font-semibold text-[#2D3436]">Available Listeners</Body18>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <Body16 className="text-sm text-green-700 font-semibold">
            {listeners.length} Online
          </Body16>
        </div>
      </div>

      <div className="space-y-3">
        {listeners.map((listener) => (
          <div
            key={listener.id}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-all hover:shadow-sm"
          >
            {/* Avatar */}
            {listener.avatar_url ? (
              <img
                src={listener.avatar_url}
                alt={listener.display_name}
                className="w-10 h-10 rounded-full object-cover border-2 border-blue-200 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {listener.display_name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Body16 className="font-semibold text-[#2D3436] truncate">
                {listener.display_name}
              </Body16>
              <Body16 className="text-sm text-rb-gray italic truncate">
                "{getBioSnippet(listener.bio)}"
              </Body16>
            </div>

            {/* Online indicator */}
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-blue-200">
        <Body16 className="text-sm text-rb-gray text-center">
          Click <strong>"I Need Support"</strong> above to connect with an available listener
        </Body16>
      </div>
    </div>
  )
}
