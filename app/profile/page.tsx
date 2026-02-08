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
    <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-rb-blue/5 via-rb-white to-rb-blue/10">
    <div className="max-w-2xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 border border-rb-gray/10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Heading1 className="text-2xl sm:text-3xl mb-2">Your Profile</Heading1>
              <Body16 className="text-rb-gray italic">"Your story matters here"</Body16>
            </div>
            <div className="flex gap-2 sm:gap-3">
              {profile.is_admin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-3 sm:px-4 py-2 text-sm bg-rb-dark text-white rounded-lg hover:bg-rb-dark/90 transition whitespace-nowrap"
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="min-h-[44px] px-4 sm:px-6 py-3 text-sm bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full hover:shadow-lg transition-all transform hover:scale-105 whitespace-nowrap"
              >
                Sign Out
              </button>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 min-h-[44px] py-2 text-sm text-rb-blue hover:text-rb-blue-hover font-semibold transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Profile Picture */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <AvatarUpload
            userId={profile.id}
            currentAvatarUrl={profile.avatar_url}
            onUploadComplete={(url) => setProfile({ ...profile, avatar_url: url })}
          />
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Display Name */}
          <div className="bg-white rounded-xl border-2 border-rb-gray/20 shadow-sm p-5 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" role="img" aria-label="Name tag">👤</span>
                <Body18>Display Name</Body18>
              </div>
              {editingField !== 'display_name' && (
                <button
                  onClick={() => startEditing('display_name', profile.display_name)}
                  className="min-h-[44px] px-4 py-2 text-sm text-rb-blue hover:text-rb-blue-hover font-semibold transition"
                >
                  Edit
                </button>
              )}
            </div>
            {editingField === 'display_name' ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-rb-gray/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('display_name')}
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition-all transform hover:scale-105"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-5 py-2.5 border-2 border-rb-gray/30 rounded-full text-sm font-semibold hover:bg-rb-gray/5 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Body16 className="text-[#2D3436]">{profile.display_name}</Body16>
            )}
          </div>

          {/* Email (not editable) */}
          <div className="bg-white rounded-xl border-2 border-rb-gray/20 shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl" role="img" aria-label="Email">📧</span>
              <Body18>Email</Body18>
            </div>
            <Body16 className="text-[#2D3436]">{profile.email}</Body16>
          </div>

          {/* Bio */}
          <div className="bg-white rounded-xl border-2 border-rb-gray/20 shadow-sm p-5 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" role="img" aria-label="About">✍️</span>
                <Body18>Bio</Body18>
              </div>
              {editingField !== 'bio' && (
                <button
                  onClick={() => startEditing('bio', profile.bio)}
                  className="min-h-[44px] px-4 py-2 text-sm text-rb-blue hover:text-rb-blue-hover font-semibold transition"
                >
                  Edit
                </button>
              )}
            </div>
            {editingField === 'bio' ? (
              <div className="space-y-3">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-rb-gray/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all"
                  placeholder="Tell us about yourself..."
                />
                <Body16 className="text-rb-gray text-sm">
                  💭 Not sure what to share? Consider: What brings you to RecoveryBridge? What does recovery look like for you? What's one thing you'd like others to know about you? What helps you most in your recovery journey?
                </Body16>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('bio')}
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition-all transform hover:scale-105"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-5 py-2.5 border-2 border-rb-gray/30 rounded-full text-sm font-semibold hover:bg-rb-gray/5 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Body16 className="text-[#2D3436] leading-relaxed">{profile.bio || 'No bio yet'}</Body16>
            )}
          </div>

          {/* Tagline */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 shadow-sm p-5 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" role="img" aria-label="Tagline">💬</span>
                <Body18>Available Listeners Tagline</Body18>
              </div>
              {editingField !== 'tagline' && (
                <button
                  onClick={() => startEditing('tagline', profile.tagline)}
                  className="min-h-[44px] px-4 py-2 text-sm text-rb-blue hover:text-rb-blue-hover font-semibold transition"
                >
                  Edit
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
                  className="w-full px-4 py-3 border-2 border-rb-gray/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all"
                  placeholder="e.g., 5 years sober, here to help"
                />
                <Body16 className="text-rb-gray text-sm">
                  📝 This short message appears next to your name in the "Available Listeners" section. Keep it under 60 characters. Examples: "Available to listen" or "Recovery is possible"
                </Body16>
                <Body16 className="text-rb-gray text-xs">
                  {editValue.length}/60 characters
                </Body16>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('tagline')}
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition-all transform hover:scale-105"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-5 py-2.5 border-2 border-rb-gray/30 rounded-full text-sm font-semibold hover:bg-rb-gray/5 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Body16 className="text-[#2D3436] leading-relaxed italic">
                "{profile.tagline || 'Available to listen'}"
              </Body16>
            )}
          </div>

          {/* User Role */}
          <div className="bg-white rounded-xl border-2 border-rb-gray/20 shadow-sm p-5 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl" role="img" aria-label="Role">🎯</span>
                <Body18>Your Role</Body18>
              </div>
              {editingField !== 'user_role' && (
                <button
                  onClick={() => startEditing('user_role', profile.user_role)}
                  className="min-h-[44px] px-4 py-2 text-sm text-rb-blue hover:text-rb-blue-hover font-semibold transition"
                >
                  Edit
                </button>
              )}
            </div>
            {editingField === 'user_role' ? (
              <div className="space-y-3">
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-rb-gray/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-rb-blue focus:border-transparent transition-all"
                >
                  <option value="">Select your role...</option>
                  <option value="person_in_recovery">Person in Recovery</option>
                  <option value="professional">Allies for Long-Term Recovery</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('user_role')}
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full text-sm font-semibold hover:shadow-lg disabled:opacity-50 transition-all transform hover:scale-105"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-5 py-2.5 border-2 border-rb-gray/30 rounded-full text-sm font-semibold hover:bg-rb-gray/5 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Body16 className="text-[#2D3436]">
                {profile.user_role === 'person_in_recovery' && 'Person in Recovery'}
                {profile.user_role === 'professional' && 'Allies for Long-Term Recovery'}
                {profile.user_role === 'ally' && 'Recovery Support (Legacy)'}
                {!profile.user_role && 'Not set'}
              </Body16>
            )}
          </div>
        </div>

        {/* Danger Zone - Delete Account */}
        <div className="mt-8 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-300 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl" role="img" aria-label="Warning">⚠️</span>
            <Body18 className="font-bold text-red-700">Danger Zone</Body18>
          </div>
          <Body16 className="text-red-700 mb-4">
            Once you delete your account, there is no going back. All your data, conversations, and profile information will be permanently deleted.
          </Body16>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 bg-red-600 text-white rounded-full text-sm font-semibold hover:bg-red-700 transition-all"
          >
            Delete My Account
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
