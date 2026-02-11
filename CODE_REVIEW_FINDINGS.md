# Code Review Findings - RecoveryBridge
**Date:** February 10, 2026
**Reviewer:** Claude
**Scope:** Full codebase security, performance, and code quality audit

---

## 🔴 CRITICAL Issues (Must Fix Immediately)

### 1. **Admin Panel - Client-Side Only Authorization**
**Location:** `app/admin/page.tsx` (lines 89-116)
**Severity:** CRITICAL 🔴
**Risk:** Unauthorized access to admin functions

**Issue:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single()

if (!profile?.is_admin) {
  router.push('/dashboard')
  return
}
```

The admin page only checks `is_admin` on the client side. A malicious user could:
- Bypass the client-side check with browser DevTools
- Access admin data if RLS policies aren't properly configured
- View reports, blocks, sessions, and user data without authorization

**Recommendation:**
1. **Verify RLS policies** are enabled on all admin-accessible tables (reports, user_blocks, sessions, profiles)
2. **Add server-side authorization** to admin operations
3. **Create protected API routes** for admin actions instead of direct client queries
4. **Consider middleware** to protect the /admin route at the Next.js level

**Example Fix:**
```typescript
// Add server-side API route: app/api/admin/reports/route.ts
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !await isUserAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  // Return admin data
}
```

---

### 2. **TOCTOU Race Condition in User Signup**
**Location:** `app/signup/page.tsx` (lines 26-37)
**Severity:** HIGH 🟠
**Risk:** Duplicate usernames, data integrity issues

**Issue:**
```typescript
// Time-of-check
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('id')
  .eq('display_name', displayName)
  .single()

if (existingProfile) {
  setError('This username is already taken...')
  return
}

// Time-of-use (window for race condition)
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  // ...
})
```

Two users can sign up with the same display name simultaneously:
1. User A checks - name available ✓
2. User B checks - name available ✓
3. User A creates account
4. User B creates account (duplicate!)

**Recommendation:**
Remove the pre-check and rely on database unique constraints:
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { display_name: displayName }
  }
})

if (error) {
  if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
    setError('This username is already taken. Please choose another.')
  } else {
    setError(error.message)
  }
}
```

---

## 🟠 HIGH Priority Issues

### 3. **No Input Sanitization for User-Generated Content**
**Location:** Multiple files (chat messages, profile bio, display names)
**Severity:** HIGH 🟠
**Risk:** XSS attacks, code injection

**Issue:**
User inputs are displayed directly without sanitization:
- Chat messages: `app/chat/[id]/page.tsx`
- Profile bios: `components/AvailableListeners.tsx`
- Display names: Throughout the app

**Recommendation:**
1. **For React components:** Content is auto-escaped by React, which is good ✓
2. **Watch out for:**
   - `dangerouslySetInnerHTML` (not currently used ✓)
   - URL parameters being inserted directly
   - Any server-side rendering of user content

**Current Status:** Protected by React's default XSS prevention ✓
**Action:** Monitor for any future uses of `dangerouslySetInnerHTML` or innerHTML

---

### 4. **Missing Rate Limiting on Critical Endpoints**
**Location:** API routes (`api/notifications/send`, `api/cleanup-sessions`)
**Severity:** HIGH 🟠
**Risk:** Spam, DoS attacks, resource exhaustion

**Issue:**
No rate limiting on:
- `/api/notifications/send` - Could spam notifications to all listeners
- `/api/cleanup-sessions` - Could be called repeatedly to load the database
- Chat message sending - No throttling visible

**Recommendation:**
Add rate limiting using:
1. **Vercel Edge Config** for rate limits
2. **Upstash Redis** for distributed rate limiting
3. **Simple in-memory** rate limiting for non-distributed needs

Example:
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})

export async function POST(request: NextRequest) {
  const ip = request.ip ?? 'anonymous'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  // ... rest of handler
}
```

---

### 5. **Session Cleanup Has No Authentication**
**Location:** `app/api/cleanup-sessions/route.ts`
**Severity:** MEDIUM-HIGH 🟡
**Risk:** Unauthorized session termination

**Issue:**
```typescript
export async function POST(request: NextRequest) {
  // No authentication check!
  // Anyone can call this endpoint
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
```

While the cleanup logic itself is safe (it only closes stale sessions), anyone can trigger it, potentially:
- Causing unexpected database load
- Triggering cleanup at inopportune times
- Interfering with testing/debugging

**Recommendation:**
Add authentication for the cleanup endpoint:
```typescript
export async function POST(request: NextRequest) {
  // Option 1: Secret key (for cron jobs)
  const secret = request.headers.get('x-cleanup-secret')
  if (secret !== process.env.CLEANUP_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Option 2: Admin-only (for manual triggers)
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const user = await getAuthUser(authHeader)
    if (!user || !await isUserAdmin(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // ... cleanup logic
}
```

---

## 🟡 MEDIUM Priority Issues

### 6. **N+1 Query in Session Cleanup**
**Location:** `app/api/cleanup-sessions/route.ts` (lines 44-70)
**Severity:** MEDIUM 🟡
**Risk:** Performance degradation with many sessions

**Issue:**
```typescript
for (const session of activeSessions) {
  // Separate query for EACH session - N+1 problem
  const { data: lastMessage } = await supabase
    .from('messages')
    .select('created_at')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  // ...
}
```

With 100 active sessions, this makes 101 database queries (1 + 100).

**Recommendation:**
Batch the query:
```typescript
// Single query to get last message for ALL sessions
const { data: allLastMessages } = await supabase
  .from('messages')
  .select('session_id, created_at')
  .in('session_id', activeSessions.map(s => s.id))
  .order('created_at', { ascending: false })

// Group by session_id and get the most recent for each
const lastMessageMap = new Map()
allLastMessages?.forEach(msg => {
  if (!lastMessageMap.has(msg.session_id)) {
    lastMessageMap.set(msg.session_id, msg.created_at)
  }
})

// Now iterate with in-memory lookups
for (const session of activeSessions) {
  const lastMessageTime = lastMessageMap.get(session.id)
  // ... rest of logic
}
```

---

### 7. **Inconsistent Error Handling Patterns**
**Location:** Throughout the codebase
**Severity:** MEDIUM 🟡
**Risk:** Poor user experience, debugging difficulty

**Issue:**
Error handling varies across components:
- Some use `ErrorState` component ✓
- Some use `Modal` components ✓
- Some use inline text
- Some just console.error without UI feedback
- Inconsistent error messages

**Examples:**
```typescript
// Good (with UI feedback)
catch (error) {
  setErrorModal({ show: true, message: 'Clear, user-friendly message' })
}

// Less good (no UI feedback)
catch (error) {
  console.error('Error:', error)
  // User sees nothing!
}
```

**Recommendation:**
1. Create a consistent error handling pattern
2. Always show user-friendly errors in the UI
3. Log technical details to console for debugging
4. Consider error boundaries for React components

---

### 8. **No Logging/Monitoring System**
**Location:** Entire application
**Severity:** MEDIUM 🟡
**Risk:** Difficult to debug production issues

**Issue:**
The app only uses `console.log` and `console.error` for debugging. In production:
- No centralized error tracking
- No performance monitoring
- No user behavior analytics
- Difficult to diagnose issues

**Recommendation:**
Integrate error tracking and monitoring:
```typescript
// Add Sentry, LogRocket, or similar
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})

// Wrap async operations
try {
  await riskyOperation()
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'chat-page', action: 'send-message' },
    user: { id: userId, name: userName }
  })
  throw error
}
```

---

## 🔵 LOW Priority / Code Quality Issues

### 9. **Incomplete TypeScript Usage**
**Location:** Various files
**Severity:** LOW 🔵
**Impact:** Type safety, maintainability

**Good progress:** The codebase has significantly improved type safety with the addition of `lib/types/database.ts` ✓

**Remaining issues:**
- Some `any` types still exist (e.g., `error: any` in catch blocks)
- Some implicit types where explicit would be better

**Recommendation:**
```typescript
// Instead of
catch (error: any) {
  console.error('Error:', error)
}

// Use
catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message)
  } else {
    console.error('Unknown error:', String(error))
  }
}

// Or create a custom error type
interface AppError {
  message: string
  code?: string
  details?: unknown
}
```

---

### 10. **Missing Environment Variable Validation**
**Location:** Various API routes
**Severity:** LOW 🔵
**Risk:** Runtime errors in production

**Issue:**
```typescript
// No validation that these exist!
process.env.NEXT_PUBLIC_SUPABASE_URL!
process.env.SUPABASE_SERVICE_ROLE_KEY!
process.env.VAPID_PUBLIC_KEY!
```

Using `!` (non-null assertion) assumes they exist, but doesn't validate.

**Recommendation:**
Add env validation at startup:
```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
})

export const env = envSchema.parse(process.env)

// Use: env.NEXT_PUBLIC_SUPABASE_URL instead of process.env.NEXT_PUBLIC_SUPABASE_URL!
```

---

### 11. **Hardcoded Magic Numbers**
**Location:** Multiple files
**Severity:** LOW 🔵
**Impact:** Maintainability

**Issue:**
```typescript
const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
const inactivityWarningTime = 15 * 60 * 1000 // 15 minutes
const autoCloseTime = 5 * 60 * 1000 // 5 minutes
```

**Recommendation:**
Extract to named constants:
```typescript
// lib/constants.ts
export const TIMEOUTS = {
  HEARTBEAT_THRESHOLD_MS: 2 * 60 * 1000,  // 2 minutes
  INACTIVITY_WARNING_MS: 15 * 60 * 1000,  // 15 minutes
  INACTIVITY_AUTO_CLOSE_MS: 5 * 60 * 1000,  // 5 minutes
  CLEANUP_NO_MESSAGES_MS: 10 * 60 * 1000,  // 10 minutes
  CLEANUP_INACTIVE_MS: 30 * 60 * 1000,  // 30 minutes
} as const

// Usage
const threshold = Date.now() - TIMEOUTS.HEARTBEAT_THRESHOLD_MS
```

---

### 12. **Dead Code / Unused Files**
**Location:** Repository root
**Severity:** LOW 🔵
**Impact:** Code cleanliness

**Files found:**
- `page-broken.tsx` - Appears to be an old/broken version
- `DEPLOY.sh` - Unclear if used
- `push-changes.sh` - Temporary script, should be removed
- `.next 2/` - Duplicate build folder with space in name
- `node_modules 2/` - Duplicate node_modules with space in name

**Recommendation:**
Clean up unused files:
```bash
rm -rf "node_modules 2" ".next 2"
rm app/page-broken.tsx push-changes.sh
# Review and keep/remove DEPLOY.sh as needed
```

---

## ✅ POSITIVE Findings (Well Done!)

### What's Working Well:

1. **✅ Good Type Safety Improvements**
   - Added comprehensive TypeScript interfaces in `lib/types/database.ts`
   - Proper typing for Supabase queries
   - Eliminated most `any` types from database operations

2. **✅ Fixed Race Condition in Profile Updates**
   - Properly relies on database unique constraints
   - No TOCTOU vulnerability in `app/profile/page.tsx`

3. **✅ Memory Leak Fixed**
   - Proper cleanup of Supabase subscriptions in `app/chat/[id]/page.tsx`
   - Return cleanup functions from useEffect hooks

4. **✅ Good Error Handling in Components**
   - `AvailableListeners` component has proper error states
   - User-friendly error messages
   - Retry functionality

5. **✅ Proper Authentication in API Routes**
   - `/api/heartbeat` validates user tokens ✓
   - `/api/notifications/send` checks authorization ✓
   - Proper use of service role keys for admin operations

6. **✅ React XSS Protection**
   - Not using `dangerouslySetInnerHTML`
   - React automatically escapes user content
   - No innerHTML manipulation

7. **✅ Good Session Cleanup Logic**
   - Sensible thresholds (10 min no messages, 30 min inactive)
   - Automatic cleanup on dashboard load
   - Proper database updates

8. **✅ Accessibility Features**
   - ARIA labels on interactive elements
   - Semantic HTML structure
   - Screen reader support

---

## 📊 Summary Statistics

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 1 | 3 | 1 | 0 |
| Performance | 0 | 0 | 1 | 0 |
| Code Quality | 0 | 0 | 1 | 4 |
| **Total** | **1** | **3** | **3** | **4** |

---

## 🎯 Recommended Action Plan

### Phase 1: Immediate (Next 1-2 days)
1. **Fix admin panel authorization** - Add RLS policies and server-side checks
2. **Fix signup race condition** - Remove pre-check, rely on constraints
3. **Add rate limiting** - At least to notification endpoint
4. **Secure cleanup endpoint** - Add authentication

### Phase 2: Short-term (Next week)
5. **Fix N+1 query** - Batch session cleanup queries
6. **Add error tracking** - Integrate Sentry or similar
7. **Standardize error handling** - Create consistent patterns

### Phase 3: Ongoing improvements
8. **Complete TypeScript migration** - Remove remaining `any` types
9. **Add environment validation** - Validate env vars at startup
10. **Extract constants** - Move magic numbers to config
11. **Clean up dead code** - Remove unused files

---

## 🔧 Quick Wins (Can fix in < 1 hour)

1. Remove TOCTOU check in signup page (5 min)
2. Add secret key to cleanup endpoint (10 min)
3. Extract magic numbers to constants file (15 min)
4. Clean up dead code and duplicate folders (5 min)
5. Add env variable validation (20 min)

---

**End of Report**

*Note: This review focused on security, performance, and code quality. Frontend UI/UX was not in scope but appears well-designed based on the code structure.*
