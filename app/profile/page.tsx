'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import AvatarUpload from '@/components/AvatarUpload'
import Modal from '@/components/Modal'
import { SkeletonProfile } from '@/components/Skeleton'
import Footer from '@/components/Footer'

interface Profile {
  id: string
  display_name: string
  email: string
  bio: string | null
  tagline: string | null
  role_state: string | null
  tags: string[] | null
  avatar_url: string | null
  user_role: string | null
  is_admin: boolean | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(field: string) {
    if (!profile) return

    setSaving(true)
    try {
      // Check if username is already taken (only for display_name field)
      if (field === 'display_name' && editValue !== profile.display_name) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('display_name', editValue)
          .single()

        if (existingProfile) {
          setErrorModal({ show: true, message: 'This username is already taken. Please choose another.' })
          setSaving(false)
          return
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ [field]: editValue })
        .eq('id', profile.id)

      if (error) {
        // Handle unique constraint violation
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
          setErrorModal({ show: true, message: 'This username is already taken. Please choose another.' })
        } else {
          throw error
        }
        return
      }

      setProfile({ ...profile, [field]: editValue })
      setEditingField(null)
    } catch (error) {
      console.error('Error updating profile:', error)
      setErrorModal({ show: true, message: 'We couldn\'t save your changes right now. Please try again in a moment.' })
    } finally {
      setSaving(false)
    }
  }

  function startEditing(field: string, currentValue: any) {
    setEditingField(field)
    setEditValue(currentValue || '')
  }

  function cancelEditing() {
    setEditingField(null)
    setEditValue('')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'delete') {
      return
    }

    if (!profile) return

    setDeleting(true)
    try {
      // Delete the user account (this will cascade delete the profile due to foreign key)
      const { error } = await supabase.auth.admin.deleteUser(profile.id)

      if (error) {
        // If admin delete fails (requires service role), try deleting profile directly
        // Note: This requires RLS policy allowing users to delete their own profile
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', profile.id)

        if (profileError) throw profileError
      }

      // Sign out and redirect to homepage
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error deleting account:', error)
      setErrorModal({
        show: true,
        message: 'We couldn\'t delete your account right now. Please contact support or try again later.'
      })
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
      setDeleteConfirmText('')
    }
  }

  if (loading) {
    return (
      <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-rb-blue/5 via-rb-white to-rb-blue/10">
      <div className="max-w-2xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-40 mb-4" />
          </div>

          {/* Profile skeleton */}
          <div role="status" aria-label="Loading profile">
            <SkeletonProfile />
          </div>
      </div>
      </main>
    )
  }

  if (!profile) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-rb-blue/5 via-rb-white to-rb-blue/10">
          <Body16>Profile not found</Body16>
        </main>
    )
  }

  return (
    <main id="main-content" className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#F8F9FA' }}>
    <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-rb-blue transition mb-2"
            >
              ← Dashboard
            </button>
            <Heading1 className="text-2xl sm:text-3xl mb-1">Profile</Heading1>
            <Body16 className="text-gray-500 text-sm">Manage your account settings</Body16>
          </div>
          <div className="flex gap-2">
            {profile.is_admin && (
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition whitespace-nowrap"
              >
                Admin
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="px-5 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Profile Picture */}
        <div className="flex justify-center mb-10">
          <AvatarUpload
            userId={profile.id}
            currentAvatarUrl={profile.avatar_url}
            onUploadComplete={(url) => setProfile({ ...profile, avatar_url: url })}
          />
        </div>

        <div className="space-y-3">
          {/* Display Name */}
          <div className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-2">
              <Body16 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Display Name</Body16>
              {editingField !== 'display_name' && (
                <button
                  onClick={() => startEditing('display_name', profile.display_name)}
                  className="text-gray-400 hover:text-rb-blue transition"
                  aria-label="Edit display name"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            {editingField === 'display_name' ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('display_name')}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Body18 className="text-gray-900">{profile.display_name}</Body18>
            )}
          </div>

          {/* Email (not editable) */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <Body16 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email</Body16>
            <Body18 className="text-gray-900">{profile.email}</Body18>
          </div>

          {/* Tagline */}
          <div className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-2">
              <Body16 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tagline</Body16>
              {editingField !== 'tagline' && (
                <button
                  onClick={() => startEditing('tagline', profile.tagline)}
                  className="text-gray-400 hover:text-rb-blue transition"
                  aria-label="Edit tagline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            {editingField === 'tagline' ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value.slice(0, 60))}
                  maxLength={60}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all"
                  placeholder="e.g., 5 years sober, here to help"
                />
                <Body16 className="text-gray-500 text-xs">
                  This appears next to your name when you're available to listen. {editValue.length}/60 characters
                </Body16>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('tagline')}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Body16 className="text-gray-700 leading-relaxed italic">
                "{profile.tagline || 'Available to listen'}"
              </Body16>
            )}
          </div>

          {/* Bio */}
          <div className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-2">
              <Body16 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">About</Body16>
              {editingField !== 'bio' && (
                <button
                  onClick={() => startEditing('bio', profile.bio)}
                  className="text-gray-400 hover:text-rb-blue transition"
                  aria-label="Edit bio"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            {editingField === 'bio' ? (
              <div className="space-y-3">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all resize-none"
                  placeholder="Tell us about yourself..."
                />
                <Body16 className="text-gray-500 text-xs leading-relaxed">
                  Share what brings you to RecoveryBridge, what recovery means to you, or what helps you most in your journey.
                </Body16>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('bio')}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Body16 className="text-gray-700 leading-relaxed">{profile.bio || 'No bio yet'}</Body16>
            )}
          </div>

          {/* User Role */}
          <div className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-2">
              <Body16 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</Body16>
              {editingField !== 'user_role' && (
                <button
                  onClick={() => startEditing('user_role', profile.user_role)}
                  className="text-gray-400 hover:text-rb-blue transition"
                  aria-label="Edit role"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            {editingField === 'user_role' ? (
              <div className="space-y-3">
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all"
                >
                  <option value="">Select your role...</option>
                  <option value="person_in_recovery">Person in Recovery</option>
                  <option value="professional">Allies for Long-Term Recovery</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('user_role')}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Body18 className="text-gray-900">
                {profile.user_role === 'person_in_recovery' && 'Person in Recovery'}
                {profile.user_role === 'professional' && 'Allies for Long-Term Recovery'}
                {profile.user_role === 'ally' && 'Recovery Support (Legacy)'}
                {!profile.user_role && 'Not set'}
              </Body18>
            )}
          </div>
        </div>

        {/* Delete Account */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 text-gray-500 text-sm hover:text-red-600 transition-all underline"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Error Modal */}
      <Modal
        isOpen={errorModal.show}
        onClose={() => setErrorModal({ show: false, message: '' })}
        title="Unable to Save"
        confirmText="OK"
        confirmStyle="primary"
      >
        <p>{errorModal.message}</p>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl" role="img" aria-label="Warning">⚠️</span>
              <Heading1 className="text-2xl">Delete Account</Heading1>
            </div>

            <Body16 className="mb-4 text-red-700">
              <strong>This action cannot be undone.</strong> All your data including:
            </Body16>

            <ul className="mb-4 text-sm text-rb-gray space-y-1 ml-5 list-disc">
              <li>Profile information</li>
              <li>Chat history</li>
              <li>Connections</li>
              <li>All account data</li>
            </ul>

            <Body16 className="mb-4">
              will be permanently deleted.
            </Body16>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <Body16 className="font-semibold mb-2">
                Type <span className="text-red-600 font-mono">delete</span> to confirm:
              </Body16>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toLowerCase())}
                className="w-full px-4 py-3 border-2 border-rb-gray/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                placeholder="Type 'delete' here"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 px-5 py-2.5 border-2 border-rb-gray/30 rounded-full text-sm font-semibold hover:bg-rb-gray/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'delete' || deleting}
                className="flex-1 px-5 py-2.5 bg-red-600 text-white rounded-full text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
