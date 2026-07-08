# Push Notifications Setup Guide for RecoveryBridge

## Overview
RecoveryBridge now supports web push notifications! Users will be notified when someone needs support, even when the app isn't open.

## ✅ What's Been Implemented

### 1. PWA Configuration
- ✅ `manifest.json` created with app metadata
- ✅ Service worker (`sw.js`) for background notifications
- ✅ Service worker auto-registration in app layout
- ✅ iOS PWA detection and install instructions

### 2. UI Components
- ✅ `NotificationSettings` component on dashboard
- ✅ Permission request flow
- ✅ Enable/disable notifications toggle
- ✅ iOS-specific installation instructions

### 3. Database Schema
- ✅ SQL migration file created (`supabase-push-subscriptions-migration.sql`)
- ✅ RLS policies for user privacy

### 4. Core Libraries
- ✅ Push notification utilities (`lib/pushNotifications.ts`)
- ✅ Subscription management
- ✅ Browser compatibility checks

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-push-subscriptions-migration.sql`
4. Click **Run**
5. Verify the `push_subscriptions` table was created

### Step 2: Generate VAPID Keys

VAPID keys are required for web push notifications. Generate them using:

```bash
npx web-push generate-vapid-keys
```

This will output something like:
```
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8xQmrEcj4SFpT-pZKsX4FYuPz_4BPRB6VGBHQYD2-vCJcOVXsJ-K_s

Private Key:
wLKuJQOqyE5r...
```

### Step 3: Update VAPID Public Key

1. Open `lib/pushNotifications.ts`
2. Find line 55 (the `applicationServerKey` in `subscribeToPushNotifications`)
3. Replace the placeholder key with your **Public Key** from Step 2

```typescript
applicationServerKey: urlBase64ToUint8Array(
  'YOUR_PUBLIC_KEY_HERE'  // Replace this!
)
```

### Step 4: Store VAPID Private Key

Add your **Private Key** to environment variables:

1. In Vercel:
   - Go to Settings → Environment Variables
   - Add: `VAPID_PRIVATE_KEY` = `your-private-key-here`
   - Add: `VAPID_PUBLIC_KEY` = `your-public-key-here`

2. Locally in `.env.local`:
```
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_PUBLIC_KEY=your-public-key-here
```

### Step 5: Create Icons (Required for PWA)

Create two PNG icons:
- `public/icon-192.png` (192x192 pixels)
- `public/icon-512.png` (512x512 pixels)

**Quick Option:** Use Canva, Figma, or an AI image generator to create a simple icon with:
- RecoveryBridge logo or initials "RB"
- Blue color scheme (#7FA1B3)
- Transparent or white background

**Placeholder Option:** For testing, you can temporarily use any 192x192 and 512x512 images.

---

## 🔔 Next Step: Implement Notification Triggers

### What's Needed

Currently, users can **enable** notifications, but we haven't implemented the **trigger** that actually sends them. Here's what needs to be done:

### Option 1: Using Supabase Edge Functions (Recommended)

Create a Supabase Edge Function that:
1. Watches for users going "Available" (requesting support)
2. Finds all listeners with role_state='available'
3. Fetches their push subscriptions from `push_subscriptions` table
4. Sends push notifications using the `web-push` library

**Implementation Steps:**

1. Create Edge Function:
```bash
supabase functions new send-support-notification
```

2. Install dependencies:
```bash
cd supabase/functions/send-support-notification
npm install web-push
```

3. Implement the function (pseudo-code):
```typescript
import webpush from 'web-push'

// Configure VAPID keys
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

// When someone requests support:
// 1. Query available listeners
// 2. Get their push subscriptions
// 3. Send notifications
const payload = {
  title: '🆘 Someone Needs Support',
  body: 'A person in recovery is looking for a listener right now.',
  icon: '/icon-192.png',
  data: {
    url: '/dashboard'
  }
}

subscriptions.forEach(sub => {
  webpush.sendNotification(sub.subscription, JSON.stringify(payload))
})
```

4. Deploy the Edge Function:
```bash
supabase functions deploy send-support-notification
```

5. Create a Database Trigger:
- Trigger the Edge Function when a profile's `role_state` changes to 'requesting'

### Option 2: Using Next.js API Route

Create `app/api/notifications/send/route.ts`:

```typescript
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: Request) {
  const { userId, message } = await request.json()

  // Get all available listeners
  const supabase = createClient(...)
  const { data: listeners } = await supabase
    .from('profiles')
    .select('id')
    .eq('role_state', 'available')
    .neq('id', userId)

  // Get their push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', listeners.map(l => l.id))

  // Send notifications
  const payload = {
    title: '🆘 Someone Needs Support',
    body: message,
    icon: '/icon-192.png',
    data: { url: '/dashboard' }
  }

  await Promise.all(
    subscriptions.map(sub =>
      webpush.sendNotification(
        sub.subscription,
        JSON.stringify(payload)
      )
    )
  )

  return Response.json({ success: true })
}
```

Then call this API from your dashboard when someone goes "requesting".

---

## 📱 How It Works

### Desktop (All browsers)
1. User clicks "Enable Notifications" on dashboard
2. Browser shows permission prompt
3. User grants permission
4. Subscription saved to database
5. ✅ User receives notifications even when browser tab is closed (but browser must be running)

### Android (Chrome, Firefox, Edge)
- Same as desktop
- Works perfectly, even when browser is closed

### iOS (Safari on iPhone/iPad)
1. User sees special instructions
2. Must tap Share → "Add to Home Screen"
3. Opens app from home screen
4. Enables notifications
5. ✅ Works like a native app!

---

## 🧪 Testing Notifications

### Quick Test (without triggers):

1. Open browser DevTools → Console
2. Run this to manually trigger a test notification:

```javascript
navigator.serviceWorker.ready.then(registration => {
  registration.showNotification('Test Notification', {
    body: 'If you see this, notifications are working!',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  })
})
```

### Full Integration Test (once triggers are implemented):

1. Open RecoveryBridge in two different browsers
2. User A: Enable notifications, set role_state to "available" (listener)
3. User B: Set role_state to "requesting" (needs support)
4. User A should receive a push notification
5. Clicking notification should open RecoveryBridge

---

## 🐛 Troubleshooting

### "Service Worker registration failed"
- Make sure you're on HTTPS (localhost is okay)
- Check browser console for errors
- Verify `sw.js` is in `/public/` folder

### "Notifications not supported"
- Only works on HTTPS
- Check browser compatibility
- iOS requires PWA installation

### "Permission denied"
- User blocked notifications in browser
- Need to manually enable in browser settings
- On iOS, must install as PWA first

### Icons not showing
- Verify `icon-192.png` and `icon-512.png` exist in `/public/`
- Check file permissions
- Clear browser cache

---

## 📊 Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| PWA Setup | ✅ Complete | Manifest, service worker, icons needed |
| Service Worker | ✅ Complete | Handles background notifications |
| Permission UI | ✅ Complete | Dashboard component |
| Database Schema | ✅ Complete | Migration file ready |
| Subscription Storage | ✅ Complete | Saves to Supabase |
| iOS Detection | ✅ Complete | Shows install instructions |
| **Notification Triggers** | ⏳ **TO DO** | Needs implementation |
| VAPID Keys | ⏳ **TO DO** | Need to generate & configure |
| Icons | ⏳ **TO DO** | Need 192x192 and 512x512 PNGs |

---

## 🎯 Next Actions

1. ✅ Deploy current changes to production
2. ⏳ Create app icons (192x192 and 512x512)
3. ⏳ Generate VAPID keys
4. ⏳ Update VAPID public key in code
5. ⏳ Add environment variables
6. ⏳ Run database migration
7. ⏳ Implement notification triggers (choose Option 1 or 2)
8. ⏳ Test on desktop and mobile devices

---

## 📚 Resources

- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [VAPID Keys Explained](https://blog.mozilla.org/services/2016/08/23/sending-vapid-identified-webpush-notifications-via-mozillas-push-service/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [iOS PWA Support](https://developer.apple.com/videos/play/wwdc2020/10120/)

---

Need help with any step? Let me know!
