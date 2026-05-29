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
  referral_source: string | null
  listener_training_completed_at: string | null
}

interface AdminStory {
  id: string
  title: string
  slug: string
  status: string
  rejection_note: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  is_pinned: boolean
  author: { display_name: string; email: string } | null
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'reports' | 'blocks' | 'sessions' | 'users' | 'signups' | 'stories'>('reports')

  const [reports, setReports] = useState<Report[]>([])
  const [blocks, setBlocks] = useState<UserBlock[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [signups, setSignups] = useState<User[]>([])
  const [stories, setStories] = useState<AdminStory[]>([])
  const [storiesFilter, setStoriesFilter] = useState<'pending' | 'all'>('pending')
  const [rejectingStoryId, setRejectingStoryId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set())
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  // Search/filter state
  const [reportSearch, setReportSearch] = useState('')
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'pending' | 'reviewing' | 'resolved' | 'dismissed'>('all')
  const [userSearch, setUserSearch] = useState('')
  const [sessionSearch, setSessionSearch] = useState('')
  const [blockSearch, setBlockSearch] = useState('')

  // Modal states
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const [successModal, setSuccessModal] = useState({ show: false, message: '' })
  const [blockModal, setBlockModal] = useState({ show: false, userId: '', userName: '', fromReport: false, reportId: '' })
  const [blockInput, setBlockInput] = useState({ reason: '', type: 'temporary' as 'temporary' | 'permanent' })
  const [unblockModal, setUnblockModal] = useState({ show: false, blockId: '', userName: '' })
  const [endSessionModal, setEndSessionModal] = useState({ show: false, sessionId: '', participants: '' })
  const [deleteUserModal, setDeleteUserModal] = useState({ show: false, step: 1, userId: '', displayName: '', confirmName: '' })
  const [resolutionModal, setResolutionModal] = useState({ show: false, reportId: '', notes: '' })

  // Transcript viewer
  const [transcriptConfirm, setTranscriptConfirm] = useState<{ show: boolean; sessionId: string; reportedUserId?: string; reportId?: string }>({ show: false, sessionId: '' })
  const [transcriptMessages, setTranscriptMessages] = useState<Record<string, { id: string; sender_id: string; content: string; created_at: string }[]>>({})
  const [transcriptProfiles, setTranscriptProfiles] = useState<Record<string, string>>({})
  const [transcriptLoading, setTranscriptLoading] = useState<string | null>(null)
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
    // Load contacted IDs from localStorage
    try {
      const stored = localStorage.getItem('rb_contacted_signups')
      if (stored) setContactedIds(new Set(JSON.parse(stored)))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadData()
      subscribeToUpdates()
    }
  }, [isAdmin, activeTab])

  function persistContacted(ids: Set<string>) {
    try {
      localStorage.setItem('rb_contacted_signups', JSON.stringify([...ids]))
    } catch { /* ignore */ }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const allIds = signups.map(u => u.id)
    const allSelected = allIds.every(id => selectedIds.has(id))
    setSelectedIds(allSelected ? new Set() : new Set(allIds))
  }

  function markSelectedContacted() {
    setContactedIds(prev => {
      const next = new Set([...prev, ...selectedIds])
      persistContacted(next)
      return next
    })
    setSelectedIds(new Set())
  }

  function unmarkContacted(id: string) {
    setContactedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      persistContacted(next)
      return next
    })
  }

  function copySelectedEmails() {
    const emails = signups
      .filter(u => selectedIds.has(u.id) && u.email)
      .map(u => u.email)
      .join(', ')
    if (!emails) return
    navigator.clipboard.writeText(emails)
    setCopiedId('selected')
    setTimeout(() => setCopiedId(null), 2000)
  }

  function toggleUserSelect(id: string) {
    setSelectedUserIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleUserSelectAll() {
    const allIds = users.map(u => u.id)
    const allSelected = allIds.every(id => selectedUserIds.has(id))
    setSelectedUserIds(allSelected ? new Set() : new Set(allIds))
  }

  function copySelectedUserEmails() {
    const emails = users
      .filter(u => selectedUserIds.has(u.id) && u.email)
      .map(u => u.email)
      .join(', ')
    if (!emails) return
    navigator.clipboard.writeText(emails)
    setCopiedId('users-selected')
    setTimeout(() => setCopiedId(null), 2000)
  }

  function copyAllUserEmails() {
    const emails = users.filter(u => u.email).map(u => u.email).join(', ')
    if (!emails) return
    navigator.clipboard.writeText(emails)
    setCopiedId('users-all')
    setTimeout(() => setCopiedId(null), 2000)
  }

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
    if (activeTab === 'stories') await loadStories()
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

  async function loadStories() {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          id, title, slug, status, rejection_note, created_at, updated_at, published_at, is_pinned,
          author:profiles!author_id(display_name, email)
        `)
        .order('updated_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setStories(data as unknown as AdminStory[] || [])
    } catch (error) {
      console.error('Error loading stories:', error)
    }
  }

  async function loadSignups() {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, user_role, role_state, created_at, is_admin, referral_source, listener_training_completed_at')
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

  async function loadTranscript(sessionId: string, reportId?: string) {
    setTranscriptLoading(sessionId)
    try {
      // Server-side: verifies admin, fetches messages, and writes the audit log atomically
      const { messages, profiles } = await adminFetch({ action: 'load_transcript', sessionId, reportId })

      if (profiles && Object.keys(profiles).length > 0) {
        setTranscriptProfiles(prev => ({ ...prev, ...profiles }))
      }

      setTranscriptMessages(prev => ({ ...prev, [sessionId]: messages || [] }))
      setExpandedTranscript(sessionId)
    } catch (err) {
      console.error('Error loading transcript:', err)
      setErrorModal({ show: true, message: 'Could not load the transcript. Please try again.' })
    } finally {
      setTranscriptLoading(null)
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
      <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-56" />
          </div>

          {/* Tab skeleton */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
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
    <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
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
                : 'bg-white dark:bg-gray-800 text-[#2D3436] dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            📋 Reports
          </button>
          <button
            onClick={() => setActiveTab('blocks')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === 'blocks'
                ? 'bg-rb-blue text-white'
                : 'bg-white dark:bg-gray-800 text-[#2D3436] dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            🚫 Blocks
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'bg-rb-blue text-white'
                : 'bg-white dark:bg-gray-800 text-[#2D3436] dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            💬 Sessions
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-rb-blue text-white'
                : 'bg-white dark:bg-gray-800 text-[#2D3436] dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            👥 Users
          </button>
          <button
            onClick={() => setActiveTab('signups')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === 'signups'
                ? 'bg-rb-blue text-white'
                : 'bg-white dark:bg-gray-800 text-[#2D3436] dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            🆕 Sign-Ups
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeTab === 'stories'
                ? 'bg-rb-blue text-white'
                : 'bg-white dark:bg-gray-800 text-[#2D3436] dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            📝 Stories
          </button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div>
              {(() => {
                const filteredReports = reports.filter(r => {
                  const matchesSearch = reportSearch === '' ||
                    (r.reporter?.display_name || '').toLowerCase().includes(reportSearch.toLowerCase()) ||
                    (r.reported_user?.display_name || '').toLowerCase().includes(reportSearch.toLowerCase()) ||
                    r.reason.toLowerCase().includes(reportSearch.toLowerCase())
                  const matchesStatus = reportStatusFilter === 'all' || r.status === reportStatusFilter
                  return matchesSearch && matchesStatus
                })
                return (
                  <>
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Search by reporter, reported user, or reason…"
                          value={reportSearch}
                          onChange={e => setReportSearch(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rb-blue"
                        />
                        {reportSearch && (
                          <button
                            onClick={() => setReportSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <select
                        value={reportStatusFilter}
                        onChange={e => setReportStatusFilter(e.target.value as 'all' | 'pending' | 'reviewing' | 'resolved' | 'dismissed')}
                        className="w-auto px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rb-blue"
                      >
                        <option value="all">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="resolved">Resolved</option>
                        <option value="dismissed">Dismissed</option>
                      </select>
                    </div>
                    <Body18 className="mb-4">
                      User Reports ({filteredReports.length === reports.length ? reports.length : `${filteredReports.length} of ${reports.length}`})
                    </Body18>
                    {filteredReports.length === 0 ? (
                      <Body16 className="text-rb-gray">{reports.length === 0 ? 'No reports yet' : 'No reports match your search'}</Body16>
                    ) : (
                      <div className="space-y-4">
                        {filteredReports.map((report) => (
                    <div key={report.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Body16 className="font-semibold dark:text-gray-100">
                            {report.reporter?.display_name || 'Unknown'} reported {report.reported_user?.display_name || 'Unknown'}
                          </Body16>
                          <Body16 className="text-sm text-rb-gray dark:text-gray-400">
                            {new Date(report.created_at).toLocaleString()}
                          </Body16>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          report.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                          report.status === 'reviewing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                          report.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <Body16 className="mb-2"><strong>Reason:</strong> {report.reason}</Body16>
                      {report.description && (
                        <Body16 className="mb-3 text-rb-gray">{report.description}</Body16>
                      )}
                      {report.status === 'pending' && (
                        <div className="flex gap-2 flex-wrap">
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
                      {report.session_id && (
                        <div className="mt-3">
                          <button
                            onClick={() => {
                              if (expandedTranscript === report.session_id) {
                                setExpandedTranscript(null)
                              } else {
                                setTranscriptConfirm({ show: true, sessionId: report.session_id!, reportedUserId: report.reported_user_id, reportId: report.id })
                              }
                            }}
                            className="flex items-center gap-1.5 text-sm text-rb-blue hover:text-rb-blue-hover font-medium"
                          >
                            <span>💬</span>
                            <span>{expandedTranscript === report.session_id ? 'Hide Transcript' : 'View Chat Transcript'}</span>
                          </button>
                          {expandedTranscript === report.session_id && (() => {
                            const msgs = transcriptMessages[report.session_id] || []
                            const isLoading = transcriptLoading === report.session_id
                            return (
                              <div className="mt-2 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                                <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                                    Chat Transcript ({msgs.length} message{msgs.length !== 1 ? 's' : ''})
                                  </span>
                                  <span className="text-xs text-amber-400">🔒 Admin view · logged</span>
                                </div>
                                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                                  {isLoading ? (
                                    <div className="text-center py-4">
                                      <div className="inline-block w-5 h-5 border-2 border-rb-blue border-t-transparent rounded-full animate-spin" />
                                      <p className="text-sm text-gray-400 mt-2">Loading transcript…</p>
                                    </div>
                                  ) : msgs.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">No messages in this session.</p>
                                  ) : (
                                    msgs.map((msg, i) => {
                                      const isReported = msg.sender_id === report.reported_user_id
                                      const senderName = transcriptProfiles[msg.sender_id] || 'Unknown'
                                      const showName = i === 0 || msgs[i - 1].sender_id !== msg.sender_id
                                      return (
                                        <div key={msg.id} className={`flex flex-col ${isReported ? 'items-end' : 'items-start'}`}>
                                          {showName && (
                                            <span className="text-xs text-gray-400 mb-1 px-1">
                                              {senderName} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                          )}
                                          <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm break-words ${
                                            isReported
                                              ? 'bg-red-900/50 border border-red-700/50 text-red-100'
                                              : 'bg-gray-700 text-gray-100'
                                          }`}>
                                            {msg.content}
                                          </div>
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
                </>
              )
            })()}
            </div>
          )}

          {/* Blocks Tab */}
          {activeTab === 'blocks' && (
            <div>
              {(() => {
                const filteredBlocks = blocks.filter(b =>
                  blockSearch === '' ||
                  (b.user?.display_name || '').toLowerCase().includes(blockSearch.toLowerCase())
                )
                return (
                  <>
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Search by username…"
                          value={blockSearch}
                          onChange={e => setBlockSearch(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rb-blue"
                        />
                        {blockSearch && (
                          <button
                            onClick={() => setBlockSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    <Body18 className="mb-4">
                      Blocked Users ({filteredBlocks.length === blocks.length ? blocks.length : `${filteredBlocks.length} of ${blocks.length}`})
                    </Body18>
                    {filteredBlocks.length === 0 ? (
                      <Body16 className="text-rb-gray">{blocks.length === 0 ? 'No blocked users' : 'No blocked users match your search'}</Body16>
                    ) : (
                      <div className="space-y-4">
                        {filteredBlocks.map((block) => (
                    <div key={block.id} className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-start justify-between mb-2">
                        <Body16 className="font-semibold dark:text-gray-100">
                          {block.user?.display_name || 'Unknown User'}
                        </Body16>
                        <span className="px-3 py-1 rounded-full text-xs bg-red-600 text-white">
                          {block.block_type}
                        </span>
                      </div>
                      <Body16 className="mb-2 dark:text-gray-300"><strong>Reason:</strong> {block.reason}</Body16>
                      <Body16 className="text-sm text-rb-gray dark:text-gray-400 mb-3">
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
                </>
              )
            })()}
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div>
              {(() => {
                const filteredSessions = sessions.filter(s =>
                  sessionSearch === '' ||
                  (s.listener?.display_name || '').toLowerCase().includes(sessionSearch.toLowerCase()) ||
                  (s.seeker?.display_name || '').toLowerCase().includes(sessionSearch.toLowerCase())
                )
                return (
                  <>
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Search by listener or seeker name…"
                          value={sessionSearch}
                          onChange={e => setSessionSearch(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rb-blue"
                        />
                        {sessionSearch && (
                          <button
                            onClick={() => setSessionSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    <Body18 className="mb-4">
                      Chat Sessions ({filteredSessions.length === sessions.length ? sessions.length : `${filteredSessions.length} of ${sessions.length}`})
                    </Body18>
                    <div className="space-y-3">
                      {filteredSessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Body16 className="dark:text-gray-100">
                        <strong>{session.listener?.display_name || 'Unknown'}</strong> ↔ <strong>{session.seeker?.display_name || 'Unknown'}</strong>
                      </Body16>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        session.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <Body16 className="text-sm text-rb-gray dark:text-gray-400 mb-2">
                      Started: {new Date(session.created_at).toLocaleString()}
                    </Body16>
                    <div className="flex gap-2 flex-wrap">
                      {session.status === 'active' && (
                        <>
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
                        </>
                      )}
                      <button
                        onClick={() => {
                          if (expandedTranscript === session.id) {
                            setExpandedTranscript(null)
                          } else {
                            setTranscriptConfirm({ show: true, sessionId: session.id })
                          }
                        }}
                        className="min-h-[44px] px-4 py-3 border border-gray-300 dark:border-gray-600 text-rb-gray dark:text-gray-400 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        💬 {expandedTranscript === session.id ? 'Hide Transcript' : 'View Transcript'}
                      </button>
                    </div>
                    {expandedTranscript === session.id && (() => {
                      const msgs = transcriptMessages[session.id] || []
                      const isLoading = transcriptLoading === session.id
                      return (
                        <div className="mt-3 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                              Chat Transcript ({msgs.length} message{msgs.length !== 1 ? 's' : ''})
                            </span>
                            <span className="text-xs text-amber-400">🔒 Admin view · logged</span>
                          </div>
                          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                            {isLoading ? (
                              <div className="text-center py-4">
                                <div className="inline-block w-5 h-5 border-2 border-rb-blue border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-gray-400 mt-2">Loading transcript…</p>
                              </div>
                            ) : msgs.length === 0 ? (
                              <p className="text-sm text-gray-400 text-center py-4">No messages in this session.</p>
                            ) : (
                              msgs.map((msg, i) => {
                                const senderName = transcriptProfiles[msg.sender_id] || 'Unknown'
                                const showName = i === 0 || msgs[i - 1].sender_id !== msg.sender_id
                                const firstSenderId = msgs[0]?.sender_id
                                const isFirstSpeaker = msg.sender_id === firstSenderId
                                return (
                                  <div key={msg.id} className={`flex flex-col ${isFirstSpeaker ? 'items-start' : 'items-end'}`}>
                                    {showName && (
                                      <span className="text-xs text-gray-400 mb-1 px-1">
                                        {senderName} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm break-words ${
                                      isFirstSpeaker ? 'bg-gray-700 text-gray-100' : 'bg-rb-blue/80 text-white'
                                    }`}>
                                      {msg.content}
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <Body18>All Users ({userSearch ? `${users.filter(u => (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase()) || (u.email || '').toLowerCase().includes(userSearch.toLowerCase())).length} of ${users.length}` : users.length})</Body18>
                <button
                  onClick={copyAllUserEmails}
                  className="min-h-[36px] px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-rb-gray dark:text-gray-300 rounded-lg hover:border-rb-blue hover:text-rb-blue transition"
                >
                  {copiedId === 'users-all' ? '✓ Copied!' : `📋 Copy all ${users.length} emails`}
                </button>
              </div>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rb-blue"
                  />
                  {userSearch && (
                    <button
                      onClick={() => setUserSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Training completion summary */}
              {(() => {
                const trained = users.filter(u => u.listener_training_completed_at).length
                const untrained = users.length - trained
                return (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Listener Training:</span>
                    <span className="text-sm text-green-700 dark:text-green-400 font-medium">✓ {trained} completed</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{untrained} not yet</span>
                  </div>
                )
              })()}

              {/* Selection toolbar */}
              <div className={`flex flex-wrap items-center gap-2 mb-3 p-3 rounded-lg transition-all ${
                selectedUserIds.size > 0 ? 'bg-rb-blue-light dark:bg-gray-700 border border-rb-blue/20 dark:border-gray-600' : 'bg-gray-50 dark:bg-gray-700/50 border border-transparent'
              }`}>
                <label className="flex items-center gap-2 cursor-pointer select-none min-h-[36px] pr-3 border-r border-gray-200 dark:border-gray-600">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-rb-blue"
                    checked={users.length > 0 && users.every(u => selectedUserIds.has(u.id))}
                    onChange={toggleUserSelectAll}
                  />
                  <span className="text-sm text-rb-gray dark:text-gray-400 whitespace-nowrap">
                    {selectedUserIds.size > 0 ? `${selectedUserIds.size} selected` : 'Select all'}
                  </span>
                </label>
                {selectedUserIds.size > 0 ? (
                  <>
                    <button
                      onClick={copySelectedUserEmails}
                      className="min-h-[36px] px-3 py-1.5 text-sm bg-rb-blue text-white rounded-lg hover:bg-rb-blue-hover transition"
                    >
                      {copiedId === 'users-selected' ? '✓ Copied!' : `📋 Copy ${selectedUserIds.size} email${selectedUserIds.size !== 1 ? 's' : ''}`}
                    </button>
                    <button
                      onClick={() => setSelectedUserIds(new Set())}
                      className="min-h-[36px] px-3 py-1.5 text-sm text-rb-gray hover:text-rb-dark transition"
                    >
                      Clear
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-rb-gray dark:text-gray-400">Select users to copy their emails</span>
                )}
              </div>

              <div className="space-y-2">
                {users.filter(u =>
                  userSearch === '' ||
                  (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                  (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
                ).map((user) => {
                  const selected = selectedUserIds.has(user.id)
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUserSelect(user.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selected
                          ? 'bg-rb-blue-light dark:bg-gray-700 border-rb-blue/30 dark:border-gray-500'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-rb-blue mt-1 flex-shrink-0"
                          checked={selected}
                          onChange={() => toggleUserSelect(user.id)}
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <span className="font-semibold text-rb-dark dark:text-gray-100 text-sm">
                                {user.display_name}
                              </span>
                              {user.is_admin && <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded">Admin</span>}
                            </div>
                            <span className="text-xs text-rb-gray dark:text-gray-400 flex-shrink-0 ml-2">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-rb-gray dark:text-gray-400 truncate mb-2">{user.email}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-gray-400 dark:text-gray-500">{user.user_role} · {user.role_state}</p>
                            {user.listener_training_completed_at ? (
                              <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded">✓ Training</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-xs rounded">No training</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 ml-7" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setBlockModal({
                            show: true,
                            userId: user.id,
                            userName: user.display_name,
                            fromReport: false,
                            reportId: ''
                          })}
                          className="min-h-[36px] px-3 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          Block
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, user.display_name)}
                          className="min-h-[36px] px-3 py-1.5 bg-gray-800 text-white rounded text-xs hover:bg-gray-900"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sign-Ups Tab */}
          {activeTab === 'signups' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <Body18>Recent Sign-Ups — Last 30 Days ({signups.length})</Body18>
              </div>

              {signups.length === 0 ? (
                <Body16 className="text-rb-gray">No sign-ups in the last 30 days.</Body16>
              ) : (
                <>
                  {/* Action toolbar — shown when rows are selected */}
                  <div className={`flex flex-wrap items-center gap-2 mb-3 p-3 rounded-lg transition-all ${
                    selectedIds.size > 0 ? 'bg-rb-blue-light dark:bg-gray-700 border border-rb-blue/20 dark:border-gray-600' : 'bg-gray-50 dark:bg-gray-700/50 border border-transparent'
                  }`}>
                    <label className="flex items-center gap-2 cursor-pointer select-none min-h-[36px] pr-3 border-r border-gray-200 dark:border-gray-600">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-rb-blue"
                        checked={signups.length > 0 && signups.every(u => selectedIds.has(u.id))}
                        onChange={toggleSelectAll}
                      />
                      <span className="text-sm text-rb-gray dark:text-gray-400 whitespace-nowrap">
                        {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                      </span>
                    </label>

                    {selectedIds.size > 0 ? (
                      <>
                        <button
                          onClick={copySelectedEmails}
                          className="min-h-[36px] px-3 py-1.5 text-sm bg-rb-blue text-white rounded-lg hover:bg-rb-blue-hover transition"
                        >
                          {copiedId === 'selected' ? '✓ Copied!' : `📋 Copy ${selectedIds.size} email${selectedIds.size !== 1 ? 's' : ''}`}
                        </button>
                        <button
                          onClick={markSelectedContacted}
                          className="min-h-[36px] px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          ✉️ Mark as contacted
                        </button>
                        <button
                          onClick={() => setSelectedIds(new Set())}
                          className="min-h-[36px] px-3 py-1.5 text-sm text-rb-gray hover:text-rb-dark transition"
                        >
                          Clear
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-rb-gray dark:text-gray-400">Select users to copy emails or mark as contacted</span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                          <th className="pb-3 pr-3 w-8" />
                          <th className="pb-3 pr-4 font-semibold text-rb-dark dark:text-gray-100">Name</th>
                          <th className="pb-3 pr-4 font-semibold text-rb-dark dark:text-gray-100">Email</th>
                          <th className="pb-3 pr-4 font-semibold text-rb-dark dark:text-gray-100 hidden sm:table-cell">Role</th>
                          <th className="pb-3 pr-4 font-semibold text-rb-dark dark:text-gray-100 hidden lg:table-cell">Source</th>
                          <th className="pb-3 font-semibold text-rb-dark dark:text-gray-100 hidden md:table-cell">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {signups.map((user) => {
                          const contacted = contactedIds.has(user.id)
                          const selected = selectedIds.has(user.id)
                          return (
                            <tr
                              key={user.id}
                              onClick={() => toggleSelect(user.id)}
                              className={`cursor-pointer transition-colors ${
                                selected ? 'bg-rb-blue-light dark:bg-gray-700' :
                                contacted ? 'bg-gray-50 dark:bg-gray-700/50 opacity-60' :
                                'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                              }`}
                            >
                              <td className="py-3 pr-3">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded accent-rb-blue"
                                  checked={selected}
                                  onChange={() => toggleSelect(user.id)}
                                  onClick={e => e.stopPropagation()}
                                />
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-medium ${contacted ? 'text-rb-gray dark:text-gray-500' : 'text-rb-dark dark:text-gray-100'}`}>
                                    {user.display_name}
                                  </span>
                                  {user.is_admin && (
                                    <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded">Admin</span>
                                  )}
                                  {contacted && (
                                    <span
                                      className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs rounded cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition"
                                      title="Click to undo"
                                      onClick={e => { e.stopPropagation(); unmarkContacted(user.id) }}
                                    >
                                      ✉️ Contacted
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-rb-gray dark:text-gray-400 font-mono text-xs break-all">
                                    {user.email || '—'}
                                  </span>
                                  {user.email && (
                                    <button
                                      onClick={e => { e.stopPropagation(); copyEmail(user.id, user.email) }}
                                      className="shrink-0 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-rb-blue hover:text-white transition"
                                      title="Copy email"
                                    >
                                      {copiedId === user.id ? '✓' : '📋'}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-4 hidden sm:table-cell text-rb-gray dark:text-gray-400">
                                {user.user_role === 'person_in_recovery' ? 'Person in Recovery'
                                  : user.user_role === 'professional' ? 'Allies in Long-Term Recovery'
                                  : user.user_role === 'ally' ? 'Recovery Support'
                                  : <span className="italic text-gray-400">Not set</span>}
                              </td>
                              <td className="py-3 pr-4 hidden lg:table-cell text-rb-gray dark:text-gray-400 text-xs">
                                {user.referral_source === 'facebook' ? '👍 Facebook'
                                  : user.referral_source === 'instagram' ? '📸 Instagram'
                                  : user.referral_source === 'threads' ? '🧵 Threads'
                                  : user.referral_source === 'tiktok' ? '🎵 TikTok'
                                  : user.referral_source === 'website_blog' ? '🌐 Website/Blog'
                                  : user.referral_source === 'search_engine' ? '🔍 Search Engine'
                                  : user.referral_source === 'friend_family' ? '🤝 Friend/Family'
                                  : user.referral_source === 'other' ? '💬 Other'
                                  : <span className="italic text-gray-300">—</span>}
                              </td>
                              <td className="py-3 hidden md:table-cell text-rb-gray dark:text-gray-400 text-xs">
                                {new Date(user.created_at).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                  hour: 'numeric', minute: '2-digit', hour12: true,
                                })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
          {/* Stories Tab */}
          {activeTab === 'stories' && (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <Body18>Stories</Body18>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStoriesFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${storiesFilter === 'pending' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  >
                    Pending ({stories.filter(s => s.status === 'submitted').length})
                  </button>
                  <button
                    onClick={() => setStoriesFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${storiesFilter === 'all' ? 'bg-rb-blue text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  >
                    All ({stories.length})
                  </button>
                </div>
              </div>

              {(() => {
                const filtered = storiesFilter === 'pending'
                  ? stories.filter(s => s.status === 'submitted')
                  : stories

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <p className="text-4xl mb-3">📝</p>
                      <Body16 className="text-rb-gray">
                        {storiesFilter === 'pending' ? 'No stories awaiting review.' : 'No stories yet.'}
                      </Body16>
                    </div>
                  )
                }

                return (
                  <div className="space-y-3">
                    {filtered.map((story) => (
                      <div key={story.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#2D3436] dark:text-gray-100 truncate">{story.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              by {story.author?.display_name ?? 'Unknown'} ·{' '}
                              {new Date(story.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            story.status === 'published' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
                            story.status === 'submitted' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-200' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            {story.status === 'submitted' ? 'Pending' : story.status.charAt(0).toUpperCase() + story.status.slice(1)}
                          </span>
                        </div>

                        {story.status === 'published' && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                            Published {story.published_at ? new Date(story.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            {' · '}
                            <a href={`/stories/${story.slug}`} target="_blank" rel="noopener noreferrer" className="text-rb-blue hover:underline">
                              View ↗
                            </a>
                          </p>
                        )}

                        {/* Reject note input */}
                        {rejectingStoryId === story.id && (
                          <div className="mb-3">
                            <textarea
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                              placeholder="Optional: explain what needs to change…"
                              rows={2}
                              className="w-full px-3 py-2 border border-amber-200 dark:border-amber-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {story.status === 'submitted' && (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    await adminFetch({ action: 'publish_story', storyId: story.id })
                                    await loadStories()
                                    setSuccessModal({ show: true, message: `"${story.title}" published successfully.` })
                                  } catch (err: any) {
                                    setErrorModal({ show: true, message: err.message })
                                  }
                                }}
                                className="min-h-[36px] px-4 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition font-medium"
                              >
                                ✓ Publish
                              </button>
                              {rejectingStoryId === story.id ? (
                                <>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await adminFetch({ action: 'reject_story', storyId: story.id, rejectionNote: rejectNote })
                                        setRejectingStoryId(null)
                                        setRejectNote('')
                                        await loadStories()
                                      } catch (err: any) {
                                        setErrorModal({ show: true, message: err.message })
                                      }
                                    }}
                                    className="min-h-[36px] px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition font-medium"
                                  >
                                    Send Back
                                  </button>
                                  <button
                                    onClick={() => { setRejectingStoryId(null); setRejectNote('') }}
                                    className="min-h-[36px] px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setRejectingStoryId(story.id)}
                                  className="min-h-[36px] px-4 py-1.5 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition font-medium"
                                >
                                  Return for Revision
                                </button>
                              )}
                            </>
                          )}
                          {story.status === 'published' && (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    const act = story.is_pinned ? 'unpin_story' : 'pin_story'
                                    await adminFetch({ action: act, storyId: story.id })
                                    await loadStories()
                                  } catch (err: any) {
                                    setErrorModal({ show: true, message: err.message })
                                  }
                                }}
                                className={`min-h-[36px] px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                                  story.is_pinned
                                    ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/40'
                                    : 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                {story.is_pinned ? '📌 Pinned' : '📌 Pin'}
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('Unpublish this story? It will return to draft status.')) return
                                  try {
                                    await adminFetch({ action: 'unpublish_story', storyId: story.id })
                                    await loadStories()
                                  } catch (err: any) {
                                    setErrorModal({ show: true, message: err.message })
                                  }
                                }}
                                className="min-h-[36px] px-4 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                              >
                                Unpublish
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              rows={3}
              placeholder="Enter the reason for blocking this user..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Block Type</label>
            <select
              value={blockInput.type}
              onChange={(e) => setBlockInput({ ...blockInput, type: e.target.value as 'temporary' | 'permanent' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue dark:bg-gray-700 dark:text-gray-100"
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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="font-semibold mb-2 dark:text-gray-200">This will remove ALL of their data:</p>
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
          <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-center">
            <code className="font-mono font-semibold dark:text-gray-100">{deleteUserModal.displayName}</code>
          </div>
          <input
            type="text"
            value={deleteUserModal.confirmName}
            onChange={(e) => setDeleteUserModal({ ...deleteUserModal, confirmName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
            placeholder="Type the name to confirm deletion"
          />
        </div>
      </Modal>

      {/* Transcript Confirmation Modal */}
      <Modal
        isOpen={transcriptConfirm.show}
        onClose={() => setTranscriptConfirm({ show: false, sessionId: '' })}
        title="View Private Conversation"
        type="confirm"
        onConfirm={() => {
          const { sessionId, reportId } = transcriptConfirm
          setTranscriptConfirm({ show: false, sessionId: '' })
          loadTranscript(sessionId, reportId)
        }}
        confirmText="View Transcript"
        confirmStyle="primary"
      >
        <div className="space-y-3">
          <p>You are about to view a private chat session for moderation purposes.</p>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ This action will be recorded in the admin audit log.
            </p>
          </div>
          <p className="text-sm text-rb-gray">Only view transcripts when investigating a report or verifying conduct. Transcripts should not be accessed for any other purpose.</p>
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
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
