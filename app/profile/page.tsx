'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import AvatarUpload from '@/components/AvatarUpload'
import Modal from '@/components/Modal'
import { SkeletonProfile } from '@/components/Skeleton'
import Footer from '@/components/Footer'
import NotificationSettings from '@/components/NotificationSettings'
import TagSelector from '@/components/TagSelector'
import type { Profile, FavoriteWithProfile, ThankYouNoteWithSender } from '@/lib/types/database'

// E.164 phone number validation (same as lib/sms.ts but client-safe)
function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone)
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const [editingTags, setEditingTags] = useState(false)
  const [pendingTags, setPendingTags] = useState<string[]>([])
  const [savingTags, setSavingTags] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [savingSms, setSavingSms] = useState(false)
  const [smsSuccess, setSmsSuccess] = useState<string | null>(null)
  const [smsError, setSmsError] = useState<string | null>(null)
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<FavoriteWithProfile[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [favoritesExpanded, setFavoritesExpanded] = useState(false)
  const [removingFavorite, setRemovingFavorite] = useState<string | null>(null)
  const [thankYouNotes, setThankYouNotes] = useState<ThankYouNoteWithSender[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
    loadFavorites()
    loadThankYouNotes()
  }, [])

  // Sync SMS and email state when profile loads
  useEffect(() => {
    if (profile) {
      setPhoneNumber(profile.phone_number || '')
      setSmsEnabled(profile.sms_notifications_enabled || false)
      setEmailNotificationsEnabled(profile.email_notifications_enabled || false)
    }
  }, [profile?.phone_number, profile?.sms_notifications_enabled, profile?.email_notifications_enabled])

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
      // Attempt to update the field directly
      // The database unique constraint will handle username conflicts atomically
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

  function startEditing(field: string, currentValue: string | null) {
    setEditingField(field)
    setEditValue(currentValue || '')
  }

  function cancelEditing() {
    setEditingField(null)
    setEditValue('')
  }

  async function handleSaveTags() {
    if (!profile) return
    setSavingTags(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tags: pendingTags })
        .eq('id', profile.id)

      if (error) throw error
      setProfile({ ...profile, tags: pendingTags })
      setEditingTags(false)
    } catch (error) {
      console.error('Error saving tags:', error)
      setErrorModal({ show: true, message: 'We couldn\'t save your tags right now. Please try again.' })
    } finally {
      setSavingTags(false)
    }
  }

  async function handleSaveSms() {
    if (!profile) return

    setSavingSms(true)
    setSmsError(null)
    setSmsSuccess(null)

    // Validate phone number if SMS is being enabled
    if (smsEnabled && !phoneNumber.trim()) {
      setSmsError('Please enter a phone number to enable SMS notifications.')
      setSavingSms(false)
      return
    }

    if (phoneNumber.trim() && !isValidE164(phoneNumber.trim())) {
      setSmsError('Please enter a valid phone number in E.164 format (e.g., +15551234567).')
      setSavingSms(false)
      return
    }

    try {
      const updateData: Record<string, unknown> = {
        phone_number: phoneNumber.trim() || null,
        sms_notifications_enabled: smsEnabled && !!phoneNumber.trim(),
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id)
        .select()
        .single()

      if (error) throw error

      if (data) setProfile(data)

      setSmsSuccess(smsEnabled
        ? 'SMS notifications enabled. You\'ll receive a text when push notifications can\'t reach you.'
        : 'SMS settings saved.'
      )
      setTimeout(() => setSmsSuccess(null), 5000)
    } catch (error: any) {
      console.error('Error saving SMS settings:', error)
      setSmsError('Failed to save SMS settings. Please check your phone number format and try again.')
    } finally {
      setSavingSms(false)
    }
  }

  async function handleSaveEmailNotifications(enabled: boolean) {
    if (!profile) return
    setSavingEmail(true)
    setEmailSuccess(null)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ email_notifications_enabled: enabled })
        .eq('id', profile.id)
        .select()
        .single()

      if (error) throw error
      if (data) setProfile(data)
      setEmailNotificationsEnabled(enabled)
      setEmailSuccess(enabled ? 'Email notifications enabled.' : 'Email notifications disabled.')
      setTimeout(() => setEmailSuccess(null), 4000)
    } catch (err) {
      console.error('Error saving email notification setting:', err)
      // Roll back the toggle visually
      setEmailNotificationsEnabled(!enabled)
    } finally {
      setSavingEmail(false)
    }
  }

  async function loadFavorites() {
    try {
      setFavoritesLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          id,
          user_id,
          favorite_user_id,
          created_at,
          favorite_profile:profiles!user_favorites_favorite_user_id_fkey(
            display_name, bio, tagline, avatar_url, role_state,
            always_available, last_heartbeat_at, tags, user_role
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFavorites((data as unknown as FavoriteWithProfile[]) || [])
    } catch (err) {
      console.error('Error loading favorites:', err)
    } finally {
      setFavoritesLoading(false)
    }
  }

  async function loadThankYouNotes() {
    try {
      setNotesLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('session_feedback')
        .select(`
          id,
          session_id,
          from_user_id,
          to_user_id,
          helpful,
          thank_you_note,
          created_at,
          sender_profile:profiles!session_feedback_from_user_id_fkey(
            display_name, avatar_url
          )
        `)
        .eq('to_user_id', user.id)
        .not('thank_you_note', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setThankYouNotes((data as unknown as ThankYouNoteWithSender[]) || [])
    } catch (err) {
      console.error('Error loading thank-you notes:', err)
    } finally {
      setNotesLoading(false)
    }
  }

  async function handleRemoveFavorite(favoriteId: string, favoriteUserId: string) {
    if (removingFavorite) return
    setRemovingFavorite(favoriteId)

    // Optimistic removal
    setFavorites(prev => prev.filter(f => f.id !== favoriteId))

    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('id', favoriteId)

      if (error) throw error
    } catch (err) {
      console.error('Error removing favorite:', err)
      // Roll back
      loadFavorites()
    } finally {
      setRemovingFavorite(null)
    }
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
    let deletionSucceeded = false

    try {
      // Try to delete the user account (this will cascade delete the profile due to foreign key)
      const { error: adminError } = await supabase.auth.admin.deleteUser(profile.id)

      if (adminError) {
        // If admin delete fails (requires service role), try deleting profile directly
        // Note: This requires RLS policy allowing users to delete their own profile
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', profile.id)

        if (profileError) {
          // Check if it's a foreign key constraint error
          if (profileError.message?.includes('violates foreign key constraint')) {
            throw new Error('Your account has active data that must be cleaned up first. Please end any active sessions and try again, or contact support for assistance.')
          }
          // Check if it's a permissions error
          if (profileError.message?.includes('permission denied') || profileError.message?.includes('RLS')) {
            throw new Error('Account deletion is not available through this method. Please contact support to delete your account.')
          }
          throw new Error('We couldn\'t delete your account. Please try again or contact support if the problem persists.')
        }
      }

      deletionSucceeded = true

      // Try to sign out
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        // Account was deleted but sign out failed - still redirect
        console.error('Sign out error after account deletion:', signOutError)
      }

      // Redirect to homepage
      router.push('/')
    } catch (error: any) {
      console.error('Error deleting account:', error)

      // If deletion succeeded but we hit an error after, still redirect
      if (deletionSucceeded) {
        router.push('/')
        return
      }

      setErrorModal({
        show: true,
        message: error.message || 'We couldn\'t delete your account right now. Please try again or contact support if the problem persists.'
      })
    } finally {
      setDeleting(false)
      if (!deletionSucceeded) {
        setShowDeleteModal(false)
        setDeleteConfirmText('')
      }
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
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-8 border border-rb-gray/10">
          <div className="flex flex-wrap justify-between items-center gap-3">
            {/* Left: Logo and Navigation */}
            <div className="flex items-center gap-2 sm:gap-4">
              <img
                src="/logo-icon.png"
                alt="RecoveryBridge"
                className="h-10 sm:h-12 w-auto"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="min-h-[44px] px-3 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full text-sm font-semibold hover:shadow-lg transition-all whitespace-nowrap"
                >
                  Dashboard
                </button>
                {profile.is_admin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="min-h-[44px] px-3 sm:px-5 py-2 sm:py-2.5 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold hover:bg-gray-200 transition-all whitespace-nowrap"
                  >
                    Admin
                  </button>
                )}
              </div>
            </div>

            {/* Right: Sign Out */}
            <button
              onClick={handleSignOut}
              className="min-h-[44px] px-3 sm:px-5 py-2 sm:py-2.5 bg-gray-900 text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-all whitespace-nowrap"
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
                "{profile.tagline || 'Person in Recovery'}"
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

          {/* Specialty Tags */}
          <div className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-2">
              <Body16 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Specialty Tags</Body16>
              {!editingTags && (
                <button
                  onClick={() => {
                    setPendingTags(profile.tags || [])
                    setEditingTags(true)
                  }}
                  className="text-gray-400 hover:text-rb-blue transition"
                  aria-label="Edit specialty tags"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            {editingTags ? (
              <div className="space-y-3">
                <Body16 className="text-sm text-gray-600">
                  Select topics you can help with. This helps seekers find the right listener.
                </Body16>
                <TagSelector
                  selectedTags={pendingTags}
                  onChange={setPendingTags}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveTags}
                    disabled={savingTags}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-all"
                  >
                    {savingTags ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingTags(false)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {profile.tags && profile.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-rb-blue/10 text-rb-blue">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <Body16 className="text-gray-500 italic text-sm">No specialty tags set</Body16>
                )}
              </div>
            )}
          </div>

        {/* Notification Settings */}
        <div className="mt-6">
          <NotificationSettings
            profile={profile}
            onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)}
          />
        </div>

        {/* Email Notifications */}
        <div className="mt-4 bg-white rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">✉️</span>
            <Body16 className="font-semibold text-gray-900">Email Notifications</Body16>
          </div>
          <Body16 className="text-sm text-gray-600 mb-4">
            Get an email when someone needs support and push notifications can&apos;t reach you. Your email address is never shared with other users.
          </Body16>

          {emailSuccess && (
            <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 rounded">
              <Body16 className="text-sm text-green-700">{emailSuccess}</Body16>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label htmlFor="email-notifications" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
              Receive email notification fallbacks
            </label>
            <button
              id="email-notifications"
              role="switch"
              aria-checked={emailNotificationsEnabled}
              onClick={() => {
                const next = !emailNotificationsEnabled
                setEmailNotificationsEnabled(next)
                handleSaveEmailNotifications(next)
              }}
              disabled={savingEmail}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rb-blue focus:ring-offset-2 disabled:opacity-50 ${
                emailNotificationsEnabled ? 'bg-rb-blue' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  emailNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <Body16 className="text-xs text-gray-500 mt-2 italic">
            Emails are sent from RecoveryBridge — you must opt in here to receive them.
          </Body16>
        </div>

        {/* My Favorites */}
        <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={() => setFavoritesExpanded(prev => !prev)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={favoritesExpanded}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <Body16 className="font-semibold text-gray-900">My Favorites</Body16>
              {!favoritesLoading && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {favorites.length}
                </span>
              )}
            </div>
            <span className={`text-gray-400 transition-transform duration-200 ${favoritesExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {favoritesExpanded && (
            <div className="border-t border-gray-100 px-5 pb-5 pt-4">
              {favoritesLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-40"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No favorites yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    After a session ends you can save people you'd like to connect with again.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favorites.map(fav => (
                    <div key={fav.id} className="flex items-center gap-3">
                      {/* Avatar */}
                      {fav.favorite_profile.avatar_url ? (
                        <img
                          src={fav.favorite_profile.avatar_url}
                          alt={fav.favorite_profile.display_name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-rb-blue flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {fav.favorite_profile.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Body16 className="font-semibold text-gray-900 truncate text-sm">
                          {fav.favorite_profile.display_name}
                        </Body16>
                        {fav.favorite_profile.tagline ? (
                          <p className="text-xs text-gray-500 truncate italic">&quot;{fav.favorite_profile.tagline}&quot;</p>
                        ) : fav.favorite_profile.bio ? (
                          <p className="text-xs text-gray-500 truncate">
                            {fav.favorite_profile.bio.length > 50
                              ? fav.favorite_profile.bio.substring(0, 50) + '...'
                              : fav.favorite_profile.bio}
                          </p>
                        ) : null}
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveFavorite(fav.id, fav.favorite_user_id)}
                        disabled={removingFavorite === fav.id}
                        aria-label={`Remove ${fav.favorite_profile.display_name} from favorites`}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-40"
                      >
                        {removingFavorite === fav.id ? (
                          <span className="text-xs text-gray-400">...</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SMS Notifications — hidden until Twilio verification is complete
        <div className="mt-4 bg-white rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💬</span>
            <Body16 className="font-semibold text-gray-900">SMS Notifications</Body16>
          </div>
          <Body16 className="text-sm text-gray-600 mb-4">
            Get a text message when someone needs support and push notifications can&apos;t reach you.
          </Body16>

          {smsError && (
            <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <Body16 className="text-sm text-red-700">{smsError}</Body16>
            </div>
          )}

          {smsSuccess && (
            <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 rounded">
              <Body16 className="text-sm text-green-700">{smsSuccess}</Body16>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+15551234567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <Body16 className="text-xs text-gray-500 mt-1">
                E.164 format: + country code then number (e.g., +15551234567)
              </Body16>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="sms-enabled"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                disabled={!phoneNumber.trim()}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <label
                htmlFor="sms-enabled"
                className={`text-sm font-medium ${!phoneNumber.trim() ? 'text-gray-400' : 'text-gray-900 cursor-pointer'}`}
              >
                Enable SMS fallback notifications
              </label>
            </div>

            <Body16 className="text-xs text-gray-500 italic">
              Your phone number is kept private and never shared with other users.
            </Body16>

            <button
              onClick={handleSaveSms}
              disabled={savingSms}
              className="min-h-[44px] px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-sm font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {savingSms ? 'Saving...' : 'Save SMS Settings'}
            </button>
          </div>
        </div>
        */}

        {/* Thank-You Notes */}
        <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={() => setNotesExpanded(prev => !prev)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={notesExpanded}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">💌</span>
              <Body16 className="font-semibold text-gray-900">Thank-You Notes</Body16>
              {!notesLoading && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                  {thankYouNotes.length}
                </span>
              )}
            </div>
            <span className={`text-gray-400 transition-transform duration-200 ${notesExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {notesExpanded && (
            <div className="border-t border-gray-100 px-5 pb-5 pt-4">
              {notesLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-start gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-gray-200 rounded w-24" />
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : thankYouNotes.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No thank-you notes yet</p>
                  <p className="text-xs text-gray-400 mt-1">Notes from people you&apos;ve supported will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {thankYouNotes.map(note => {
                    const daysAgo = Math.floor((Date.now() - new Date(note.created_at).getTime()) / (1000 * 60 * 60 * 24))
                    const relativeDate = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`
                    const initials = note.sender_profile.display_name.charAt(0).toUpperCase()

                    return (
                      <div key={note.id} className="flex items-start gap-3">
                        {/* Avatar */}
                        {note.sender_profile.avatar_url ? (
                          <img
                            src={note.sender_profile.avatar_url}
                            alt={note.sender_profile.display_name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-rb-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                            {initials}
                          </div>
                        )}

                        {/* Note content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <Body16 className="text-sm font-semibold text-gray-900">{note.sender_profile.display_name}</Body16>
                            <span className="text-xs text-gray-400">{relativeDate}</span>
                          </div>
                          <p className="text-sm text-gray-700 mt-0.5 italic">&ldquo;{note.thank_you_note}&rdquo;</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Account */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="min-h-[44px] px-6 py-2.5 text-gray-500 text-sm font-medium hover:text-white hover:bg-red-600 border border-gray-300 hover:border-red-600 rounded-full transition-all"
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
