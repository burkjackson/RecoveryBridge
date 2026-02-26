'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * /connect?seekerId=XXX
 *
 * Landing page for notification taps. The listener taps the push notification
 * which opens this page. It automatically:
 *   1. Verifies the listener is authenticated
 *   2. Checks if the seeker still needs support (role_state = 'requesting')
 *   3. Checks for an existing active session between these two users
 *   4. Creates a session if needed and redirects to /chat/[id]
 *
 * If anything goes wrong it redirects to /dashboard with a message.
 */

function ConnectInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const seekerId = searchParams.get('seekerId')
  const [status, setStatus] = useState('Connecting you...')

  useEffect(() => {
    if (!seekerId) {
      router.replace('/dashboard')
      return
    }
    handleConnect()
  }, [seekerId])

  async function handleConnect() {
    const supabase = createClient()

    // Must be authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }

    // Can't connect with yourself
    if (user.id === seekerId) {
      router.replace('/dashboard')
      return
    }

    // Check if listener is blocked
    const { data: blockCheck } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (blockCheck) {
      router.replace('/dashboard')
      return
    }

    // Check if there's already an active session between these two users
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('listener_id', user.id)
      .eq('seeker_id', seekerId)
      .eq('status', 'active')
      .maybeSingle()

    if (existingSession) {
      router.replace(`/chat/${existingSession.id}`)
      return
    }

    // Check if the seeker is still requesting support
    const { data: seeker } = await supabase
      .from('profiles')
      .select('id, display_name, role_state')
      .eq('id', seekerId)
      .maybeSingle()

    if (!seeker || seeker.role_state !== 'requesting') {
      setStatus('This person has already found support.')
      setTimeout(() => router.replace('/dashboard'), 2000)
      return
    }

    setStatus(`Connecting you with ${seeker.display_name}...`)

    // Create the session
    const { data: session, error } = await supabase
      .from('sessions')
      .insert([{ listener_id: user.id, seeker_id: seekerId, status: 'active' }])
      .select()
      .single()

    if (error || !session) {
      // Session may have just been created by another listener — check again
      const { data: raceSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('seeker_id', seekerId)
        .eq('status', 'active')
        .maybeSingle()

      if (raceSession) {
        // Another listener got there first
        setStatus('Someone else just connected with this person.')
        setTimeout(() => router.replace('/dashboard'), 2000)
        return
      }

      setStatus('Something went wrong. Returning to dashboard...')
      setTimeout(() => router.replace('/dashboard'), 2000)
      return
    }

    router.replace(`/chat/${session.id}`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="text-center p-8">
        <div className="w-12 h-12 border-4 border-rb-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-rb-gray font-medium">{status}</p>
      </div>
    </main>
  )
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center p-8">
          <div className="w-12 h-12 border-4 border-rb-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-rb-gray font-medium">Connecting you...</p>
        </div>
      </main>
    }>
      <ConnectInner />
    </Suspense>
  )
}
