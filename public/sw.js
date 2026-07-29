// RecoveryBridge Service Worker for Push Notifications
// This enables background notifications even when the browser tab is closed

const CACHE_NAME = 'recoverybridge-v11'
const OFFLINE_URL = '/offline'

// Install event - pre-cache offline fallback page
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting())
  )
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

// Is this window actually on the user's screen right now?
//
// visibilityState is the dependable signal on Chromium/Firefox, but iOS Safari
// does not reliably populate it on WindowClient inside a push handler, so fall
// back to `focused`. Only positive evidence counts: when we genuinely cannot
// tell, we show the notification rather than risk swallowing a real one. The
// server-side checks in /api/notifications/* are what cover the iOS gap.
function isOnScreen(client) {
  return client.visibilityState === 'visible' || client.focused === true
}

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
      const type = data.data?.type || data.type
      const seekerId = data.data?.seekerId || data.seekerId
      const sessionId = data.data?.sessionId || data.sessionId

      // Resolve the tap target: a chat-message notification opens that chat;
      // a support-request opens /connect; otherwise fall back to the dashboard.
      let url = data.data?.url || data.url || '/dashboard'
      if (type === 'chat-message' && sessionId) {
        url = `/chat/${sessionId}`
      } else if (seekerId) {
        url = `/connect?seekerId=${seekerId}`
      }

      options = {
        body: data.body || options.body,
        icon: data.icon || options.icon,
        tag: data.tag || options.tag,
        data: { url, type, seekerId, sessionId }
      }
    } catch (e) {
      console.error('Error parsing push data:', e)
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const { type, seekerId, sessionId } = options.data || {}

        // Chat-message notification: only surface it if the recipient isn't
        // actively looking at THIS chat. A visible tab on /chat/<sessionId>
        // already renders the message in realtime and marks it read, so a
        // push would be redundant noise. A closed/backgrounded tab (phone
        // locked, other app in front) still gets notified — that's the
        // "unread reply" case this feature exists for.
        if (type === 'chat-message' && sessionId) {
          const viewingThisChat = clientList.some((client) => {
            try {
              return new URL(client.url).pathname === `/chat/${sessionId}` && isOnScreen(client)
            } catch {
              return false
            }
          })
          if (viewingThisChat) return
        }

        if (seekerId) {
          // If the user is already in an active chat session, suppress support-request
          // notifications — they can't connect to another seeker while in a session,
          // and this prevents stale re-notifications from firing after they've matched.
          const inChat = clientList.some((client) => client.url.includes('/chat/'))
          if (inChat) return

          // Likewise if they're actively looking at the app: a waiting seeker
          // already appears in the realtime lists on the dashboard and
          // /listeners, so a push would just buzz a screen they're staring at.
          if (clientList.some(isOnScreen)) return
        }
        return self.registration.showNotification(title, options)
      })
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
        // Use exact pathname match to avoid loose substring collisions (e.g. /connect vs /connect?other)
        const clientPath = new URL(client.url).pathname
        const targetPath = urlToOpen.startsWith('/') ? urlToOpen.split('?')[0] : new URL(urlToOpen).pathname
        if (clientPath === targetPath && 'focus' in client) {
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

// Fetch event - serve offline page when navigation fails
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL)
    )
  )
})

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
