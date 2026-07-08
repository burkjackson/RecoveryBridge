# Vercel Environment Variables Setup

Add these environment variables to your Vercel project:

## 🔐 Required for Sentry Error Tracking

Go to your Vercel project → **Settings** → **Environment Variables**

### Add this variable:

**Variable Name:** `NEXT_PUBLIC_SENTRY_DSN`  
**Value:** 
```
https://6790f9af0908be92733d6c8789f90e07@o4510881520943104.ingest.us.sentry.io/4510881525268480
```
**Environments:** ✅ Production, ✅ Preview, ✅ Development

---

## 📊 Optional (for Source Map Uploads)

These are optional but recommended for production. They enable Sentry to show you the exact line of code where errors occurred.

To get these values, go to your Sentry dashboard:

### 1. SENTRY_ORG
- Go to https://sentry.io/settings/
- Look for "Organization Slug" in General Settings
- Copy that slug

**Variable Name:** `SENTRY_ORG`  
**Value:** `your-org-slug-here`  
**Environments:** ✅ Production, ✅ Preview

---

### 2. SENTRY_PROJECT
- Go to your project settings in Sentry
- Look for "Project Slug"
- It's probably "recoverybridge"

**Variable Name:** `SENTRY_PROJECT`  
**Value:** `recoverybridge`  
**Environments:** ✅ Production, ✅ Preview

---

### 3. SENTRY_AUTH_TOKEN
- Go to https://sentry.io/settings/account/api/auth-tokens/
- Click "Create New Token"
- Name: "Vercel Builds"
- Scopes needed:
  - `project:read`
  - `project:releases`
  - `org:read`
- Click "Create Token"
- **Copy it immediately** (you can't see it again!)

**Variable Name:** `SENTRY_AUTH_TOKEN`  
**Value:** `your-auth-token-here`  
**Environments:** ✅ Production, ✅ Preview

---

## ✅ Existing Variables to Keep

Make sure these are still set in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

---

## 🚀 After Adding Variables

1. Go to your Vercel **Deployments** tab
2. Click the **"..."** menu on your latest deployment
3. Click **"Redeploy"**
4. Select **"Use existing Build Cache"** (faster)
5. Click **"Redeploy"**

Or just push a new commit to trigger a deployment!

---

## 📱 Test Sentry

After deploying:

1. Visit your live site
2. Try to trigger an error (or wait for a real error)
3. Check https://sentry.io/organizations/your-org/issues/
4. You should see the error appear!

---

## 🎯 Summary

**Minimum to deploy:** Just add `NEXT_PUBLIC_SENTRY_DSN`

**For best experience:** Add all 4 Sentry variables (DSN, ORG, PROJECT, AUTH_TOKEN)
