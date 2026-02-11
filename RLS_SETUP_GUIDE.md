# Supabase RLS Setup Guide

This guide walks you through setting up Row Level Security (RLS) policies for RecoveryBridge.

## 🎯 Why This Is Critical

Without RLS policies, **any user can query any data** using browser DevTools, bypassing your client-side authorization checks. This is especially critical for:
- Admin panel data (reports, blocks, all sessions)
- Other users' private messages
- Other users' profile data

## 📋 Prerequisites

1. Access to your Supabase project dashboard
2. Admin privileges on your Supabase project
3. The SQL file: `supabase-rls-policies.sql`

## 🚀 Step-by-Step Setup

### Step 1: Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your RecoveryBridge project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the RLS Policies

1. Open the file: [supabase-rls-policies.sql](./supabase-rls-policies.sql)
2. Copy the **entire contents** of the file
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

**Expected output:** You should see "Success. No rows returned" for each policy created.

### Step 3: Verify RLS is Enabled

Run this verification query in the SQL Editor:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
```

**Expected result:** You should see all these tables with `rowsecurity = true`:
- ✅ profiles
- ✅ sessions
- ✅ messages
- ✅ reports
- ✅ user_blocks
- ✅ push_subscriptions
- ✅ admin_logs (if it exists)

### Step 4: Make Yourself an Admin

You need at least one admin account to test the admin panel:

```sql
-- Replace 'your-user-id' with your actual user ID
UPDATE profiles
SET is_admin = true
WHERE id = 'your-user-id';
```

**To find your user ID:**
1. Log into your RecoveryBridge app
2. Open browser DevTools (F12)
3. Go to Application → Local Storage
4. Look for Supabase auth token and copy the `user_id`

Or run this query while logged in:
```sql
SELECT auth.uid();
```

### Step 5: Test the Policies

#### Test 1: Regular User Access
1. Log in with a **non-admin** account
2. Open browser DevTools → Console
3. Try this query (should only return your own profile):
```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
console.log(data) // Should only show YOUR profile
```

#### Test 2: Admin Access
1. Log in with your **admin** account
2. Try the same query
```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
console.log(data) // Should show ALL profiles
```

#### Test 3: Reports Access
```javascript
// Non-admin: Should only see your own reports
// Admin: Should see all reports
const { data, error } = await supabase
  .from('reports')
  .select('*')
console.log(data)
```

#### Test 4: Messages Access
```javascript
// Should only see messages from your own sessions
const { data, error } = await supabase
  .from('messages')
  .select('*')
console.log(data)
```

### Step 6: Test Admin Panel

1. Log in as admin
2. Go to `/admin` route
3. Verify you can see:
   - ✅ All reports
   - ✅ All user blocks
   - ✅ All sessions
   - ✅ All users

4. Log out and log in as non-admin
5. Try to access `/admin` → Should redirect to dashboard ✅

## 🔍 Troubleshooting

### Problem: "permission denied for table X"

**Solution:** The RLS policy for that table isn't working correctly.

1. Check if RLS is enabled:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'your_table_name';
```

2. View policies on that table:
```sql
SELECT *
FROM pg_policies
WHERE tablename = 'your_table_name';
```

3. If policy exists but isn't working, drop and recreate:
```sql
DROP POLICY "policy_name" ON table_name;
-- Then copy and paste the CREATE POLICY statement again
```

### Problem: Admin can't see anything

**Solution:** Make sure `is_admin = true` for that user:

```sql
-- Check if user is admin
SELECT id, display_name, is_admin
FROM profiles
WHERE id = 'your-user-id';

-- If false, update to true
UPDATE profiles
SET is_admin = true
WHERE id = 'your-user-id';
```

### Problem: Regular users can see admin data

**Solution:** The admin policies aren't restrictive enough. Re-run the admin policies:

```sql
-- Example: Re-create reports policy
DROP POLICY "Admins can view all reports" ON reports;

CREATE POLICY "Admins can view all reports"
ON reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);
```

### Problem: Users can't see their own data

**Solution:** The "Users can view own X" policy might be missing or incorrect.

Check the policy exists:
```sql
SELECT * FROM pg_policies
WHERE tablename = 'profiles'
AND policyname LIKE '%own%';
```

## 📊 Policy Summary

| Table | Regular Users | Admins |
|-------|--------------|--------|
| **profiles** | View own + available listeners + session partners | View/update all |
| **sessions** | View/update own sessions | View/update all |
| **messages** | View/send in own sessions | View all |
| **reports** | View own reports, create new | View/update all |
| **user_blocks** | View if blocked | Full access |
| **push_subscriptions** | Full access to own | (no special access) |
| **admin_logs** | No access | Full access |

## ✅ Verification Checklist

After setup, verify:

- [ ] RLS enabled on all tables (run verification query)
- [ ] At least one admin account created
- [ ] Admin can access `/admin` panel
- [ ] Non-admin **cannot** access `/admin` panel
- [ ] Regular user can only see their own profile data
- [ ] Regular user can see available listeners
- [ ] Regular user can only see messages in their sessions
- [ ] Admin can see all data in admin panel
- [ ] No console errors when browsing the app

## 🔐 Security Best Practices

1. **Never disable RLS** on production tables
2. **Test policies** with both admin and non-admin accounts
3. **Audit regularly** - review who has admin access
4. **Monitor logs** - check Supabase logs for policy violations
5. **Principle of least privilege** - only grant necessary permissions

## 📞 Need Help?

If you run into issues:
1. Check the Supabase logs (Logs section in dashboard)
2. Review the error message carefully
3. Verify the user's `auth.uid()` matches their profile ID
4. Make sure the user is logged in when testing

## 🎉 Done!

Once all checks pass, your RLS policies are properly configured and your app is secure!

---

**Created:** February 10, 2026
**Last Updated:** February 10, 2026
**Related Files:**
- [supabase-rls-policies.sql](./supabase-rls-policies.sql)
- [CODE_REVIEW_FINDINGS.md](./CODE_REVIEW_FINDINGS.md)
- [FIXES_APPLIED.md](./FIXES_APPLIED.md)
