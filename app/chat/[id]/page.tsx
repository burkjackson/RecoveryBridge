'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import Modal from '@/components/Modal'
import { SkeletonChatMessage } from '@/components/Skeleton'
import ErrorState from '@/components/ErrorState'
import { PrivacyBadge } from '@/components/Footer'
import { TIME } from '@/lib/constants'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
}

interface Session {
  id: string
  listener_id: string
  seeker_id: string
  status: string
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [otherUserName, setOtherUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Modal states
  const [blockModal, setBlockModal] = useState({ show: false, reason: '' })
  const [reportSuccessModal, setReportSuccessModal] = useState(false)
  const [reportErrorModal, setReportErrorModal] = useState(false)
  const [inactivityModal, setInactivityModal] = useState(false)

  // Error states
  const [sendError, setSendError] = useState(false)
  const [endSessionError, setEndSessionError] = useState(false)

  // Inactivity tracking
  const [lastActivityTime, setLastActivityTime] = useState(Date.now())
  const inactivityWarningTime = TIME.INACTIVITY_WARNING_MS
  const autoCloseTime = TIME.INACTIVITY_AUTO_CLOSE_MS

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
      const cleanup = subscribeToMessages()
      return cleanup
    }
  }, [session, currentUserId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Define callbacks BEFORE useEffects that use them
  const endSessionDueToInactivity = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (error) throw error
      setInactivityModal(false)
      alert('This session was closed due to inactivity.')
      router.push('/dashboard')
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
    if (session?.status !== 'active') return

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
        .select('id, reason, block_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

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
        .select('display_name')
        .eq('id', otherUserId)
        .single()

      if (profileData) {
        setOtherUserName(profileData.display_name)
      }
    } catch (error) {
      console.error('Error loading session:', error)
      alert('Session not found')
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
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  function subscribeToMessages() {
    const channel = supabase
      .channel(`messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId || sending) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            session_id: sessionId,
            sender_id: currentUserId,
            content: newMessage.trim()
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

  async function endSession() {
    if (!confirm('Are you sure you want to end this session?')) return

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (error) throw error
      router.push('/dashboard')
    } catch (error) {
      console.error('Error ending session:', error)
      setEndSessionError(true)
    }
  }

  async function reportUser() {
    const reasons = [
      'Inappropriate behavior',
      'Harassment or bullying',
      'Spam or scam',
      'Sharing harmful content',
      'Other safety concern'
    ]

    const reason = prompt(`Report ${otherUserName}?\n\nSelect a reason:\n${reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nEnter 1-5:`)

    if (!reason || !['1', '2', '3', '4', '5'].includes(reason)) return

    const description = prompt('Please provide additional details (optional):')

    // Two-factor confirmation: user must type "report" to confirm
    const confirmation = prompt('To confirm this report, please type "report" exactly (without quotes):')

    if (confirmation !== 'report') {
      alert('Report cancelled. The confirmation text did not match.')
      return
    }

    try {
      if (!session) return

      const otherUserId = session.listener_id === currentUserId
        ? session.seeker_id
        : session.listener_id

      const { error } = await supabase
        .from('reports')
        .insert([{
          reporter_id: currentUserId,
          reported_user_id: otherUserId,
          session_id: sessionId,
          reason: reasons[parseInt(reason) - 1],
          description: description || null,
          status: 'pending'
        }])

      if (error) throw error

      setReportSuccessModal(true)
    } catch (error) {
      console.error('Error submitting report:', error)
      setReportErrorModal(true)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
              <Body18 className="font-bold text-gray-900 mb-1">Chat with {otherUserName}</Body18>
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
                  onClick={reportUser}
                  aria-label="Report user"
                  className="min-h-[44px] px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all font-semibold"
                >
                  Report
                </button>
                <button
                  onClick={endSession}
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

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          <div className="max-w-4xl mx-auto space-y-3">
            {messages.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center shadow-sm">
                <Body16 className="text-gray-600">No messages yet. Say hello!</Body16>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === currentUserId ? 'justify-end animate-slide-in-right' : 'justify-start animate-slide-in-left'}`}
                >
                  <div
                    className={`max-w-[70%] sm:max-w-md px-4 py-3 rounded-2xl shadow-md ${
                      message.sender_id === currentUserId
                        ? 'bg-rb-blue text-white'
                        : 'bg-gray-800 text-white'
                    }`}
                    role="article"
                    aria-label={`Message from ${message.sender_id === currentUserId ? 'you' : otherUserName}`}
                  >
                    <Body16 className="!text-white">
                      {message.content}
                    </Body16>
                    <p className="text-xs mt-1 !text-white/80">
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
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
            <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-2" aria-label="Send message">
              <label htmlFor="message-input" className="sr-only">Type your message</label>
              <input
                id="message-input"
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
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
      </main>
    </>
  )
}
