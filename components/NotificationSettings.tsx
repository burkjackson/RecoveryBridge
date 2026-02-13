'use client'

import { useState, useEffect } from 'react'
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
  const [isPWA, setIsPWA] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkNotificationStatus()
    checkPWAMode()
  }, [])

  // Sync alwaysAvailable state when profile changes
  useEffect(() => {
    if (profile) {
      setAlwaysAvailable(profile.always_available || false)
    }
  }, [profile?.always_available])

  const checkPWAMode = () => {
    // Check if app is running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    setIsPWA(isStandalone)
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

        const { error: dbError } = await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
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
    } catch (err: any) {
      console.error('Error enabling notifications:', err)
      setError(err.message || 'Failed to enable notifications. Please try again.')
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
    } catch (err: any) {
      console.error('Error disabling notifications:', err)
      setError(err.message || 'Failed to disable notifications. Please try again.')
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
        ? 'Always Available mode enabled! You\'ll stay online indefinitely.' 
        : 'Always Available mode disabled. Normal 5-minute timeout applies.'
      )
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      console.error('Error updating always available:', err)
      setError('Failed to update Always Available setting. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Only show Always Available for listeners/allies
  const isListener = profile?.user_role === 'ally' || profile?.user_role === 'professional'

  // Don't show this message if they're already in PWA with notifications enabled
  if (!supported && !(isPWA && isSubscribed)) {
    return (
      <button
        onClick={() => setShowInstructionsModal(true)}
        className="w-full p-4 bg-blue-50 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-100 transition-all text-left"
      >
        <div className="flex items-start gap-2 mb-3">
          <span className="text-xl">📱</span>
          <div className="flex-1">
            <Body16 className="font-semibold text-blue-900 mb-2">
              Install as Web App for Notifications
            </Body16>
            <Body16 className="text-sm text-blue-800 mb-3">
              Push notifications require RecoveryBridge to be installed as a Progressive Web App (PWA) on your home screen.
            </Body16>
            <ol className="text-sm text-blue-800 space-y-2 ml-4 mb-3">
              <li><strong>1.</strong> Open RecoveryBridge in Safari</li>
              <li><strong>2.</strong> Tap the Share button (□↑) at the bottom</li>
              <li><strong>3.</strong> Scroll down and tap "Add to Home Screen"</li>
              <li><strong>4.</strong> Tap "Add"</li>
              <li><strong>5.</strong> Open RecoveryBridge from your home screen icon</li>
              <li><strong>6.</strong> Enable notifications here</li>
            </ol>
            <Body16 className="text-xs text-blue-700 font-medium">
              👆 Tap for detailed instructions
            </Body16>
          </div>
        </div>
        
        {/* Instructions Modal */}
        <NotificationInstructionsModal
          isOpen={showInstructionsModal}
          onClose={() => setShowInstructionsModal(false)}
        />
      </button>
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
    <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <Body16 className="font-semibold text-[#2D3436] mb-1">
            Push Notifications
          </Body16>
          <Body16 className="text-sm text-rb-gray mb-3">
            Get notified when someone needs support, even when RecoveryBridge isn't open.
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

          {!isPWA && (
            <div className="mb-3 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
              <Body16 className="text-sm text-amber-900 font-semibold mb-2">
                ⚠️ Install as PWA Required
              </Body16>
              <Body16 className="text-sm text-amber-800">
                Push notifications only work when RecoveryBridge is installed as a Progressive Web App. Please install to your home screen first, then enable notifications.
              </Body16>
            </div>
          )}

          {isSubscribed ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-green-600" aria-hidden="true">✓</span>
                <Body16 className="text-sm font-medium text-green-700">
                  Notifications enabled
                </Body16>
              </div>
              <button
                onClick={handleDisableNotifications}
                disabled={loading}
                aria-label={loading ? 'Disabling notifications...' : 'Disable push notifications'}
                className="min-h-[44px] px-4 py-2 bg-white border-2 border-rb-gray text-rb-gray rounded-full text-sm font-semibold hover:border-red-500 hover:text-red-600 transition disabled:opacity-50"
              >
                {loading ? 'Disabling...' : 'Disable Notifications'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleEnableNotifications}
                disabled={loading || permission === 'denied' || !isPWA}
                aria-label={loading ? 'Enabling notifications...' : 'Enable push notifications'}
                className="min-h-[44px] px-6 py-2.5 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-full text-sm font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enabling...' : 'Enable Notifications'}
              </button>
              {!isPWA && (
                <Body16 className="text-xs text-amber-700 text-center">
                  Button disabled - install as PWA first
                </Body16>
              )}
            </div>
          )}

          {/* Help Button */}
          <div className="mt-3 text-center">
            <button
              onClick={() => setShowInstructionsModal(true)}
              className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
            >
              How do I enable notifications on iPhone?
            </button>
          </div>
        </div>
      </div>

      {/* Always Available Toggle - Only for listeners */}
      {isListener && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
          {!isPWA && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded mb-3">
              <Body16 className="text-sm text-yellow-800">
                ⚠️ <strong>Not running as PWA:</strong> Always Available mode only works when RecoveryBridge is opened as a Progressive Web App from your home screen.
              </Body16>
            </div>
          )}
          
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
              <label
                htmlFor="alwaysAvailable"
                className={`block font-medium ${
                  !isSubscribed ? 'text-gray-400' : 'text-gray-900 cursor-pointer'
                }`}
              >
                ⚡ Always Available Mode
              </label>
              <Body16 className="text-sm text-gray-600 mt-1">
                Stay marked as "Available" even when the app is in the background. You'll receive push notifications when someone needs support.
                {!isSubscribed && (
                  <span className="block mt-1 text-amber-600 font-medium">
                    Enable push notifications above to use this feature.
                  </span>
                )}
              </Body16>
            </div>
          </div>

          {alwaysAvailable && isSubscribed && (
            <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded mt-3">
              <Body16 className="text-sm text-green-800">
                ✅ <strong>Always Available is ON:</strong> You will stay marked as available indefinitely. You'll get notified when someone needs support, even if the app is closed.
              </Body16>
            </div>
          )}
        </div>
      )}

      {/* Instructions Modal */}
      <NotificationInstructionsModal
        isOpen={showInstructionsModal}
        onClose={() => setShowInstructionsModal(false)}
      />
    </div>
  )
}
