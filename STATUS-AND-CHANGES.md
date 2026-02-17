# RecoveryBridge - Status and Changes Document
**Last Updated:** February 15, 2025
**Branch:** `claude/sleepy-knuth`
**Deployment Status:** ✅ Pushed to GitHub, ⏳ Deploying to Vercel

---

## 🎯 Recent Changes Summary

### Push Notifications - UX Improvements
**Status:** ✅ Committed, ⏳ Deploying

Changed the notification emoji from an alarming SOS symbol to a supportive handshake:
- **Before:** 🆘 Someone Needs Support
- **After:** 🤝 Someone Needs Support

**Why:** User feedback indicated the SOS emoji felt too dramatic/alarming for the supportive nature of the app.

**Files Modified:**
- `app/api/notifications/send/route.ts` (line 79)

---

### Chat 406 Error Fix
**Status:** ✅ Committed, ⏳ Deploying

**Problem:** Users were seeing 406 (Not Acceptable) errors when trying to access chat pages. The error occurred because the code was querying for database columns that don't exist in the `user_blocks` table.

**Solution:**
- Removed query for non-existent `block_type` column
- Removed filter for non-existent `is_active` column
- Changed `.single()` to `.maybeSingle()` to handle cases where no block exists

**Files Modified:**
- `app/chat/[id]/page.tsx` (lines 138-143)

**Before:**
```typescript
const { data: blockCheck } = await supabase
  .from('user_blocks')
  .select('id, reason, block_type')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .single()
```

**After:**
```typescript
const { data: blockCheck } = await supabase
  .from('user_blocks')
  .select('id, reason')
  .eq('user_id', user.id)
  .maybeSingle()
```

---

### Listener Profile UI Cleanup
**Status:** ✅ Committed, ⏳ Deploying

**Changes:**
1. Removed 🎯 (bullseye) emoji from listener profile cards
2. Made role text italic for better visual hierarchy

**Files Modified:**
- `app/listeners/page.tsx` (lines 192-198)

**Before:**
```typescript
<div className="flex items-center gap-1 mb-2">
  <span className="text-sm" role="img" aria-label="Role">🎯</span>
  <Body16 className="text-sm text-rb-gray">
    {listener.user_role === 'person_in_recovery' && 'Person in Recovery'}
    {listener.user_role === 'professional' && 'Allies for Long-Term Recovery'}
    {listener.user_role === 'ally' && 'Recovery Support (Legacy)'}
  </Body16>
</div>
```

**After:**
```typescript
<div className="mb-2">
  <Body16 className="text-sm text-rb-gray italic">
    {listener.user_role === 'person_in_recovery' && 'Person in Recovery'}
    {listener.user_role === 'professional' && 'Allies for Long-Term Recovery'}
    {listener.user_role === 'ally' && 'Recovery Support (Legacy)'}
  </Body16>
</div>
```

---

## 🔧 Push Notifications Setup - COMPLETED

### Environment Variables (Vercel)
**Status:** ✅ Configured and Deployed

The following environment variables are now properly configured:
- `VAPID_PUBLIC_KEY` - Public key for web push notifications
- `VAPID_PRIVATE_KEY` - Private key for web push notifications
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Client-side accessible public key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase access
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL

**VAPID Keys Generated:**
```
Public:  BPUVUW6O9Xq8xecTOWm-ZKoqqymj9q9CG4D43fiPvD6ChkWz_g9YqjZ5pHYEz_EGcLUBLlW0Vhxja44eBaC2rMs
Private: L11JQnk6cw59H3I2AJxcxMKj54NgTpeCkksNA0CfPks
```

### Database Schema
**Status:** ✅ Migration Run

Created `push_subscriptions` table with:
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to profiles)
- `subscription` (JSONB, stores push subscription data)
- `created_at` (timestamp)
- RLS policies for user privacy

### Push Notification Workflow
**Status:** ✅ Working End-to-End

1. User enables notifications on dashboard
2. Browser requests permission
3. Service worker subscribes to push notifications
4. Subscription saved to `push_subscriptions` table
5. When someone clicks "I Need Support":
   - API queries for available listeners
   - Includes users with `role_state = 'available'` OR `always_available = true`
   - Sends push notifications to all matching listeners
   - Cleans up invalid subscriptions (410 errors)

### "Always Available" Feature
**Status:** ✅ Implemented and Working

Users can now enable "Always Available" mode which:
- Sends them notifications even when their status is not "Available to Listen"
- Useful for users who want to receive all support requests
- Checkbox added to notification settings UI
- Properly queries both `role_state='available'` and `always_available=true` users

---

## 📝 Git Commit History

### Recent Commits (Pushed to GitHub)
```
c63e10c - Clean up listener profile UI
  - Removed 🎯 emoji from profile cards
  - Made role text italic

93d2cd4 - Improve notification UX and fix chat block check
  - Changed notification emoji from 🆘 to 🤝
  - Fixed 406 errors in chat by removing non-existent column queries
  - Changed .single() to .maybeSingle() for block checks
```

---

## 🚀 Deployment Status

### Current Branch
- **Local Branch:** `claude/sleepy-knuth`
- **Remote:** Pushed to GitHub (commits `93d2cd4..c63e10c`)
- **Status:** ⏳ Deploying to Vercel

### What's Being Deployed
1. Notification emoji change (🆘 → 🤝)
2. Chat 406 error fix
3. Listener profile UI improvements

### Post-Deployment Testing Checklist
Once Vercel shows "Ready":

- [ ] **Test Notifications:**
  - Phone: Set status to "Available to Listen" with notifications ON
  - Incognito browser: Log in as test user, click "I Need Support"
  - Verify notification shows: "🤝 Someone Needs Support"

- [ ] **Test Chat:**
  - Navigate to `/chat/[id]` page
  - Verify no 406 errors in browser console
  - Confirm chat loads successfully

- [ ] **Test Listener Profiles:**
  - Navigate to `/listeners` page
  - Verify no 🎯 emoji appears on profile cards
  - Verify role text appears in italics

---

## 🐛 Issues Fixed

### 1. VAPID Key Validation Error
**Problem:** `Error: Vapid public key must be a URL safe Base 64 (without "=")`

**Root Cause:** Extra space in VAPID_PUBLIC_KEY environment variable

**Solution:**
- Regenerated VAPID keys using `npx web-push generate-vapid-keys --json`
- Removed extra space from environment variable
- Updated all 3 VAPID-related env vars in Vercel

**Status:** ✅ Fixed

---

### 2. Notifications Not Reaching Phone
**Problem:** API returned 200 but no notification appeared on phone

**Root Cause:** Old push subscription was invalid after VAPID keys were regenerated

**Solution:** User disabled/re-enabled notifications in app to create fresh subscription with new keys

**Status:** ✅ Fixed

---

### 3. Chat 406 Errors
**Problem:** 406 (Not Acceptable) errors when loading chat pages

**Root Cause:** Code queried for `block_type` and `is_active` columns that don't exist in database

**Solution:** Removed non-existent column queries, changed `.single()` to `.maybeSingle()`

**Status:** ✅ Fixed, ⏳ Deploying

---

## 📋 Configuration Constants

### Time Thresholds (lib/constants.ts)
- `HEARTBEAT_INTERVAL_MS`: 30 seconds (how often to send heartbeat)
- `HEARTBEAT_THRESHOLD_MS`: 1 hour (max age for "available" listener)
- `INACTIVITY_WARNING_MS`: 15 minutes (when to show warning in chat)
- `INACTIVITY_AUTO_CLOSE_MS`: 5 minutes (auto-close after warning)
- `CLEANUP_NO_MESSAGES_MS`: 10 minutes (close sessions with no messages)
- `CLEANUP_INACTIVE_MS`: 30 minutes (close inactive sessions)

### Notification Settings
- **Emoji:** 🤝 (handshake)
- **Title:** "Someone Needs Support"
- **Body:** "[Name] is looking for a listener right now."
- **Icon:** `/icon-192.png`
- **Badge:** `/icon-192.png`
- **Tag:** `support-request`
- **Require Interaction:** `true`

---

## 🔍 Key Files Reference

### Push Notification System
- `app/api/notifications/send/route.ts` - Server-side API endpoint for sending notifications
- `lib/pushNotifications.ts` - Client-side utilities for subscription management
- `lib/env.ts` - Environment variable validation
- `public/sw.js` - Service worker for background notifications
- `public/manifest.json` - PWA manifest configuration

### Chat System
- `app/chat/[id]/page.tsx` - Individual chat page
- `app/chat/[id]/ChatInterface.tsx` - Chat UI component

### Dashboard & Profiles
- `app/dashboard/page.tsx` - Main dashboard
- `app/listeners/page.tsx` - Available listeners page
- `components/NotificationSettings.tsx` - Notification enable/disable UI

### Configuration
- `lib/constants.ts` - Application-wide constants and thresholds
- `lib/env.ts` - Environment variable validation

---

## 📚 Technical Notes

### Web Push Notification Flow
1. Client requests notification permission
2. Service worker subscribes to push using VAPID public key
3. Subscription object contains: `endpoint`, `keys.p256dh`, `keys.auth`
4. Subscription stored in Supabase `push_subscriptions` table
5. Server uses VAPID private key to send notifications via `web-push` library
6. Service worker receives push event and displays notification
7. User clicks notification → opens app at `/dashboard`

### VAPID Key Format
- Must be URL-safe Base64 (RFC 4648 Section 5)
- No padding (`=` characters)
- Uses `-` instead of `+`
- Uses `_` instead of `/`
- Generated with: `npx web-push generate-vapid-keys --json`

### iOS PWA Requirements
- Must be added to home screen via Share → "Add to Home Screen"
- Push notifications only work in standalone PWA mode on iOS
- `NotificationSettings.tsx` shows special instructions for iOS users

---

## 🎯 Next Steps

### Immediate (After Deployment Completes)
1. Verify handshake emoji appears in production notifications
2. Confirm chat loads without 406 errors
3. Check listener profile UI displays correctly

### Future Enhancements (Not Started)
- [ ] Add notification sound customization
- [ ] Implement notification batching for multiple support requests
- [ ] Add "Do Not Disturb" schedule for notifications
- [ ] Create admin dashboard for monitoring notification delivery rates
- [ ] Add push notification analytics (delivery rate, click-through rate)

---

## 📞 Support & Resources

### Documentation
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [VAPID Keys Explained](https://blog.mozilla.org/services/2016/08/23/sending-vapid-identified-webpush-notifications-via-mozillas-push-service/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [iOS PWA Support](https://developer.apple.com/videos/play/wwdc2020/10120/)

### Setup Guide
Full setup instructions available in: `PUSH-NOTIFICATIONS-SETUP.md`

---

## 🔐 Security Notes

### Environment Variables
- VAPID private key must remain secret (server-side only)
- VAPID public key can be exposed (client-side accessible)
- Service role key must never be exposed to client

### RLS Policies
- Users can only read/write their own push subscriptions
- `user_blocks` table has RLS enabled
- All Supabase queries use authenticated user context

---

## 📊 Current Stats

### Database Tables
- `profiles` - User profiles and status
- `push_subscriptions` - Web push subscriptions
- `user_blocks` - User blocking relationships
- `chat_sessions` - Active chat sessions
- `chat_messages` - Chat message history

### Active Features
- ✅ User authentication (Supabase Auth)
- ✅ Push notifications (web-push)
- ✅ Real-time chat (Supabase Realtime)
- ✅ PWA support (manifest + service worker)
- ✅ "Always Available" mode for listeners
- ✅ Automatic session cleanup
- ✅ Heartbeat system for availability tracking

---

**End of Status Document**
