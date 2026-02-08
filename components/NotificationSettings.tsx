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

export default function NotificationSettings() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkNotificationStatus()
  }, [])

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
    try {
      // Request permission
      const newPermission = await requestNotificationPermission()
      setPermission(newPermission)

      if (newPermission === 'granted') {
        // Subscribe to push notifications
        const subscription = await subscribeToPushNotifications()

        if (subscription) {
          // Save subscription to database
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { error } = await supabase.from('push_subscriptions').upsert({
              user_id: user.id,
              subscription: subscription,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })

            if (error) {
              console.error('Error saving subscription:', error)
              alert('Failed to save notification settings. Please try again.')
            } else {
              setIsSubscribed(true)
              alert('Notifications enabled! You\'ll be notified when someone needs support.')
            }
          }
        }
      } else {
        alert('Please allow notifications in your browser settings to receive alerts.')
      }
    } catch (error) {
      console.error('Error enabling notifications:', error)
      alert('Failed to enable notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisableNotifications() {
    setLoading(true)
    try {
      const unsubscribed = await unsubscribeFromPushNotifications()

      if (unsubscribed) {
        // Remove subscription from database
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
        }
        setIsSubscribed(false)
        alert('Notifications disabled.')
      }
    } catch (error) {
      console.error('Error disabling notifications:', error)
      alert('Failed to disable notifications. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Body16 className="text-rb-gray">
          Push notifications are not supported in this browser.
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

          {isSubscribed ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-green-600">✓</span>
                <Body16 className="text-sm font-medium text-green-700">
                  Notifications enabled
                </Body16>
              </div>
              <button
                onClick={handleDisableNotifications}
                disabled={loading}
                className="px-4 py-2 bg-white border-2 border-rb-gray text-rb-gray rounded-full text-sm font-semibold hover:border-red-500 hover:text-red-600 transition disabled:opacity-50"
              >
                {loading ? 'Disabling...' : 'Disable Notifications'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleEnableNotifications}
              disabled={loading || permission === 'denied'}
              className="px-6 py-2.5 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-full text-sm font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enabling...' : 'Enable Notifications'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
