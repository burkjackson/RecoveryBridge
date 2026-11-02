---
paths:
  - "public/sw.js"
---

# Service worker

- Bump `CACHE_NAME` on breaking asset changes (currently v14). Pages are network-first and only `/offline` is cached, so an ordinary UI change doesn't need a bump.
- Suppression checks need `isOnScreen(client)`, not just a URL match. A stale or backgrounded chat tab matches the URL while the person isn't looking, and that once silenced every support push (#33).
- Every push must show a notification. For a redundant one, use `showAndDismiss`: Safari counts a push with no notification against `userVisibleOnly` and eventually revokes the subscription (#59).
- Direct-connect pushes are suppressed only when the listener is looking at that chat. Broadcasts are suppressed only on `/dashboard`, `/listeners` or an on-screen chat.
- `/offline` must work with nothing else cached, because its CSS and JS bundles are hashed and can't be precached. Keep it a server component with inline styles and a plain link.
