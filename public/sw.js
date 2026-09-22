// RecoveryBridge Service Worker for Push Notifications
// This enables background notifications even when the browser tab is closed

const CACHE_NAME = 'recoverybridge-v13'
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

function pathOf(client) {
  try {
    return new URL(client.url).pathname
  } catch {
    return ''
  }
}

// Every push must show a notification. Safari enforces userVisibleOnly: a
// push that ends without showNotification() counts against the subscription,
// and after a few WebKit revokes it — the next send gets a 410, the row is
// deleted, and that listener silently stops getting support requests. So when
// a push is redundant (they're already looking at it), show a silent one and
// close it straight away instead of skipping it.
function showAndDismiss(title, options) {
  const tag = 'rb-suppressed'
  return self.registration
    .showNotification(title, { ...options, tag, silent: true })
    .then(() => self.registration.getNotifications({ tag }))
    .then((notifications) => notifications.forEach((n) => n.close()))
    .catch(() => {})
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

      // Resolve the tap target: a chat message or direct connect opens that
      // chat; a support-request broadcast opens /connect; otherwise whatever
      // url the payload carries, falling back to the dashboard.
      let url = data.data?.url || data.url || '/dashboard'
      if ((type === 'chat-message' || type === 'direct-connect') && sessionId) {
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
        const onScreen = clientList.filter(isOnScreen)

        // Chat message or direct connect: redundant only if they're looking
        // at THAT chat right now. A direct connect used to be treated as a
        // broadcast (it carries seekerId) and was dropped whenever any window
        // was visible — a listener on /profile or /training never saw it.
        if ((type === 'chat-message' || type === 'direct-connect') && sessionId) {
          if (onScreen.some((client) => pathOf(client) === `/chat/${sessionId}`)) {
            return showAndDismiss(title, options)
          }
          return self.registration.showNotification(title, options)
        }

        if (seekerId) {
          // Broadcast support request. Redundant when they're on a screen that
          // already shows waiting seekers live (dashboard, listeners), or in
          // an on-screen chat (they can't take a second seeker mid-session).
          // On any other page they'd otherwise never find out.
          const seeingIt = onScreen.some((client) => {
            const path = pathOf(client)
            return path === '/dashboard' || path === '/listeners' || path.startsWith('/chat/')
          })
          if (seeingIt) return showAndDismiss(title, options)
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
      const target = new URL(urlToOpen, self.location.origin)
      // Same page already open: focus it, and if it's showing a different
      // seeker or chat (the query string differs), move it to the right one.
      // Matching on pathname alone used to focus /connect?seekerId=A when the
      // tap was for seeker B.
      for (const client of clientList) {
        let current
        try {
          current = new URL(client.url)
        } catch {
          continue
        }
        if (current.pathname !== target.pathname || !('focus' in client)) continue
        if (current.search === target.search) return client.focus()
        if ('navigate' in client) {
          return client.navigate(target.href).then((c) => (c || client).focus())
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target.href)
      }
    })
  )
})

// The push service rotated or expired this device's subscription. Without
// this handler the device just stopped receiving pushes until the person
// happened to revisit Profile. Resubscribe with the same key and tell the
// server to swap the stored endpoint. If the browser doesn't hand us the old
// subscription, the dashboard's self-heal saves the new one on next open.
self.addEventListener('pushsubscriptionchange', (event) => {
  const oldSubscription = event.oldSubscription
  const applicationServerKey = oldSubscription?.options?.applicationServerKey
  if (!applicationServerKey) return

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey })
      .then((newSubscription) =>
        fetch('/api/push/resubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldEndpoint: oldSubscription.endpoint,
            subscription: newSubscription.toJSON(),
          }),
        })
      )
      .catch((error) => console.error('pushsubscriptionchange failed:', error))
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
