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

  if (loading) {
    return (
      <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-rb-white">
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
      <main id="main-content" className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-rb-white">
        <Body16>Profile not found</Body16>
      </main>
    )
  }

  return (
    <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-rb-white">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-4">
            <Heading1 className="text-2xl sm:text-3xl">Your Profile</Heading1>
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
                className="min-h-[44px] px-4 sm:px-6 py-3 text-sm bg-rb-blue text-white rounded-full hover:bg-rb-blue-hover transition whitespace-nowrap"
              >
                Sign Out
              </button>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-block min-h-[44px] py-3 text-sm text-rb-blue hover:text-rb-blue-hover transition"
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
          <div className="border border-rb-gray/30 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <Body18>Display Name</Body18>
              {editingField !== 'display_name' && (
                <button
                  onClick={() => startEditing('display_name', profile.display_name)}
                  className="text-sm text-rb-dark hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingField === 'display_name' ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-rb-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-dark"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('display_name')}
                    disabled={saving}
                    className="px-4 py-2 bg-rb-dark text-white rounded-lg text-sm hover:bg-rb-dark/90 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 border border-rb-gray/30 rounded-lg text-sm hover:bg-rb-gray/5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Body16>{profile.display_name}</Body16>
            )}
          </div>

          {/* Email (not editable) */}
          <div className="border border-rb-gray/30 rounded-lg p-4">
            <Body18 className="mb-2">Email</Body18>
            <Body16>{profile.email}</Body16>
          </div>

          {/* Bio */}
          <div className="border border-rb-gray/30 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <Body18>Bio</Body18>
              {editingField !== 'bio' && (
                <button
                  onClick={() => startEditing('bio', profile.bio)}
                  className="text-sm text-rb-dark hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingField === 'bio' ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-rb-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-dark"
                  placeholder="Tell us about yourself..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('bio')}
                    disabled={saving}
                    className="px-4 py-2 bg-rb-dark text-white rounded-lg text-sm hover:bg-rb-dark/90 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 border border-rb-gray/30 rounded-lg text-sm hover:bg-rb-gray/5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Body16>{profile.bio || 'No bio yet'}</Body16>
            )}
          </div>

          {/* User Role */}
          <div className="border border-rb-gray/30 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <Body18>Your Role</Body18>
              {editingField !== 'user_role' && (
                <button
                  onClick={() => startEditing('user_role', profile.user_role)}
                  className="text-sm text-rb-dark hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingField === 'user_role' ? (
              <div className="space-y-2">
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-rb-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-dark"
                >
                  <option value="">Select your role...</option>
                  <option value="person_in_recovery">People in Recovery</option>
                  <option value="professional">Allies in Long-Term Recovery</option>
                  <option value="ally">Recovery Support</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave('user_role')}
                    disabled={saving}
                    className="px-4 py-2 bg-rb-dark text-white rounded-lg text-sm hover:bg-rb-dark/90 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 border border-rb-gray/30 rounded-lg text-sm hover:bg-rb-gray/5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Body16>
                {profile.user_role === 'person_in_recovery' && 'People in Recovery'}
                {profile.user_role === 'professional' && 'Allies in Long-Term Recovery'}
                {profile.user_role === 'ally' && 'Recovery Support'}
                {!profile.user_role && 'Not set'}
              </Body16>
            )}
          </div>
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
    </main>
  )
}
