// Push Notification Utilities for RecoveryBridge

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Check if push notifications are supported in this browser
 */
export function isPushNotificationSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported')
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Subscribe to push notifications
 * Note: For production, you'll need to generate VAPID keys
 * Run: npx web-push generate-vapid-keys
 */
export async function subscribeToPushNotifications(): Promise<PushSubscriptionData | null> {
  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      return subscriptionToData(existingSubscription)
    }

    // Subscribe to push notifications
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not configured')
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })

    return subscriptionToData(subscription)
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    return null
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      return true
    }
    return false
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    return false
  }
}

/**
 * Convert PushSubscription to storable data format
 */
function subscriptionToData(subscription: PushSubscription): PushSubscriptionData {
  const keys = subscription.toJSON().keys
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: keys!.p256dh!,
      auth: keys!.auth!,
    },
  }
}

/**
 * Convert base64 URL-safe string to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Check if user is on iOS and needs to install PWA
 */
export function isIOSNeedsPWAInstall(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone
  return isIOS && !isInStandaloneMode
}
