'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import Modal from '@/components/Modal'
import { SkeletonAdminRow } from '@/components/Skeleton'
import { CompactFooter } from '@/components/Footer'

interface Report {
  id: string
  reporter_id: string
  reported_user_id: string
  session_id: string | null
  reason: string
  description: string | null
  status: string
  created_at: string
  reporter?: { display_name: string }
  reported_user?: { display_name: string }
}

interface UserBlock {
  id: string
  user_id: string
  blocked_by: string
  reason: string
  block_type: string
  blocked_at: string
  expires_at: string | null
  is_active: boolean
  user?: { display_name: string }
}

interface Session {
  id: string
  listener_id: string
  seeker_id: string
  status: string
  created_at: string
  listener?: { display_name: string }
  seeker?: { display_name: string }
}

interface User {
  id: string
  display_name: string
  email: string
  user_role: string
  role_state: string
  created_at: string
  is_admin: boolean
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'reports' | 'blocks' | 'sessions' | 'users' | 'signups'>('reports')

  const [reports, setReports] = useState<Report[]>([])
  const [blocks, setBlocks] = useState<UserBlock[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [signups, setSignups] = useState<User[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Modal states
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const [successModal, setSuccessModal] = useState({ show: false, message: '' })
  const [blockModal, setBlockModal] = useState({ show: false, userId: '', userName: '', fromReport: false, reportId: '' })
  const [blockInput, setBlockInput] = useState({ reason: '', type: 'temporary' as 'temporary' | 'permanent' })
  const [unblockModal, setUnblockModal] = useState({ show: false, blockId: '', userName: '' })
  const [endSessionModal, setEndSessionModal] = useState({ show: false, sessionId: '', participants: '' })
  const [deleteUserModal, setDeleteUserModal] = useState({ show: false, step: 1, userId: '', displayName: '', confirmName: '' })
  const [resolutionModal, setResolutionModal] = useState({ show: false, reportId: '', notes: '' })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadData()
      subscribeToUpdates()
    }
  }, [isAdmin, activeTab])

  async function checkAdminAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // SECURITY WARNING: This is client-side authorization only!
      // ⚠️ CRITICAL: Ensure Row Level Security (RLS) policies are enabled on:
      //    - reports table
      //    - user_blocks table
      //    - sessions table (for admin viewing all sessions)
      //    - profiles table (for admin viewing all profiles)
      //
      // RLS policies should restrict access to these tables to users with is_admin = true
      // Without proper RLS, a malicious user could bypass this client-side check
      // and query admin data directly using browser DevTools.
      //
      // TODO: Consider moving admin operations to server-side API routes with
      // proper authentication middleware for defense-in-depth security.
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function loadData() {
    if (activeTab === 'reports') await loadReports()
    if (activeTab === 'blocks') await loadBlocks()
    if (activeTab === 'sessions') await loadSessions()
    if (activeTab === 'users') await loadUsers()
    if (activeTab === 'signups') await loadSignups()
  }

  async function loadReports() {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(display_name),
          reported_user:profiles!reports_reported_user_id_fkey(display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setReports(data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
    }
  }

  async function loadBlocks() {
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          *,
          user:profiles!user_blocks_user_id_fkey(display_name)
        `)
        .eq('is_active', true)
        .order('blocked_at', { ascending: false })

      if (error) throw error
      setBlocks(data || [])
    } catch (error) {
      console.error('Error loading blocks:', error)
    }
  }

  async function loadSessions() {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          listener:profiles!sessions_listener_id_fkey(display_name),
          seeker:profiles!sessions_seeker_id_fkey(display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  async function loadSignups() {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, user_role, role_state, created_at, is_admin')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setSignups(data || [])
    } catch (error) {
      console.error('Error loading sign-ups:', error)
    }
  }

  function subscribeToUpdates() {
    const channel = supabase
      .channel('admin-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        () => { if (activeTab === 'reports') loadReports() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_blocks' },
        () => { if (activeTab === 'blocks') loadBlocks() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => { if (activeTab === 'sessions') loadSessions() }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        () => { if (activeTab === 'signups') loadSignups() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  async function copyEmail(userId: string, email: string) {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedId(userId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // fallback: select text
    }
  }

  async function adminFetch(body: object) {
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/admin/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Request failed')
    }
    return response.json()
  }

  async function updateReportStatus(reportId: string, status: string, notes?: string) {
    try {
      await adminFetch({ action: 'update_report', reportId, status, notes })
      loadReports()
    } catch (error) {
      console.error('Error updating report:', error)
      setErrorModal({ show: true, message: 'We couldn\'t update this report right now. Please try again in a moment.' })
    }
  }

  async function blockUser(userId: string, reason: string, blockType: 'temporary' | 'permanent') {
    try {
      await adminFetch({ action: 'block_user', userId, reason, blockType })
      loadBlocks()
      setSuccessModal({ show: true, message: 'User has been blocked successfully.' })
      setBlockModal({ show: false, userId: '', userName: '', fromReport: false, reportId: '' })
      setBlockInput({ reason: '', type: 'temporary' })
    } catch (error) {
      console.error('Error blocking user:', error)
      setErrorModal({ show: true, message: 'We couldn\'t block this user right now. Please try again in a moment.' })
    }
  }

  async function unblockUser(blockId: string) {
    try {
      await adminFetch({ action: 'unblock_user', blockId })
      loadBlocks()
      setSuccessModal({ show: true, message: 'User has been unblocked successfully.' })
      setUnblockModal({ show: false, blockId: '', userName: '' })
    } catch (error) {
      console.error('Error unblocking user:', error)
      setErrorModal({ show: true, message: 'We couldn\'t unblock this user right now. Please try again in a moment.' })
    }
  }

  async function endSession(sessionId: string) {
    try {
      await adminFetch({ action: 'end_session', sessionId })
      loadSessions()
      setSuccessModal({ show: true, message: 'Session has been ended successfully.' })
      setEndSessionModal({ show: false, sessionId: '', participants: '' })
    } catch (error) {
      console.error('Error ending session:', error)
      setErrorModal({ show: true, message: 'We couldn\'t end this session right now. Please try again in a moment.' })
    }
  }

  function deleteUser(userId: string, displayName: string) {
    // Show first confirmation modal
    setDeleteUserModal({ show: true, step: 1, userId, displayName, confirmName: '' })
  }

  async function confirmDeleteUser() {
    const { userId, displayName, confirmName, step } = deleteUserModal

    if (step === 1) {
      // Move to step 2 (name confirmation)
      setDeleteUserModal({ ...deleteUserModal, step: 2 })
      return
    }

    // Step 2: Check if name matches
    if (confirmName !== displayName) {
      setErrorModal({ show: true, message: 'Deletion cancelled. The name you entered did not match.' })
      setDeleteUserModal({ show: false, step: 1, userId: '', displayName: '', confirmName: '' })
      return
    }

    // Proceed with deletion
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ targetUserId: userId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      setSuccessModal({ show: true, message: `User ${displayName} has been permanently deleted.` })
      setDeleteUserModal({ show: false, step: 1, userId: '', displayName: '', confirmName: '' })
      loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      setErrorModal({ show: true, message: 'We couldn\'t delete this user right now. Please try again in a moment.' })
      setDeleteUserModal({ show: false, step: 1, userId: '', displayName: '', confirmName: '' })
    }
  }

  if (loading) {
    return (
      <main id="main-content" className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-48 mb-2" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-56" />
          </div>

          {/* Tab skeleton */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="space-y-4" role="status" aria-label="Loading admin panel">
              <SkeletonAdminRow />
              <SkeletonAdminRow />
              <SkeletonAdminRow />
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <main id="main-content" className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <div>
            <Heading1 className="text-xl sm:text-2xl md:text-3xl">🛡️ Admin Panel</Heading1>
            <Body16 className="mt-1 sm:mt-2">RecoveryBridge Moderation</Body16>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="min-h-[44px] px-4 py-3 text-sm text-rb-blue hover:text-rb-blue-hover transition"
          >
            ← Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-rb-blue text-white'
                : 'bg-white text-[#2D3436] hover:bg-gray-50'
            }`}
          >
            📋 Reports
          </button>
          <button
            onClick={() => setActiveTab('blocks')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === 'blocks'
                ? 'bg-rb-blue text-white'
                : 'bg-white text-[#2D3436] hover:bg-gray-50'
            }`}
          >
            🚫 Blocks
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'bg-rb-blue text-white'
                : 'bg-white text-[#2D3436] hover:bg-gray-50'
            }`}
          >
            💬 Sessions
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-rb-blue text-white'
                : 'bg-white text-[#2D3436] hover:bg-gray-50'
            }`}
          >
            👥 Users
          </button>
          <button
            onClick={() => setActiveTab('signups')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === 'signups'
                ? 'bg-rb-blue text-white'
                : 'bg-white text-[#2D3436] hover:bg-gray-50'
            }`}
          >
            🆕 Sign-Ups
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div>
              <Body18 className="mb-4">User Reports ({reports.length})</Body18>
              {reports.length === 0 ? (
                <Body16 className="text-rb-gray">No reports yet</Body16>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Body16 className="font-semibold">
                            {report.reporter?.display_name || 'Unknown'} reported {report.reported_user?.display_name || 'Unknown'}
                          </Body16>
                          <Body16 className="text-sm text-rb-gray">
                            {new Date(report.created_at).toLocaleString()}
                          </Body16>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          report.status === 'reviewing' ? 'bg-blue-100 text-blue-800' :
                          report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <Body16 className="mb-2"><strong>Reason:</strong> {report.reason}</Body16>
                      {report.description && (
                        <Body16 className="mb-3 text-rb-gray">{report.description}</Body16>
                      )}
                      {report.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateReportStatus(report.id, 'reviewing')}
                            className="min-h-[44px] px-4 py-3 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => setResolutionModal({ show: true, reportId: report.id, notes: '' })}
                            className="min-h-[44px] px-4 py-3 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => updateReportStatus(report.id, 'dismissed')}
                            className="min-h-[44px] px-4 py-3 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => setBlockModal({
                              show: true,
                              userId: report.reported_user_id,
                              userName: report.reported_user?.display_name || 'Unknown',
                              fromReport: true,
                              reportId: report.id
                            })}
                            className="min-h-[44px] px-4 py-3 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            Block User
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Blocks Tab */}
          {activeTab === 'blocks' && (
            <div>
              <Body18 className="mb-4">Blocked Users ({blocks.length})</Body18>
              {blocks.length === 0 ? (
                <Body16 className="text-rb-gray">No blocked users</Body16>
              ) : (
                <div className="space-y-4">
                  {blocks.map((block) => (
                    <div key={block.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-start justify-between mb-2">
                        <Body16 className="font-semibold">
                          {block.user?.display_name || 'Unknown User'}
                        </Body16>
                        <span className="px-3 py-1 rounded-full text-xs bg-red-600 text-white">
                          {block.block_type}
                        </span>
                      </div>
                      <Body16 className="mb-2"><strong>Reason:</strong> {block.reason}</Body16>
                      <Body16 className="text-sm text-rb-gray mb-3">
                        Blocked: {new Date(block.blocked_at).toLocaleString()}
                        {block.expires_at && ` • Expires: ${new Date(block.expires_at).toLocaleString()}`}
                      </Body16>
                      <button
                        onClick={() => setUnblockModal({
                          show: true,
                          blockId: block.id,
                          userName: block.user?.display_name || 'Unknown User'
                        })}
                        className="min-h-[44px] px-4 py-3 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div>
              <Body18 className="mb-4">Chat Sessions ({sessions.length})</Body18>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Body16>
                        <strong>{session.listener?.display_name || 'Unknown'}</strong> ↔ <strong>{session.seeker?.display_name || 'Unknown'}</strong>
                      </Body16>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        session.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <Body16 className="text-sm text-rb-gray mb-2">
                      Started: {new Date(session.created_at).toLocaleString()}
                    </Body16>
                    {session.status === 'active' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/chat/${session.id}`)}
                          className="min-h-[44px] px-4 py-3 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                          View Chat
                        </button>
                        <button
                          onClick={() => setEndSessionModal({
                            show: true,
                            sessionId: session.id,
                            participants: `${session.listener?.display_name || 'Unknown'} and ${session.seeker?.display_name || 'Unknown'}`
                          })}
                          className="min-h-[44px] px-4 py-3 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          End Session
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <Body18 className="mb-4">All Users ({users.length})</Body18>
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Body16 className="font-semibold">
                          {user.display_name}
                          {user.is_admin && <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Admin</span>}
                        </Body16>
                        <Body16 className="text-sm text-rb-gray">
                          {user.user_role} • {user.role_state}
                        </Body16>
                      </div>
                      <Body16 className="text-xs text-rb-gray">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </Body16>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBlockModal({
                          show: true,
                          userId: user.id,
                          userName: user.display_name,
                          fromReport: false,
                          reportId: ''
                        })}
                        className="min-h-[44px] px-4 py-3 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Block User
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.display_name)}
                        className="min-h-[44px] px-4 py-3 bg-gray-800 text-white rounded text-sm hover:bg-gray-900"
                      >
                        🗑️ Delete User
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sign-Ups Tab */}
          {activeTab === 'signups' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <Body18>Recent Sign-Ups — Last 30 Days ({signups.length})</Body18>
                {signups.length > 0 && (
                  <button
                    onClick={() => {
                      const allEmails = signups
                        .filter(u => u.email)
                        .map(u => u.email)
                        .join(', ')
                      navigator.clipboard.writeText(allEmails)
                      setCopiedId('all')
                      setTimeout(() => setCopiedId(null), 2000)
                    }}
                    className="min-h-[44px] px-4 py-2 text-sm bg-rb-blue-light text-rb-blue rounded-lg hover:bg-rb-blue hover:text-white transition"
                  >
                    {copiedId === 'all' ? '✓ Copied all emails!' : '📋 Copy all emails'}
                  </button>
                )}
              </div>

              {signups.length === 0 ? (
                <Body16 className="text-rb-gray">No sign-ups in the last 30 days.</Body16>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        <th className="pb-3 pr-4 font-semibold text-rb-dark">Name</th>
                        <th className="pb-3 pr-4 font-semibold text-rb-dark">Email</th>
                        <th className="pb-3 pr-4 font-semibold text-rb-dark hidden sm:table-cell">Role</th>
                        <th className="pb-3 font-semibold text-rb-dark hidden md:table-cell">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {signups.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4">
                            <span className="font-medium text-rb-dark">{user.display_name}</span>
                            {user.is_admin && (
                              <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">Admin</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-rb-gray font-mono text-xs break-all">
                                {user.email || '—'}
                              </span>
                              {user.email && (
                                <button
                                  onClick={() => copyEmail(user.id, user.email)}
                                  className="shrink-0 px-2 py-1 text-xs rounded bg-gray-100 hover:bg-rb-blue hover:text-white transition"
                                  title="Copy email"
                                >
                                  {copiedId === user.id ? '✓' : '📋'}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4 hidden sm:table-cell text-rb-gray">
                            {user.user_role === 'person_in_recovery' ? 'Person in Recovery'
                              : user.user_role === 'professional' ? 'Allies in Long-Term Recovery'
                              : user.user_role === 'ally' ? 'Recovery Support'
                              : <span className="italic text-gray-400">Not set</span>}
                          </td>
                          <td className="py-3 hidden md:table-cell text-rb-gray text-xs">
                            {new Date(user.created_at).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              hour: 'numeric', minute: '2-digit', hour12: true,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Modal */}
      <Modal
        isOpen={errorModal.show}
        onClose={() => setErrorModal({ show: false, message: '' })}
        title="Unable to Complete Action"
        confirmText="OK"
        confirmStyle="primary"
      >
        <p>{errorModal.message}</p>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={successModal.show}
        onClose={() => setSuccessModal({ show: false, message: '' })}
        title="Success"
        confirmText="OK"
        confirmStyle="success"
      >
        <p>{successModal.message}</p>
      </Modal>

      {/* Block User Modal */}
      <Modal
        isOpen={blockModal.show}
        onClose={() => {
          setBlockModal({ show: false, userId: '', userName: '', fromReport: false, reportId: '' })
          setBlockInput({ reason: '', type: 'temporary' })
        }}
        title={`Block ${blockModal.userName}`}
        type="confirm"
        onConfirm={() => blockUser(blockModal.userId, blockInput.reason, blockInput.type)}
        confirmText="Block User"
        confirmStyle="danger"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Block Reason</label>
            <textarea
              value={blockInput.reason}
              onChange={(e) => setBlockInput({ ...blockInput, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
              rows={3}
              placeholder="Enter the reason for blocking this user..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Block Type</label>
            <select
              value={blockInput.type}
              onChange={(e) => setBlockInput({ ...blockInput, type: e.target.value as 'temporary' | 'permanent' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
            >
              <option value="temporary">Temporary (7 days)</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Unblock User Modal */}
      <Modal
        isOpen={unblockModal.show}
        onClose={() => setUnblockModal({ show: false, blockId: '', userName: '' })}
        title="Unblock User"
        type="confirm"
        onConfirm={() => unblockUser(unblockModal.blockId)}
        confirmText="Unblock"
        confirmStyle="success"
      >
        <p>Are you sure you want to unblock <strong>{unblockModal.userName}</strong>?</p>
        <p className="mt-2 text-sm text-rb-gray">They will be able to use the platform again.</p>
      </Modal>

      {/* End Session Modal */}
      <Modal
        isOpen={endSessionModal.show}
        onClose={() => setEndSessionModal({ show: false, sessionId: '', participants: '' })}
        title="End Session"
        type="confirm"
        onConfirm={() => endSession(endSessionModal.sessionId)}
        confirmText="End Session"
        confirmStyle="danger"
      >
        <p>Are you sure you want to end the session between <strong>{endSessionModal.participants}</strong>?</p>
        <p className="mt-2 text-sm text-rb-gray">This action cannot be undone.</p>
      </Modal>

      {/* Delete User Modal - Step 1 */}
      <Modal
        isOpen={deleteUserModal.show && deleteUserModal.step === 1}
        onClose={() => setDeleteUserModal({ show: false, step: 1, userId: '', displayName: '', confirmName: '' })}
        title="⚠️ Permanent Deletion Warning"
        type="confirm"
        onConfirm={confirmDeleteUser}
        confirmText="Continue"
        confirmStyle="danger"
      >
        <div className="space-y-3">
          <p>You are about to permanently delete user: <strong>{deleteUserModal.displayName}</strong></p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="font-semibold mb-2">This will remove ALL of their data:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Profile information</li>
              <li>Chat sessions</li>
              <li>Messages</li>
              <li>Reports</li>
            </ul>
          </div>
          <p className="font-bold text-red-600">This action CANNOT be undone!</p>
          <p>Are you absolutely sure you want to continue?</p>
        </div>
      </Modal>

      {/* Delete User Modal - Step 2 */}
      <Modal
        isOpen={deleteUserModal.show && deleteUserModal.step === 2}
        onClose={() => setDeleteUserModal({ show: false, step: 1, userId: '', displayName: '', confirmName: '' })}
        title="⚠️ Final Confirmation Required"
        type="confirm"
        onConfirm={confirmDeleteUser}
        confirmText="Delete Permanently"
        confirmStyle="danger"
      >
        <div className="space-y-4">
          <p>To proceed with deleting <strong>{deleteUserModal.displayName}</strong>, type their name exactly as shown below:</p>
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-center">
            <code className="font-mono font-semibold">{deleteUserModal.displayName}</code>
          </div>
          <input
            type="text"
            value={deleteUserModal.confirmName}
            onChange={(e) => setDeleteUserModal({ ...deleteUserModal, confirmName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
            placeholder="Type the name to confirm deletion"
          />
        </div>
      </Modal>

      {/* Resolution Notes Modal */}
      <Modal
        isOpen={resolutionModal.show}
        onClose={() => setResolutionModal({ show: false, reportId: '', notes: '' })}
        title="Resolve Report"
        type="confirm"
        onConfirm={() => {
          updateReportStatus(resolutionModal.reportId, 'resolved', resolutionModal.notes)
          setResolutionModal({ show: false, reportId: '', notes: '' })
        }}
        confirmText="Resolve"
        confirmStyle="success"
      >
        <div className="space-y-3">
          <label className="block text-sm font-semibold">Resolution Notes</label>
          <textarea
            value={resolutionModal.notes}
            onChange={(e) => setResolutionModal({ ...resolutionModal, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
            rows={4}
            placeholder="Enter notes about how this report was resolved..."
          />
        </div>
      </Modal>

      {/* Footer */}
      <CompactFooter />
    </main>
  )
}
