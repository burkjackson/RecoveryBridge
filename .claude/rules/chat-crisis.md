---
paths:
  - "app/chat/**"
  - "app/api/sessions/flag-crisis/**"
  - "lib/chatMessages.ts"
  - "lib/constants.ts"
  - "lib/constants.test.ts"
  - "components/CrisisResources.tsx"
  - "components/BottomNav.tsx"
  - "components/TranscriptEdits.tsx"
---

# Chat and crisis handling

## Crisis safety
- A way to reach crisis help must stay visible in every chat state: pending, declined, active and ended. The SOS button sits in the chat's sticky top bar, and the crisis banner stays up until dismissed, even after a session ends.
- Elsewhere, the floating SOS must stay above the mobile nav. `showsBottomNav()` is the shared check.
- `containsCrisisLanguage()` normalizes curly quotes and matches on word boundaries. iOS types curly apostrophes by default. Add real phrasings to `lib/constants.test.ts` whenever you add phrases.
- `crisis_flagged_at` is set only by `/api/sessions/flag-crisis`, which re-scans real messages and earlier edits. Never trust the client's detection.
- Seeker and listener copy differ on purpose: listeners get guidance and a button that shares 988 and 741741.

## Staying correct after sleep and dropped events
- Realtime doesn't replay what it missed, so every realtime-driven state needs a fallback. The session row polls every 15s while live and 3s while pending, and `refreshSession()` also runs on `visibilitychange`, `online`, `pageshow`, re-`SUBSCRIBED` and send errors.
- The realtime handler and the poll both go through `applySessionUpdate()`, so they can't disagree about what an ended session means.
- A late inactivity tick means the device woke up. Catch up first and at most show the warning; only auto-close after the warning has been on screen for the full grace period. Skip pending sessions entirely.
- Merge messages through `lib/chatMessages.ts`, so they stay sorted and a slow poll can't roll back an edit.

## Editing messages
- `TIME.MESSAGE_EDIT_WINDOW_MS` mirrors the SQL interval in migration 062. Change both together.
- Earlier versions go to admin-only `message_edits`, because reports are decided from the transcript. Keep the crisis banner up if crisis language is edited away.

## Presence
Only participants track presence, and only the counterpart's key counts. Copy for the "other person may be gone" banner differs by role, and only the seeker's includes 988 and 741741 plus "Find another listener".
