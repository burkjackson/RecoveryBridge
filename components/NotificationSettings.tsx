'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isIOSNeedsPWAInstall,
} from '@/lib/pushNotifications'
import { Body16 } from '@/components/ui/Typography'
import NotificationInstructionsModal from '@/components/NotificationInstructionsModal'
import type { Profile } from '@/lib/types/database'
import { TIMEZONES } from '@/lib/constants'

interface NotificationSettingsProps {
  profile?: Profile | null
  onProfileUpdate?: (profile: Profile) => void
}

export default function NotificationSettings({ profile, onProfileUpdate }: NotificationSettingsProps) {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [alwaysAvailable, setAlwaysAvailable] = useState(profile?.always_available || false)
  const [showAlwaysAvailableInfo, setShowAlwaysAvailableInfo] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(profile?.quiet_hours_enabled || false)
  const [quietHoursStart, setQuietHoursStart] = useState(profile?.quiet_hours_start || '23:00')
  const [quietHoursEnd, setQuietHoursEnd] = useState(profile?.quiet_hours_end || '07:00')
  const [quietHoursTimezone, setQuietHoursTimezone] = useState(profile?.quiet_hours_timezone || '')
  const [quietHoursSaving, setQuietHoursSaving] = useState(false)
  const [isPWA, setIsPWA] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop')
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    checkNotificationStatus()
    checkPWAMode()
    checkIfMobile()
  }, [])

  // Sync alwaysAvailable state when profile changes
  useEffect(() => {
    if (profile) {
      setAlwaysAvailable(profile.always_available || false)
    }
  }, [profile?.always_available])

  // Sync quiet hours state when profile changes + auto-detect timezone
  useEffect(() => {
    if (profile) {
      setQuietHoursEnabled(profile.quiet_hours_enabled || false)
      setQuietHoursStart(profile.quiet_hours_start || '23:00')
      setQuietHoursEnd(profile.quiet_hours_end || '07:00')
      // Use profile timezone, or auto-detect browser timezone, or fall back to ET
      const tz = profile.quiet_hours_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
      // Match to nearest known timezone from our list, or use as-is
      const matched = TIMEZONES.find(t => t.value === tz)
      setQuietHoursTimezone(matched ? matched.value : TIMEZONES[0].value)
    }
  }, [profile?.quiet_hours_enabled, profile?.quiet_hours_start, profile?.quiet_hours_end, profile?.quiet_hours_timezone])

  const checkPWAMode = () => {
    // Check if app is running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    setIsPWA(isStandalone)
  }

  const checkIfMobile = () => {
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua)
    const isAndroid = /Android/.test(ua)
    const mobileCheck = isIOS || isAndroid || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    setIsMobile(mobileCheck)
    if (isIOS) setPlatform('ios')
    else if (isAndroid) setPlatform('android')
    else setPlatform('desktop')
  }

  async function checkNotificationStatus() {
    const isSupported = isPushNotificationSupported()
    setSupported(isSupported)

    if (isSupported) {
      const currentPermission = getNotificationPermission()
      setPermission(currentPermission)

      // Check if subscribed
      if (currentPermission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.getSubscription()
          setIsSubscribed(!!subscription)
        } catch (error) {
          console.error('Error checking subscription:', error)
        }
      }
    }

    // Check if iOS needs PWA install
    if (isIOSNeedsPWAInstall()) {
      setShowIOSInstructions(true)
    }
  }

  async function handleEnableNotifications() {
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Request permission
      const newPermission = await requestNotificationPermission()
      setPermission(newPermission)

      if (newPermission === 'granted') {
        // Subscribe to push notifications
        const subscription = await subscribeToPushNotifications()

        if (!subscription) {
          throw new Error('Failed to create push subscription')
        }

        // Save subscription to database
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('User not authenticated')
        }

        // First, delete any existing subscriptions for this user (handles stale/expired endpoints)
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)

        // Insert fresh subscription
        const { error: dbError } = await supabase.from('push_subscriptions').insert({
          user_id: user.id,
          subscription: {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
        })

        if (dbError) {
          console.error('Error saving subscription:', dbError)
          throw new Error('Failed to save notification settings')
        }

        setIsSubscribed(true)
        setSuccessMessage('Notifications enabled! You\'ll be notified when someone needs support.')
      } else if (newPermission === 'denied') {
        setError('Notifications blocked. Please enable them in your browser settings.')
      } else {
        setError('Notification permission was not granted. Please try again.')
      }
    } catch (err: unknown) {
      console.error('Error enabling notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to enable notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisableNotifications() {
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const unsubscribed = await unsubscribeFromPushNotifications()

      if (!unsubscribed) {
        throw new Error('Failed to unsubscribe from push notifications')
      }

      // Remove subscription from database
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)

      if (dbError) {
        console.error('Error deleting subscription:', dbError)
        throw new Error('Failed to remove notification settings')
      }

      setIsSubscribed(false)
      setSuccessMessage('Notifications disabled successfully.')
    } catch (err: unknown) {
      console.error('Error disabling notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to disable notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function toggleAlwaysAvailable() {
    if (!profile) return
    
    if (!isSubscribed) {
      setError('Please enable push notifications first to use Always Available mode.')
      return
    }

    // Only allow Always Available when user is in "Available to Listen" mode
    if (profile.role_state !== 'available') {
      setError('Always Available only works when you\'re marked as "Available to Listen". Please switch to Available mode first.')
      return
    }

    setLoading(true)
    setError(null)
    const newValue = !alwaysAvailable

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ always_available: newValue })
        .eq('id', profile.id)
        .select()
        .single()

      if (error) throw error

      setAlwaysAvailable(newValue)

      if (onProfileUpdate && data) {
        onProfileUpdate(data)
      }

      setSuccessMessage(newValue
        ? 'Always Available to Listen enabled! You\'ll stay marked as available indefinitely when listening.'
        : 'Always Available mode disabled. Normal 5-minute timeout applies when listening.'
      )
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: unknown) {
      console.error('Error updating always available:', err)
      setError('Failed to update Always Available setting. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function saveQuietHours() {
    if (!profile) return

    setQuietHoursSaving(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          quiet_hours_enabled: quietHoursEnabled,
          quiet_hours_start: quietHoursStart,
          quiet_hours_end: quietHoursEnd,
          quiet_hours_timezone: quietHoursTimezone,
        })
        .eq('id', profile.id)
        .select()
        .single()

      if (error) throw error

      if (onProfileUpdate && data) {
        onProfileUpdate(data)
      }

      setSuccessMessage(quietHoursEnabled
        ? `Quiet hours set: ${quietHoursStart} – ${quietHoursEnd}. No notifications during this time.`
        : 'Quiet hours disabled. You\'ll receive notifications anytime.'
      )
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: unknown) {
      console.error('Error saving quiet hours:', err)
      setError('Failed to save quiet hours. Please try again.')
    } finally {
      setQuietHoursSaving(false)
    }
  }

  // Don't show this message if they're already in PWA with notifications enabled
  // On desktop, push is supported natively so we skip this fallback
  if (!supported && !(isPWA && isSubscribed) && isMobile) {
    return (
      <>
        <button
          onClick={() => setShowInstructionsModal(true)}
          className="w-full p-3 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-100 transition-all text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📱</span>
            <div className="flex-1">
              <Body16 className="text-sm font-semibold text-blue-900">
                {platform === 'android' ? 'Install as App for Notifications' : 'Install as Web App for Notifications'}
              </Body16>
              <Body16 className="text-xs text-blue-700">
                Tap for setup instructions →
              </Body16>
            </div>
          </div>
        </button>

        {/* Instructions Modal */}
        <NotificationInstructionsModal
          isOpen={showInstructionsModal}
          onClose={() => setShowInstructionsModal(false)}
          platform={platform}
        />
      </>
    )
  }

  // Desktop: push not supported (e.g. Safari on Mac)
  if (!supported && !isMobile) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Body16 className="text-sm text-rb-gray">
          <strong>🔔 Push notifications</strong> aren&apos;t supported in this browser. Try Chrome or Edge for desktop notifications.
        </Body16>
      </div>
    )
  }

  if (showIOSInstructions) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2 mb-3">
          <span className="text-xl">📱</span>
          <div>
            <Body16 className="font-semibold text-[#2D3436] mb-2">
              Enable Notifications on iOS
            </Body16>
            <Body16 className="text-sm text-rb-gray mb-2">
              To receive notifications on iPhone/iPad, you need to install RecoveryBridge to your home screen:
            </Body16>
            <ol className="text-sm text-rb-gray space-y-1 ml-4">
              <li>1. Tap the <strong>Share</strong> button (□↑) in Safari</li>
              <li>2. Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>3. Tap <strong>"Add"</strong></li>
              <li>4. Open RecoveryBridge from your home screen</li>
              <li>5. Enable notifications below</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 overflow-hidden">
      {/* Collapsible Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-50/50 transition-colors"
        aria-expanded={expanded}
        aria-label="Toggle Push Notifications settings"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔔</span>
          <div>
            <Body16 className="font-semibold text-[#2D3436]">Push Notifications</Body16>
            <Body16 className="text-xs text-rb-gray">
              {isSubscribed ? (
                <span className="text-green-700 font-medium">✓ Enabled{alwaysAvailable ? ' · Always Available' : ''}</span>
              ) : (
                'Not enabled'
              )}
            </Body16>
          </div>
        </div>
        <span className="text-gray-400 text-sm flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Collapsible Body */}
      {expanded && (
        <div className="px-4 pb-4">
          <Body16 className="text-sm text-rb-gray mb-3">
            Get notified when someone needs support, even when RecoveryBridge isn&apos;t open.
          </Body16>

          {permission === 'denied' && (
            <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <Body16 className="text-sm text-red-700">
                <strong>Notifications blocked.</strong> Please enable notifications in your browser settings and refresh the page.
              </Body16>
            </div>
          )}

          {error && (
            <div className="mb-3 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <Body16 className="text-sm text-red-700">
                {error}
              </Body16>
            </div>
          )}

          {successMessage && (
            <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-500 rounded">
              <Body16 className="text-sm text-green-700">
                {successMessage}
              </Body16>
            </div>
          )}

          {!isPWA && isMobile && (
            <div className="mb-3 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
              <Body16 className="text-sm text-amber-900 font-semibold mb-2">
                ⚠️ Install as PWA Required
              </Body16>
              <Body16 className="text-sm text-amber-800">
                Push notifications only work when RecoveryBridge is installed as a Progressive Web App. Please install to your home screen first, then enable notifications.
              </Body16>
            </div>
          )}

          {!isMobile && (
            <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
              <Body16 className="text-sm text-blue-800">
                🖥️ <strong>Desktop notifications:</strong> Click &quot;Enable Notifications&quot; and allow when your browser prompts you. Notifications will appear even when the tab is in the background.
              </Body16>
            </div>
          )}

          {isSubscribed ? (
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-600" aria-hidden="true">✓</span>
                <Body16 className="text-sm font-medium text-green-700">
                  Notifications enabled
                </Body16>
              </div>

              {/* iOS tip: how to make notifications stay on screen */}
              {platform === 'ios' && isPWA && (
                <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
                  <Body16 className="text-xs font-semibold text-blue-900 mb-1">💡 Make alerts stay on screen longer</Body16>
                  <Body16 className="text-xs text-blue-800 leading-relaxed">
                    Go to <strong>Settings → Apps → RecoveryBridge → Notifications</strong> and change <strong>Banner Style</strong> from &ldquo;Temporary&rdquo; to <strong>&ldquo;Persistent&rdquo;</strong>.
                  </Body16>
                </div>
              )}

              <button
                onClick={handleDisableNotifications}
                disabled={loading}
                aria-label={loading ? 'Disabling notifications...' : 'Disable push notifications'}
                className="min-h-[44px] px-6 py-2 bg-white border-2 border-rb-gray text-rb-gray rounded-full text-sm font-semibold hover:border-red-500 hover:text-red-600 transition disabled:opacity-50"
              >
                {loading ? 'Disabling...' : 'Disable Notifications'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleEnableNotifications}
                disabled={loading || permission === 'denied' || (isMobile && !isPWA)}
                aria-label={loading ? 'Enabling notifications...' : 'Enable push notifications'}
                className="min-h-[44px] px-6 py-2.5 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-full text-sm font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enabling...' : 'Enable Notifications'}
              </button>
              {!isPWA && isMobile && (
                <Body16 className="text-xs text-amber-700 text-center">
                  Button disabled - install as PWA first
                </Body16>
              )}
            </div>
          )}

          {/* Help Button — mobile only */}
          {isMobile && (
            <div className="mt-3 text-center">
              <button
                onClick={() => setShowInstructionsModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
              >
                {platform === 'ios'
                  ? 'How do I enable notifications on iPhone?'
                  : 'How do I enable notifications on Android?'}
              </button>
            </div>
          )}

          {/* Always Available Toggle - Peer Support Model */}
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="alwaysAvailable"
                checked={alwaysAvailable}
                onChange={toggleAlwaysAvailable}
                disabled={loading || !isSubscribed}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="alwaysAvailable"
                    className={`block font-medium ${
                      !isSubscribed ? 'text-gray-400' : 'text-gray-900 cursor-pointer'
                    }`}
                  >
                    Always Available to Listen
                  </label>
                  <button
                    onClick={() => setShowAlwaysAvailableInfo(!showAlwaysAvailableInfo)}
                    className="text-gray-500 text-sm flex items-center gap-1 hover:text-gray-700 transition-colors"
                    type="button"
                    aria-expanded={showAlwaysAvailableInfo}
                    aria-label="Toggle Always Available details"
                  >
                    <span>{showAlwaysAvailableInfo ? '▲' : '▼'}</span>
                  </button>
                </div>

                {/* Collapsible dropdown content */}
                {showAlwaysAvailableInfo && (
                  <div className="mt-3 space-y-2">
                    <Body16 className="text-sm text-gray-600">
                      When you&apos;re marked as &quot;Available to Listen&quot;, this keeps you online indefinitely. You&apos;ll receive push notifications when someone needs support, even when the app is closed.
                    </Body16>

                    {!isPWA && isMobile && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                        <Body16 className="text-sm text-yellow-800">
                          ⚠️ <strong>Not running as PWA:</strong> Always Available mode only works when RecoveryBridge is opened as a Progressive Web App from your home screen.
                        </Body16>
                      </div>
                    )}

                    {!isSubscribed && (
                      <Body16 className="text-sm text-amber-600 font-medium">
                        Enable push notifications above to use this feature.
                      </Body16>
                    )}
                    {isSubscribed && profile?.role_state !== 'available' && (
                      <Body16 className="text-sm text-amber-600 font-medium">
                        Switch to &quot;Available to Listen&quot; mode on your dashboard to enable this.
                      </Body16>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quiet Hours (Do Not Disturb) */}
          {isSubscribed && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="quietHours"
                  checked={quietHoursEnabled}
                  onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                  disabled={quietHoursSaving}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="quietHours" className="block font-medium text-gray-900 cursor-pointer">
                    Quiet Hours
                  </label>
                  <Body16 className="text-xs text-gray-500 mt-0.5">
                    Pause notifications during set hours (e.g., overnight)
                  </Body16>

                  {quietHoursEnabled && (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <label htmlFor="qh-start" className="text-sm text-gray-700 w-12">From</label>
                        <input
                          id="qh-start"
                          type="time"
                          value={quietHoursStart}
                          onChange={(e) => setQuietHoursStart(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label htmlFor="qh-end" className="text-sm text-gray-700 w-12">Until</label>
                        <input
                          id="qh-end"
                          type="time"
                          value={quietHoursEnd}
                          onChange={(e) => setQuietHoursEnd(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label htmlFor="qh-tz" className="text-sm text-gray-700 w-12">Zone</label>
                        <select
                          id="qh-tz"
                          value={quietHoursTimezone}
                          onChange={(e) => setQuietHoursTimezone(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 flex-1"
                        >
                          {TIMEZONES.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={saveQuietHours}
                    disabled={quietHoursSaving}
                    className="mt-3 min-h-[44px] px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-sm font-semibold hover:shadow-lg transition disabled:opacity-50"
                  >
                    {quietHoursSaving ? 'Saving...' : 'Save Quiet Hours'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions Modal */}
      <NotificationInstructionsModal
        isOpen={showInstructionsModal}
        onClose={() => setShowInstructionsModal(false)}
        platform={platform}
      />
    </div>
  )
}
