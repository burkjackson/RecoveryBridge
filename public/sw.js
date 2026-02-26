// RecoveryBridge Service Worker for Push Notifications
// This enables background notifications even when the browser tab is closed

const CACHE_NAME = 'recoverybridge-v6'

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  self.skipWaiting() // Activate immediately
})

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event)

  // iOS-safe defaults: badge and requireInteraction are not supported on iOS
  // and can cause showNotification() to fail silently. Keep options minimal.
  let title = 'RecoveryBridge'
  let options = {
    body: 'Someone needs support',
    icon: '/icon-192.png',
    tag: 'recoverybridge-notification',
    data: {
      url: '/dashboard'
    }
  }

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json()
      title = data.title || title

      // Build iOS-safe options — explicitly exclude badge and requireInteraction
      const seekerId = data.data?.seekerId || data.seekerId
      options = {
        body: data.body || options.body,
        icon: data.icon || options.icon,
        tag: data.tag || options.tag,
        data: {
          // If we have a seekerId, open /connect so the listener lands directly
          // in a chat session. Otherwise fall back to the dashboard.
          url: seekerId
            ? `/connect?seekerId=${seekerId}`
            : (data.data?.url || data.url || '/dashboard'),
          seekerId
        }
      }
    } catch (e) {
      console.error('Error parsing push data:', e)
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Notification click event - open the app
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)

  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/listeners'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
