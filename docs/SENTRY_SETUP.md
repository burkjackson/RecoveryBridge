# Sentry Setup Guide for RecoveryBridge

Sentry is now configured to catch and track errors in production!

## 📦 Step 1: Install Sentry

Run this command in your project directory:

```bash
npm install @sentry/nextjs
```

## 🔑 Step 2: Get Your Sentry Credentials

1. **Create a Sentry Account** (if you don't have one)
   - Go to https://sentry.io/signup/
   - Sign up for a free account

2. **Create a New Project**
   - Click "Create Project"
   - Select "Next.js" as the platform
   - Name it "RecoveryBridge" (or whatever you prefer)
   - Click "Create Project"

3. **Get Your DSN**
   - After creating the project, you'll see your DSN
   - It looks like: `https://abc123@o123456.ingest.sentry.io/456789`
   - Copy this - you'll need it in the next step

4. **Get Your Organization Slug**
   - Go to Settings → General
   - Copy your "Organization Slug" (e.g., "your-org-name")

5. **Get Your Project Slug**
   - In your project settings
   - Copy your "Project Slug" (e.g., "recoverybridge")

6. **Create an Auth Token** (for source map uploads)
   - Go to Settings → Developer Settings → Auth Tokens
   - Click "Create New Token"
   - Name it "RecoveryBridge Build"
   - Give it these permissions:
     - `project:read`
     - `project:releases`
     - `org:read`
   - Click "Create Token"
   - Copy the token immediately (you can't see it again!)

## 🔧 Step 3: Add Environment Variables

Add these to your `.env.local` file:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
```

**For Vercel Deployment:**
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add all 4 variables above
4. Make sure `NEXT_PUBLIC_SENTRY_DSN` is set for all environments (Production, Preview, Development)
5. The other 3 (`SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`) should be set for Production and Preview

## 🧪 Step 4: Test Sentry (Optional)

Create a test error to verify Sentry is working:

1. Add a test button somewhere in your app:
```tsx
<button onClick={() => { throw new Error('Sentry Test Error!') }}>
  Test Sentry
</button>
```

2. Click the button
3. Check your Sentry dashboard - you should see the error!

## ✅ What's Configured

✅ **Client-side error tracking** - Catches errors in the browser
✅ **Server-side error tracking** - Catches errors in API routes
✅ **Edge runtime tracking** - Catches errors in middleware
✅ **Session replay** - Records user sessions when errors occur (10% sample rate)
✅ **Performance monitoring** - Tracks app performance
✅ **Source maps** - Shows exact code location of errors
✅ **Vercel Cron Monitors** - Tracks scheduled job failures

## 📊 Features Enabled

- **Error Tracking**: All unhandled errors are automatically sent to Sentry
- **Session Replay**: When errors occur, Sentry records the session (with privacy masking)
- **Performance Monitoring**: Track slow pages and API calls
- **Breadcrumbs**: See user actions leading up to errors
- **Release Tracking**: Track which deployment version has errors
- **Source Maps**: See original TypeScript code, not compiled JavaScript

## 🔒 Privacy Settings

- `maskAllText: true` - All text is masked in session replays
- `blockAllMedia: true` - Images and videos are blocked in replays
- Only 10% of sessions are recorded (`replaysSessionSampleRate: 0.1`)
- 100% of error sessions are recorded (`replaysOnErrorSampleRate: 1.0`)

## 🚀 Deploy

After setting up your environment variables:

```bash
git add .
git commit -m "Add Sentry error tracking"
git push origin main
```

Vercel will automatically build with Sentry integration!

## 📱 Monitoring

View your errors at: https://sentry.io/organizations/[your-org]/issues/

---

**Need Help?**
- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Sentry Support: https://sentry.io/support/
