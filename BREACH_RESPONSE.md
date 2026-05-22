# Data Breach Response Plan — RecoveryBridge LLC

**Classification:** Internal — Do Not Publish  
**Last Updated:** May 2026  
**Operator:** RecoveryBridge LLC  
**Breach Notification Contact:** legal@recoverybridge.app

---

## Overview

RecoveryBridge LLC processes consumer health data as defined under the FTC Health Breach Notification Rule (16 CFR Part 318, amended July 2024) and applicable state consumer health data privacy laws (including the Washington My Health My Data Act). This plan governs our response to any unauthorized access to, acquisition of, or disclosure of unsecured personal health record information.

---

## 1. What Constitutes a Reportable Breach

A **breach of security** under the FTC HBNR is any unauthorized acquisition of unsecured personal health record (PHR) information that is held by RecoveryBridge, including but not limited to:

- Unauthorized access to user accounts, messages, or profile data in Supabase
- Unauthorized access to push subscription endpoints
- Disclosure of user health-related data (recovery status, mental health disclosures, substance use) to unauthorized parties
- Theft or loss of database credentials or API keys that could expose health data
- A security misconfiguration (e.g., RLS disabled, storage bucket made public) exposing health records
- A breach at a service provider (Supabase, Vercel, Sentry) affecting RecoveryBridge user data

---

## 2. Incident Response Team

| Role | Responsibility | Contact |
|------|---------------|---------|
| Operator | Incident commander, all notifications | legal@recoverybridge.app |
| Engineering | Containment, investigation, remediation | (primary developer) |

For incidents involving service providers, contact:
- **Supabase:** security@supabase.io + support portal
- **Vercel:** security@vercel.com
- **Sentry:** security@sentry.io

---

## 3. Response Timeline

### Within 1 Hour of Discovery
- [ ] Confirm the breach is real (not a false positive)
- [ ] Isolate the affected system or disable the compromised access path
- [ ] Preserve logs — do not delete or overwrite any evidence
- [ ] Document initial scope: which tables/users potentially affected, estimated date range

### Within 24 Hours
- [ ] Complete preliminary investigation
- [ ] Determine whether breach involves "unsecured" PHR (unencrypted or unauthenticated data)
- [ ] Identify all affected users (by user ID, approximate count)
- [ ] Engage Supabase/Vercel/Sentry as applicable
- [ ] Begin drafting user and FTC notifications

### Within 60 Calendar Days (FTC HBNR Deadline)
- [ ] Notify all affected users (see Section 4)
- [ ] Submit notice to the FTC via the FTC Breach Notification website
- [ ] If 500+ users in a single state affected: notify prominent media in that state

---

## 4. Notification Requirements

### User Notification (Required — FTC HBNR §318.5)

Send to all affected users via email and in-app notification (if account is still active). Must include:

1. A description of the breach and what information was involved
2. What RecoveryBridge is doing in response
3. Steps users can take to protect themselves
4. Contact information: legal@recoverybridge.app

**Template subject line:** `Important Security Notice — Your RecoveryBridge Account`

### FTC Notification (Required — FTC HBNR §318.6)

- **URL:** https://www.ftc.gov/enforcement/rules/rulemaking-regulatory-reform-proceedings/health-breach-notification-rule
- Submit electronically within 60 days of discovery
- Include: company name (RecoveryBridge LLC), breach date/range, nature of breach, PHR elements involved, number of individuals affected, remediation steps

### Media Notification (Required if 500+ residents in any single state)
- Notify prominent media outlets in that state within 60 days
- Contact tech/consumer beats at major regional newspapers

---

## 5. Containment Checklist

### Supabase Database Breach
- [ ] Rotate Supabase service role key and anon key immediately via Supabase dashboard
- [ ] Update `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel environment variables
- [ ] Redeploy application
- [ ] Review Supabase audit logs to identify which rows/users were accessed
- [ ] Verify all RLS policies are active: check `admin_logs`, `user_blocks`, `push_subscriptions`, `reports`, `profiles`, `sessions`, `messages`, `session_feedback`, `message_reactions`, `user_favorites`
- [ ] Force-expire all active user sessions via Supabase Auth admin panel

### Vercel / Application Breach
- [ ] Rotate all Vercel environment variables
- [ ] Review Vercel build/deployment logs for unauthorized deployments
- [ ] Rotate VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- [ ] Rotate `CLEANUP_SECRET_KEY`

### Sentry Breach (Error Logs / Replays)
- [ ] Rotate Sentry DSN and auth token
- [ ] Review what session replays captured; determine if PHR was included despite masking
- [ ] Purge relevant Sentry data via Sentry admin console

---

## 6. Post-Incident

- [ ] Write a full incident report documenting: timeline, root cause, data affected, remediation, notifications sent
- [ ] Update this response plan if any gaps were identified
- [ ] Consider a security audit of the affected component
- [ ] Retain all incident documentation for at least 5 years (FTC requirement)

---

## 7. Key Data Assets

| Asset | Location | Sensitivity |
|-------|----------|-------------|
| User profiles (email, display name, bio, role) | Supabase `profiles` table | High |
| Chat messages (may contain health disclosures) | Supabase `messages` table | **Critical** |
| Session data | Supabase `sessions` table | High |
| Push notification endpoints | Supabase `push_subscriptions` | Medium |
| Error logs / session replays | Sentry (masked) | Medium |
| Access logs | Vercel (IP + path) | Low |

---

## 8. Non-Breach Scenarios (No FTC Notice Required)

The following do NOT require FTC notification under the HBNR:
- A user voluntarily sharing their own data
- A user-to-user data disclosure (e.g., a user sharing their own info in chat)
- Aggregated, de-identified data with no re-identification risk
- A bug that exposed data only to the authorized user (e.g., seeing your own data twice)

When in doubt, treat it as a breach and consult legal counsel.

---

*RecoveryBridge LLC is not a HIPAA covered entity. This plan is governed by the FTC HBNR and applicable state consumer health data privacy laws.*
