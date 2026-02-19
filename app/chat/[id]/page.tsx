'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import Modal from '@/components/Modal'
import { SkeletonChatMessage } from '@/components/Skeleton'
import ErrorState from '@/components/ErrorState'
import { PrivacyBadge } from '@/components/Footer'
import { TIME, VALIDATION, CONVERSATION_STARTERS, REACTIONS } from '@/lib/constants'
import type { ChatMessage as Message, Session, MessageReaction as Reaction } from '@/lib/types/database'

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [otherUserName, setOtherUserName] = useState('')
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  // Modal states
  const [blockModal, setBlockModal] = useState({ show: false, reason: '' })
  const [reportSuccessModal, setReportSuccessModal] = useState(false)
  const [reportErrorModal, setReportErrorModal] = useState(false)
  const [inactivityModal, setInactivityModal] = useState(false)
  const [profileModal, setProfileModal] = useState(false)
  const [feedbackModal, setFeedbackModal] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  // Favorites
  const [favoriteStep, setFavoriteStep] = useState(false)
  const [favoriteAdded, setFavoriteAdded] = useState(false)
  const [favoriteSaving, setFavoriteSaving] = useState(false)
  const [alreadyFavorited, setAlreadyFavorited] = useState(false)

  // Report flow modal state
  const [reportModal, setReportModal] = useState(false)
  const [reportStep, setReportStep] = useState<'reason' | 'details' | 'confirm'>('reason')
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')

  // End session confirmation
  const [endSessionConfirmModal, setEndSessionConfirmModal] = useState(false)

  // Error states
  const [sendError, setSendError] = useState(false)
  const [endSessionError, setEndSessionError] = useState(false)

  // Track when the OTHER user ends the session
  const [sessionEndedByOther, setSessionEndedByOther] = useState(false)
  const isEndingSession = useRef(false) // true when THIS user triggered endSession

  // Inactivity tracking
  const [lastActivityTime, setLastActivityTime] = useState(Date.now())
  const inactivityWarningTime = TIME.INACTIVITY_WARNING_MS
  const autoCloseTime = TIME.INACTIVITY_AUTO_CLOSE_MS

  // --- V2: Typing indicators ---
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSentRef = useRef(0)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // --- V2: Reactions ---
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null)

  // Track which messages we've already sent read receipts for to avoid re-render loops
  const markedAsReadRef = useRef<Set<string>>(new Set())

  // Track message count so scrollToBottom only fires on new messages (not read_at updates)
  const prevMessageCountRef = useRef(0)

  useEffect(() => {
    params.then(({ id }) => setSessionId(id))
  }, [params])

  useEffect(() => {
    if (sessionId) {
      loadSession()
    }
  }, [sessionId])

  useEffect(() => {
    if (session && currentUserId) {
      loadMessages()
      loadReactions()
      const cleanup = subscribeToMessages()
      return cleanup
    }
  }, [session, currentUserId])

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      scrollToBottom()
    }
    prevMessageCountRef.current = messages.length
  }, [messages])

  // Mark received messages as read when they appear
  useEffect(() => {
    if (messages.length > 0 && currentUserId && session?.status === 'active') {
      markMessagesAsRead()
    }
  }, [messages, currentUserId])

  // Close reaction picker when tapping outside
  useEffect(() => {
    if (!reactionPickerMessageId) return
    function handleClick() { setReactionPickerMessageId(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [reactionPickerMessageId])

  // Define callbacks BEFORE useEffects that use them
  const endSessionDueToInactivity = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (error) throw error
      setInactivityModal(false)
      setFeedbackModal(true)
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }, [sessionId, router, supabase])

  const dismissInactivityWarning = useCallback(() => {
    setInactivityModal(false)
    setLastActivityTime(Date.now()) // Reset timer
  }, [])

  // Inactivity warning and auto-close
  useEffect(() => {
    if (!session || session.status !== 'active') return

    const checkInactivity = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityTime

      // Show warning after 15 minutes of inactivity
      if (timeSinceLastActivity >= inactivityWarningTime && !inactivityModal) {
        setInactivityModal(true)
      }

      // Auto-close after 20 minutes total (15 min + 5 min warning)
      if (timeSinceLastActivity >= inactivityWarningTime + autoCloseTime) {
        endSessionDueToInactivity()
      }
    }, TIME.INACTIVITY_CHECK_INTERVAL_MS)

    return () => clearInterval(checkInactivity)
  }, [session, lastActivityTime, inactivityModal, inactivityWarningTime, autoCloseTime, endSessionDueToInactivity])

  // Update activity on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setLastActivityTime(Date.now())
      setInactivityModal(false) // Dismiss warning if they sent a message
    }
  }, [messages])

  async function loadSession() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      // Check if user is blocked
      const { data: blockCheck } = await supabase
        .from('user_blocks')
        .select('id, reason')
        .eq('user_id', user.id)
        .maybeSingle()

      if (blockCheck) {
        setBlockModal({ show: true, reason: blockCheck.reason })
        return
      }

      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) throw error
      setSession(sessionData)

      // Get other user's name
      const otherUserId = sessionData.listener_id === user.id
        ? sessionData.seeker_id
        : sessionData.listener_id

      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, bio, user_role, avatar_url, tagline')
        .eq('id', otherUserId)
        .single()

      if (profileData) {
        setOtherUserName(profileData.display_name)
        setOtherUserProfile(profileData)
      }

      // Check if this person is already a favorite
      const { data: existingFav } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('favorite_user_id', otherUserId)
        .maybeSingle()
      if (existingFav) setAlreadyFavorited(true)
    } catch (error) {
      console.error('Error loading session:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages() {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
      // Seed inactivity timer from last message timestamp so opening an
      // existing chat doesn't trigger a premature inactivity warning
      if (data && data.length > 0) {
        const lastMsg = data[data.length - 1]
        setLastActivityTime(new Date(lastMsg.created_at).getTime())
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  // --- V2: Load reactions for this session's messages ---
  async function loadReactions() {
    try {
      // Get all message IDs for this session, then load their reactions
      const { data: msgs } = await supabase
        .from('messages')
        .select('id')
        .eq('session_id', sessionId)

      if (!msgs || msgs.length === 0) return

      const messageIds = msgs.map((m) => m.id)
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds)

      if (error) throw error
      setReactions(data || [])
    } catch (error) {
      console.error('Error loading reactions:', error)
    }
  }

  // --- V2: Mark unread received messages as read ---
  async function markMessagesAsRead() {
    const unreadFromOther = messages.filter(
      (m) => m.sender_id !== currentUserId && !m.read_at && !markedAsReadRef.current.has(m.id)
    )
    if (unreadFromOther.length === 0) return

    const now = new Date().toISOString()
    const ids = unreadFromOther.map((m) => m.id)

    // Mark in ref immediately to prevent duplicate calls
    ids.forEach((id) => markedAsReadRef.current.add(id))

    try {
      await supabase
        .from('messages')
        .update({ read_at: now })
        .in('id', ids)

      // Update local state immediately
      setMessages((prev) =>
        prev.map((m) =>
          ids.includes(m.id) ? { ...m, read_at: now } : m
        )
      )

      // Broadcast read event so sender sees checkmarks update instantly
      channelRef.current?.send({
        type: 'broadcast',
        event: 'read',
        payload: { reader_id: currentUserId, message_ids: ids },
      })
    } catch (error) {
      console.error('Error marking messages as read:', error)
      // Remove from ref on failure so they can be retried
      ids.forEach((id) => markedAsReadRef.current.delete(id))
    }
  }

  function subscribeToMessages() {
    const channel = supabase
      .channel(`session-and-messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newMsg = payload.new as Record<string, unknown>
          if (newMsg.id && newMsg.sender_id && newMsg.content && newMsg.created_at) {
            setMessages((current) => {
              // Deduplicate: skip if message already exists
              if (current.some((m) => m.id === newMsg.id)) return current
              return [...current, newMsg as unknown as Message]
            })
            // Clear typing indicator when a message arrives from the other user
            if (newMsg.sender_id !== currentUserId) {
              setIsOtherTyping(false)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const updatedSession = payload.new as Record<string, unknown>
          if (updatedSession.id && updatedSession.listener_id && updatedSession.seeker_id && updatedSession.status) {
            const typedSession = updatedSession as unknown as Session
            setSession(typedSession)
            // If this user didn't trigger the end, the other party ended the session
            if (typedSession.status === 'ended' && !isEndingSession.current) {
              setSessionEndedByOther(true)
              setFeedbackModal(true)
            }
          }
        }
      )
      // --- V2: Reactions realtime (filtered + deduplicated) ---
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new as unknown as Reaction
            // Only add if it belongs to a message in this session and isn't a duplicate
            setMessages((currentMsgs) => {
              if (currentMsgs.some((m) => m.id === newReaction.message_id)) {
                setReactions((prev) => {
                  if (prev.some((r) => r.id === newReaction.id)) return prev
                  return [...prev, newReaction]
                })
              }
              return currentMsgs // don't modify messages
            })
          } else if (payload.eventType === 'DELETE') {
            const oldReaction = payload.old as { id?: string }
            if (oldReaction.id) {
              setReactions((prev) => prev.filter((r) => r.id !== oldReaction.id))
            }
          }
        }
      )
      // --- V2: Typing indicator broadcast ---
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as { user_id?: string }
        if (data.user_id && data.user_id !== currentUserId) {
          setIsOtherTyping(true)
          // Clear after timeout
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false)
          }, TIME.TYPING_TIMEOUT_MS)
        }
      })
      // --- V2: Read receipt broadcast ---
      .on('broadcast', { event: 'read' }, (payload) => {
        const data = payload.payload as { reader_id?: string; message_ids?: string[] }
        if (data.reader_id && data.reader_id !== currentUserId && data.message_ids) {
          const now = new Date().toISOString()
          setMessages((prev) =>
            prev.map((m) =>
              data.message_ids!.includes(m.id) ? { ...m, read_at: now } : m
            )
          )
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      supabase.removeChannel(channel)
    }
  }

  // --- V2: Broadcast typing event (throttled) ---
  function broadcastTyping() {
    const now = Date.now()
    if (now - lastTypingSentRef.current < TIME.TYPING_THROTTLE_MS) return
    lastTypingSentRef.current = now

    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUserId },
    })
  }

  // --- V2: Toggle reaction on a message ---
  async function toggleReaction(messageId: string, reactionKey: string) {
    if (!currentUserId) return

    const existing = reactions.find(
      (r) => r.message_id === messageId && r.user_id === currentUserId && r.reaction === reactionKey
    )

    try {
      if (existing) {
        await supabase.from('message_reactions').delete().eq('id', existing.id)
        setReactions((prev) => prev.filter((r) => r.id !== existing.id))
      } else {
        const { data, error } = await supabase
          .from('message_reactions')
          .insert({ message_id: messageId, user_id: currentUserId, reaction: reactionKey })
          .select()
          .single()

        if (error) throw error
        if (data) setReactions((prev) => {
          if (prev.some((r) => r.id === (data as Reaction).id)) return prev
          return [...prev, data as Reaction]
        })
      }
    } catch (error) {
      console.error('Error toggling reaction:', error)
    }

    setReactionPickerMessageId(null)
  }

  // --- V2: Session duration helper ---
  function getSessionDuration(): string {
    if (!session) return ''
    const start = new Date(session.created_at).getTime()
    const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now()
    const diffMs = end - start
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'Less than a minute'
    if (mins === 1) return '1 minute'
    if (mins < 60) return `${mins} minutes`
    const hrs = Math.floor(mins / 60)
    const remainMins = mins % 60
    return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newMessage.trim()
    if (!trimmed || !currentUserId || sending) return
    if (trimmed.length > VALIDATION.MAX_MESSAGE_LENGTH) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            session_id: sessionId,
            sender_id: currentUserId,
            content: trimmed
          }
        ])

      if (error) throw error
      setNewMessage('')
      setSendError(false) // Clear any previous errors
      setLastActivityTime(Date.now()) // Reset inactivity timer
      setInactivityModal(false) // Dismiss warning if showing
    } catch (error: any) {
      console.error('Error sending message:', error)
      setSendError(true)
    } finally {
      setSending(false)
    }
  }

  async function sendStarter(text: string) {
    if (!currentUserId || sending) return
    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{ session_id: sessionId, sender_id: currentUserId, content: text }])
      if (error) throw error
      setLastActivityTime(Date.now())
    } catch (error: any) {
      console.error('Error sending starter:', error)
      setSendError(true)
    } finally {
      setSending(false)
    }
  }

  async function endSession() {
    setEndSessionConfirmModal(false)
    try {
      isEndingSession.current = true // Mark that THIS user is ending the session
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (error) throw error
      setFeedbackModal(true)
    } catch (error) {
      console.error('Error ending session:', error)
      isEndingSession.current = false
      setEndSessionError(true)
    }
  }

  async function submitFeedback(helpful: boolean) {
    if (!session || !currentUserId) return
    setFeedbackSubmitted(true)

    const otherUserId = currentUserId === session.listener_id ? session.seeker_id : session.listener_id

    try {
      await supabase.from('session_feedback').insert({
        session_id: session.id,
        from_user_id: currentUserId,
        to_user_id: otherUserId,
        helpful,
      })
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }

    // Show thank-you briefly, then transition to favorite prompt
    setTimeout(() => {
      setFeedbackSubmitted(false)
      setFavoriteStep(true)
    }, 1200)
  }

  async function addFavorite() {
    if (!session || !currentUserId || favoriteSaving) return
    setFavoriteSaving(true)
    const otherUserId = currentUserId === session.listener_id ? session.seeker_id : session.listener_id
    setFavoriteAdded(true) // optimistic
    try {
      await supabase.from('user_favorites').insert({
        user_id: currentUserId,
        favorite_user_id: otherUserId,
      })
    } catch {
      setFavoriteAdded(false) // roll back on error
    } finally {
      setFavoriteSaving(false)
      setTimeout(() => router.push('/dashboard'), 800)
    }
  }

  function skipFeedback() {
    setFeedbackModal(false)
    router.push('/dashboard')
  }

  const REPORT_REASONS = [
    'Inappropriate behavior',
    'Harassment or bullying',
    'Spam or scam',
    'Sharing harmful content',
    'Other safety concern'
  ]

  function openReportModal() {
    setReportReason('')
    setReportDetails('')
    setReportStep('reason')
    setReportModal(true)
  }

  async function submitReport() {
    try {
      if (!session || !reportReason) return

      const otherUserId = session.listener_id === currentUserId
        ? session.seeker_id
        : session.listener_id

      const { error } = await supabase
        .from('reports')
        .insert([{
          reporter_id: currentUserId,
          reported_user_id: otherUserId,
          session_id: sessionId,
          reason: reportReason,
          description: reportDetails.trim() || null,
          status: 'pending'
        }])

      if (error) throw error

      setReportModal(false)
      setReportSuccessModal(true)
    } catch (error) {
      console.error('Error submitting report:', error)
      setReportModal(false)
      setReportErrorModal(true)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Helper: get reactions grouped for a specific message
  function getReactionsForMessage(messageId: string) {
    const msgReactions = reactions.filter((r) => r.message_id === messageId)
    const grouped: Record<string, { count: number; byMe: boolean }> = {}
    for (const r of msgReactions) {
      if (!grouped[r.reaction]) grouped[r.reaction] = { count: 0, byMe: false }
      grouped[r.reaction].count++
      if (r.user_id === currentUserId) grouped[r.reaction].byMe = true
    }
    return grouped
  }

  if (loading) {
    return (
      <>
        <main id="main-content" className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F9FA' }}>
          {/* Header skeleton */}
          <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-32 mb-2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
            </div>
          </div>

          {/* Messages skeleton */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-4xl mx-auto" role="status" aria-label="Loading chat">
              <SkeletonChatMessage isOwn={false} />
              <SkeletonChatMessage isOwn={true} />
              <SkeletonChatMessage isOwn={false} />
              <SkeletonChatMessage isOwn={true} />
            </div>
          </div>

          {/* Input skeleton */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <main id="main-content" className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F9FA' }}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Body18 className="font-bold text-gray-900">Chat with {otherUserName}</Body18>
                <button
                  onClick={() => setProfileModal(true)}
                  aria-label={`View ${otherUserName}'s profile`}
                  className="min-h-[32px] min-w-[32px] p-1.5 text-gray-400 hover:text-rb-blue hover:bg-blue-50 rounded-full transition-all"
                  title="View profile"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {session?.status === 'active' ? (
                    <>
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-label="Active"></span>
                      <Body16 className="text-sm text-gray-600">Active session</Body16>
                    </>
                  ) : (
                    <Body16 className="text-sm text-gray-600">Session ended</Body16>
                  )}
                </div>
                <PrivacyBadge />
              </div>
            </div>
            {session?.status === 'active' ? (
              <div className="flex gap-2">
                <button
                  onClick={openReportModal}
                  aria-label="Report user"
                  className="min-h-[44px] px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all font-semibold"
                >
                  Report
                </button>
                <button
                  onClick={() => setEndSessionConfirmModal(true)}
                  aria-label="End session"
                  className="min-h-[44px] px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-semibold"
                >
                  End Session
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/dashboard')}
                className="min-h-[44px] px-4 py-2 text-sm bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-all font-semibold"
              >
                ← Back to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* End Session Error */}
        {endSessionError && (
          <div className="p-4 max-w-4xl mx-auto w-full">
            <ErrorState
              type="banner"
              title="Couldn't End Session"
              message="We couldn't end this session right now. Please try again in a moment."
              onRetry={() => {
                setEndSessionError(false)
                endSession()
              }}
              retryText="Try Ending Again"
            />
          </div>
        )}

        {/* Session ended by other party (shown when feedback modal not yet displayed) */}
        {sessionEndedByOther && !feedbackModal && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
            <p className="text-amber-800 font-medium text-sm">
              {otherUserName} has ended this session.
            </p>
          </div>
        )}

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          <div className="max-w-4xl mx-auto space-y-3">
            {messages.length === 0 ? (
              /* --- V2: Conversation Starters --- */
              session?.status === 'active' ? (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <Body16 className="text-gray-500 text-center mb-4">Tap a prompt to start the conversation:</Body16>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {(currentUserId === session?.seeker_id
                      ? CONVERSATION_STARTERS.seeker
                      : CONVERSATION_STARTERS.listener
                    ).map((starter) => (
                      <button
                        key={starter}
                        onClick={() => sendStarter(starter)}
                        disabled={sending}
                        className="px-4 py-2.5 bg-blue-50 text-rb-blue border border-blue-200 rounded-full text-sm font-medium hover:bg-blue-100 hover:border-blue-300 transition-all min-h-[44px] disabled:opacity-50"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                  <Body16 className="text-gray-600">No messages in this session.</Body16>
                </div>
              )
            ) : (
              messages.map((message) => {
                const isOwn = message.sender_id === currentUserId
                const msgReactions = getReactionsForMessage(message.id)
                const hasReactions = Object.keys(msgReactions).length > 0

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end animate-slide-in-right' : 'justify-start animate-slide-in-left'}`}
                  >
                    <div className="relative max-w-[70%] sm:max-w-md">
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-md ${
                          isOwn
                            ? 'bg-rb-blue text-white'
                            : 'bg-gray-800 text-white'
                        }`}
                        role="article"
                        aria-label={`Message from ${isOwn ? 'you' : otherUserName}`}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          setReactionPickerMessageId(
                            reactionPickerMessageId === message.id ? null : message.id
                          )
                        }}
                      >
                        <Body16 className="!text-white">
                          {message.content}
                        </Body16>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <p className="text-xs !text-white/80">
                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {/* --- V2: Read receipt checkmarks (own messages only) --- */}
                          {isOwn && (
                            <span className="text-xs ml-0.5" aria-label={message.read_at ? 'Read' : 'Sent'}>
                              {message.read_at ? (
                                // Double check — read
                                <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="inline-block">
                                  <path d="M1 5.5L4.5 9L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M5 5.5L8.5 9L15 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : (
                                // Single check — sent
                                <svg width="12" height="11" viewBox="0 0 12 11" fill="none" className="inline-block">
                                  <path d="M1 5.5L4.5 9L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                                </svg>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* --- V2: Reaction picker popover --- */}
                      {reactionPickerMessageId === message.id && (
                        <div
                          className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-12 bg-white rounded-full shadow-lg border border-gray-200 flex gap-1 p-1.5 z-10`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {REACTIONS.map((r) => (
                            <button
                              key={r.key}
                              onClick={() => toggleReaction(message.id, r.key)}
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 transition-all text-xl"
                              aria-label={r.label}
                              title={r.label}
                            >
                              {r.emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* --- V2: Reaction pills below message --- */}
                      {hasReactions && (
                        <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          {REACTIONS.filter((r) => msgReactions[r.key]).map((r) => (
                            <button
                              key={r.key}
                              onClick={() => toggleReaction(message.id, r.key)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                                msgReactions[r.key].byMe
                                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                                  : 'bg-gray-50 border-gray-200 text-gray-600'
                              }`}
                              aria-label={`${r.label} ${msgReactions[r.key].count}`}
                            >
                              <span>{r.emoji}</span>
                              <span>{msgReactions[r.key].count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {/* --- V2: Typing indicator --- */}
            {isOtherTyping && (
              <div className="flex justify-start animate-slide-in-left">
                <div className="bg-gray-800 text-white px-4 py-3 rounded-2xl shadow-md">
                  <div className="flex items-center gap-2">
                    <Body16 className="!text-white/80 text-sm">{otherUserName} is typing</Body16>
                    <span className="typing-dots">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />

            {/* Send Error */}
            {sendError && (
              <ErrorState
                type="inline"
                message="We couldn't send your message. Your connection might be unstable."
                onRetry={() => {
                  setSendError(false)
                  if (newMessage.trim()) {
                    const fakeEvent = { preventDefault: () => {} } as React.FormEvent
                    sendMessage(fakeEvent)
                  }
                }}
                retryText="Send Again"
              />
            )}
          </div>
        </div>

        {/* Message Input */}
        {session?.status === 'active' && (
          <div className="bg-white border-t border-gray-200 p-4">
            <form onSubmit={sendMessage} className="max-w-4xl mx-auto" aria-label="Send message">
              <div className="flex gap-2">
                <label htmlFor="message-input" className="sr-only">Type your message</label>
                <input
                  id="message-input"
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    if (e.target.value.trim()) broadcastTyping()
                  }}
                  maxLength={VALIDATION.MAX_MESSAGE_LENGTH}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all"
                  disabled={sending}
                  aria-label="Message text"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  aria-label={sending ? "Sending message..." : "Send message"}
                  className="min-h-[44px] px-6 py-3 rounded-lg font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-all"
                >
                  {sending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send'
                  )}
                </button>
              </div>
              <p className={`text-xs mt-1 text-right transition-colors ${
                newMessage.length >= VALIDATION.MAX_MESSAGE_LENGTH
                  ? 'text-red-500 font-semibold'
                  : newMessage.length > VALIDATION.MAX_MESSAGE_LENGTH * 0.9
                  ? 'text-amber-500'
                  : 'text-gray-300'
              }`}>
                {newMessage.length}/{VALIDATION.MAX_MESSAGE_LENGTH}
              </p>
            </form>
          </div>
        )}

        {/* Account Blocked Modal */}
        <Modal
          isOpen={blockModal.show}
          onClose={() => {
            setBlockModal({ show: false, reason: '' })
            router.push('/dashboard')
          }}
          title="Account Restricted"
          confirmText="Go to Dashboard"
          confirmStyle="primary"
        >
          <p className="text-lg mb-4">
            Your account has been restricted and you cannot access chats at this time.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm">
              <strong>Reason:</strong>
              <br />
              {blockModal.reason}
            </p>
          </div>
          <p className="text-sm text-rb-gray">
            If you believe this is a mistake, please contact support for assistance.
          </p>
        </Modal>

        {/* Report Success Modal */}
        <Modal
          isOpen={reportSuccessModal}
          onClose={() => setReportSuccessModal(false)}
          title="Report Submitted"
          confirmText="OK"
          confirmStyle="success"
        >
          <p className="text-lg mb-4">
            Thank you for your report. Our team will review it shortly.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm">
              We take all reports seriously and will investigate this matter. You'll be notified if we need any additional information.
            </p>
          </div>
        </Modal>

        {/* Report Error Modal */}
        <Modal
          isOpen={reportErrorModal}
          onClose={() => setReportErrorModal(false)}
          title="Report Failed"
          confirmText="Try Again"
          confirmStyle="danger"
        >
          <p className="text-lg mb-4">
            We couldn't submit your report right now.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm">
              This might be a temporary connection issue. Please try again in a moment, or contact support if the problem continues.
            </p>
          </div>
        </Modal>

        {/* Report Flow Modal */}
        {reportModal && (
          <div
            role="dialog"
            aria-labelledby="report-modal-title"
            aria-modal="true"
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setReportModal(false)}
          >
            <div
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <h2 id="report-modal-title" className="text-xl font-bold text-gray-900">
                  {reportStep === 'reason' && `Report ${otherUserName}`}
                  {reportStep === 'details' && 'Additional Details'}
                  {reportStep === 'confirm' && 'Confirm Report'}
                </h2>
                <button
                  onClick={() => setReportModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              {reportStep === 'reason' && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">Select a reason for your report:</p>
                  <div className="space-y-2">
                    {REPORT_REASONS.map((reason) => (
                      <button
                        key={reason}
                        onClick={() => {
                          setReportReason(reason)
                          setReportStep('details')
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-rb-blue hover:bg-blue-50 transition-all text-sm font-medium min-h-[44px]"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {reportStep === 'details' && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Reason: <span className="font-medium">{reportReason}</span>
                  </p>
                  <p className="text-sm text-gray-500 mb-3">Add any additional details (optional):</p>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Describe what happened..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent resize-none"
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setReportStep('reason')}
                      className="flex-1 min-h-[44px] px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all text-sm"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setReportStep('confirm')}
                      className="flex-1 min-h-[44px] px-4 py-2 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all text-sm"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {reportStep === 'confirm' && (
                <div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-amber-800 mb-1">You are about to report {otherUserName}</p>
                    <p className="text-sm text-amber-700">Reason: {reportReason}</p>
                    {reportDetails.trim() && (
                      <p className="text-sm text-amber-700 mt-1">Details: {reportDetails.trim()}</p>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Our team will review this report. False reports may result in action against your account.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setReportStep('details')}
                      className="flex-1 min-h-[44px] px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all text-sm"
                    >
                      Back
                    </button>
                    <button
                      onClick={submitReport}
                      className="flex-1 min-h-[44px] px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-all text-sm"
                    >
                      Submit Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* End Session Confirmation Modal */}
        <Modal
          isOpen={endSessionConfirmModal}
          onClose={() => setEndSessionConfirmModal(false)}
          title="End Session?"
          type="confirm"
          confirmText="End Session"
          cancelText="Keep Chatting"
          confirmStyle="danger"
          onConfirm={endSession}
        >
          <p className="text-gray-700 mb-2">
            Are you sure you want to end this conversation?
          </p>
          <p className="text-sm text-gray-500">
            You&apos;ll have a chance to leave feedback after ending.
          </p>
        </Modal>

        {/* Inactivity Warning Modal */}
        <Modal
          isOpen={inactivityModal}
          onClose={dismissInactivityWarning}
          title="Still There?"
          confirmText="I'm Still Here"
          confirmStyle="primary"
        >
          <p className="text-lg mb-4">
            We haven't seen any activity in this chat for a while.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm">
              <strong>This chat will automatically close in 5 minutes</strong> if there's no response.
              Send a message or click "I'm Still Here" to keep the conversation going.
            </p>
          </div>
        </Modal>

        {/* Profile Modal */}
        <Modal
          isOpen={profileModal}
          onClose={() => setProfileModal(false)}
          title={`${otherUserName}'s Profile`}
          confirmText="Close"
          confirmStyle="primary"
        >
          {otherUserProfile && (
            <div className="space-y-4">
              {/* Avatar */}
              {otherUserProfile.avatar_url ? (
                <div className="flex justify-center">
                  <img
                    src={otherUserProfile.avatar_url}
                    alt={otherUserName}
                    className="w-24 h-24 rounded-full object-cover border-4 border-rb-blue shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border-4 border-rb-blue shadow-lg">
                    <span className="text-5xl" role="img" aria-label="User">👤</span>
                  </div>
                </div>
              )}

              {/* Role */}
              {otherUserProfile.user_role && (
                <div className="text-center">
                  <Body16 className="text-sm text-rb-gray italic">
                    {otherUserProfile.user_role === 'person_in_recovery' && 'Person in Recovery'}
                    {otherUserProfile.user_role === 'professional' && 'Allies for Long-Term Recovery'}
                    {otherUserProfile.user_role === 'ally' && 'Recovery Support (Legacy)'}
                  </Body16>
                </div>
              )}

              {/* Tagline */}
              {otherUserProfile.tagline && (
                <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-rb-blue">
                  <Body16 className="text-gray-700 italic text-center">
                    "{otherUserProfile.tagline}"
                  </Body16>
                </div>
              )}

              {/* Bio */}
              {otherUserProfile.bio ? (
                <div>
                  <Body18 className="font-semibold text-gray-900 mb-2">About</Body18>
                  <Body16 className="text-gray-700 leading-relaxed">
                    {otherUserProfile.bio}
                  </Body16>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Body16 className="text-gray-500 italic">
                    {otherUserName} hasn't added a bio yet.
                  </Body16>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Session Feedback Modal */}
        {feedbackModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center">
              {feedbackSubmitted ? (
                <div className="py-4">
                  <span className="text-5xl block mb-3">🙏</span>
                  <Body18 className="font-bold text-gray-900 mb-2">Thank you!</Body18>
                  <Body16 className="text-gray-600">Your feedback helps our community.</Body16>
                  <Body16 className="text-gray-400 text-sm mt-2">One more thing...</Body16>
                </div>
              ) : favoriteStep ? (
                <div className="py-2">
                  <span className="text-5xl block mb-3">⭐</span>
                  <Body18 className="font-bold text-gray-900 mb-2">
                    Save {otherUserName}?
                  </Body18>
                  <Body16 className="text-gray-600 mb-6">
                    Add them to your favorites so you can find them quickly next time.
                  </Body16>

                  {alreadyFavorited || favoriteAdded ? (
                    <div className="py-3">
                      <Body16 className="text-amber-700 font-semibold">⭐ Already in your favorites!</Body16>
                      <Body16 className="text-gray-400 text-sm mt-1">Returning to dashboard...</Body16>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={addFavorite}
                        disabled={favoriteSaving}
                        className="min-h-[44px] w-full px-5 py-3 bg-amber-50 border-2 border-amber-300 text-amber-800 rounded-xl font-semibold hover:bg-amber-100 hover:border-amber-400 transition-all text-lg disabled:opacity-50"
                      >
                        {favoriteSaving ? 'Saving...' : '⭐ Yes, save to favorites'}
                      </button>
                      <button
                        onClick={() => router.push('/dashboard')}
                        className="min-h-[44px] w-full px-4 py-2.5 bg-gray-100 border-2 border-gray-200 text-gray-500 rounded-xl font-semibold hover:bg-gray-200 transition-all text-sm"
                      >
                        Not now
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <span className="text-5xl block mb-3">💬</span>
                  <Body18 className="font-bold text-gray-900 mb-2">Session Ended</Body18>
                  {sessionEndedByOther && (
                    <Body16 className="text-amber-700 text-sm mb-2">
                      {otherUserName} ended this session.
                    </Body16>
                  )}

                  {/* --- V2: Session Summary Card --- */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600">
                    <div className="flex items-center justify-center gap-4">
                      <span>Duration: {getSessionDuration()}</span>
                      <span className="text-gray-300">|</span>
                      <span>{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <Body16 className="text-gray-600 mb-6">
                    Was this conversation helpful?
                  </Body16>
                  <div className="flex gap-3 justify-center mb-4">
                    <button
                      onClick={() => submitFeedback(true)}
                      className="min-h-[44px] flex-1 px-5 py-3 bg-green-50 border-2 border-green-200 text-green-700 rounded-xl font-semibold hover:bg-green-100 hover:border-green-300 transition-all text-lg"
                    >
                      👍 Yes
                    </button>
                    <button
                      onClick={() => submitFeedback(false)}
                      className="min-h-[44px] flex-1 px-5 py-3 bg-gray-50 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-100 hover:border-gray-300 transition-all text-lg"
                    >
                      👎 No
                    </button>
                  </div>
                  <button
                    onClick={skipFeedback}
                    className="min-h-[44px] w-full px-4 py-2.5 bg-gray-100 border-2 border-gray-200 text-gray-500 rounded-xl font-semibold hover:bg-gray-200 hover:border-gray-300 transition-all text-sm"
                  >
                    Skip Feedback
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
