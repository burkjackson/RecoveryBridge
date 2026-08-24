/**
 * Application-wide constants for RecoveryBridge
 * Centralized configuration for timeouts, thresholds, and limits
 */

/** Version of the Terms of Service / Privacy Policy a user consents to at signup.
 *  Bump this (and the "Last updated" date in /terms and /privacy) whenever the legal docs change. */
export const CONSENT_VERSION = '2026-05-28'

export interface ParsedReferralSource {
  emoji: string
  label: string
  detail: string | null
}

const REFERRAL_SOURCE_LABELS: Record<string, { emoji: string; label: string }> = {
  facebook: { emoji: '👍', label: 'Facebook' },
  instagram: { emoji: '📸', label: 'Instagram' },
  threads: { emoji: '🧵', label: 'Threads' },
  tiktok: { emoji: '🎵', label: 'TikTok' },
  podcast: { emoji: '🎙️', label: 'Podcast' },
  website_blog: { emoji: '🌐', label: 'Website/Blog' },
  search_engine: { emoji: '🔍', label: 'Search Engine' },
  friend_family: { emoji: '🤝', label: 'Friend/Family' },
  other: { emoji: '💬', label: 'Other' },
}

/** Parses the profiles.referral_source value set during onboarding. Podcast and
 *  website entries carry an optional "prefix: detail" suffix, while "Other" with
 *  a typed detail is stored as the raw free text itself (see onboarding/page.tsx). */
export function parseReferralSource(raw: string | null | undefined): ParsedReferralSource | null {
  if (!raw) return null

  if (raw in REFERRAL_SOURCE_LABELS) {
    return { ...REFERRAL_SOURCE_LABELS[raw], detail: null }
  }
  if (raw.startsWith('podcast: ')) {
    return { ...REFERRAL_SOURCE_LABELS.podcast, detail: raw.slice('podcast: '.length) }
  }
  if (raw.startsWith('website: ')) {
    return { ...REFERRAL_SOURCE_LABELS.website_blog, detail: raw.slice('website: '.length) }
  }
  return { ...REFERRAL_SOURCE_LABELS.other, detail: raw }
}

/** Phrases that suggest a user may be in acute crisis. Matched word-by-word against
 *  message text to surface 988/crisis resources in chat. Intentionally high-recall —
 *  a false positive just shows supportive resources, which is low-harm. */
const CRISIS_PHRASES = [
  'kill myself',
  'killing myself',
  'want to die',
  'wanna die',
  'end my life',
  'ending my life',
  'end it all',
  'take my own life',
  'suicidal',
  'suicide',
  'better off dead',
  'no reason to live',
  "don't want to be here anymore",
  'dont want to be here anymore',
  'hurt myself',
  'harm myself',
  'self harm',
  'self-harm',
  'overdose',
  'wanna overdose',
]

/** Returns true if the text contains language suggesting acute crisis. Case-insensitive,
 *  ignores surrounding punctuation. Used to surface crisis resources in chat. */
export function containsCrisisLanguage(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^a-z\s']/g, ' ')
  return CRISIS_PHRASES.some((phrase) => normalized.includes(phrase))
}

// Time constants in milliseconds
export const TIME = {
  /** How often to send heartbeat signals when available (30 seconds) */
  HEARTBEAT_INTERVAL_MS: 30 * 1000,

  /** Maximum age of heartbeat to consider a listener "available" (1 hour) */
  HEARTBEAT_THRESHOLD_MS: 60 * 60 * 1000,

  /** Time before showing inactivity warning in chat (15 minutes) */
  INACTIVITY_WARNING_MS: 15 * 60 * 1000,

  /** Time after warning before auto-closing inactive chat (5 minutes) */
  INACTIVITY_AUTO_CLOSE_MS: 5 * 60 * 1000,

  /** Interval to check for inactivity (30 seconds) */
  INACTIVITY_CHECK_INTERVAL_MS: 30 * 1000,

  /** Session cleanup: Close sessions with no messages after this time (10 minutes) */
  CLEANUP_NO_MESSAGES_MS: 10 * 60 * 1000,

  /** Session cleanup: Close sessions with no activity after this time (30 minutes) */
  CLEANUP_INACTIVE_MS: 30 * 60 * 1000,

  /** Debounce time before "stopped typing" indicator clears (2 seconds) */
  TYPING_TIMEOUT_MS: 2 * 1000,

  /** Minimum interval between typing broadcast events (500ms) */
  TYPING_THROTTLE_MS: 500,

  /** Delay before re-notifying listeners that a seeker is still waiting (2 minutes) */
  RENOTIFY_DELAY_MS: 2 * 60 * 1000,

  /** How long a seeker's heartbeat must be absent before they are hidden from the listener view (5 minutes) */
  SEEKER_DISPLAY_THRESHOLD_MS: 5 * 60 * 1000,

  /** How long before a stale 'requesting' role_state is reset to 'offline' by cleanup (30 minutes) */
  SEEKER_STALE_REQUESTING_MS: 30 * 60 * 1000,

  /**
   * How far back cleanup looks for a real conversation before sending the
   * "we couldn't connect you" follow-up (3 hours).
   *
   * Must exceed: conversation length + up to 30 min before the seeker counts
   * as stale (SEEKER_STALE_REQUESTING_MS) + up to 15 min until the next cron
   * tick. Measured against production in Aug 2026, the longest conversation on
   * record was 70 minutes (p99 52, median 1), so the worst case needs ~115
   * minutes. 3 hours leaves real headroom.
   *
   * Deliberately generous: a follow-up that isn't sent is a small loss, while
   * apologising to someone who just had a conversation is not.
   */
  MISSED_CONNECTION_LOOKBACK_MS: 3 * 60 * 60 * 1000,

  /** How long the post-chat "Returning to dashboard..." confirmation shows before navigating (1.5 seconds) */
  POST_CHAT_REDIRECT_MS: 1.5 * 1000,
} as const

// Re-notification tracking constants
export const NOTIFICATION = {
  /** Maximum number of re-notification attempts after initial send */
  MAX_RENOTIFY_COUNT: 3,

  /** SessionStorage key for last notification timestamp */
  STORAGE_KEY_LAST_NOTIFY: 'rb_last_notify_ts',

  /** SessionStorage key for notification send count */
  STORAGE_KEY_NOTIFY_COUNT: 'rb_notify_count',
} as const

// Copy for platform-initiated outreach to a seeker. Kept here so the wording —
// which reaches people in a vulnerable moment — is easy to review and tweak in
// one place. The auto follow-up fires when someone requests support and never
// connects (their 'requesting' state goes stale and cleanup resets it), and is
// delivered as both a push and an in-app notice.
export const OUTREACH_COPY = {
  /** Auto "we couldn't connect you" follow-up */
  RECONNECT_TITLE: 'We’re still here for you 💙',
  RECONNECT_BODY:
    'We’re so sorry we couldn’t connect you with a listener just now. Please try again whenever you’re ready — someone may be available. And if you need to talk with someone right away, you can text or call 988 anytime.',

  /** Prefilled suggested note when reaching out from the "Couldn't Connect" list */
  RECONNECT_OUTREACH_DRAFT:
    'We noticed you were looking for support earlier and we couldn’t connect you — we’re so sorry.\n\nPlease try to connect again whenever you’re ready. We’re here for you, and we’d love to help you connect. 💙',

  /** Title shown on a manual note from an admin (body is admin-authored) */
  OUTREACH_TITLE: 'A message from RecoveryBridge 💙',

  /** Max length of an admin-authored outreach note */
  OUTREACH_MAX_LENGTH: 500,
} as const

// Convert time constants to minutes for easier reference
export const TIME_MINUTES = {
  HEARTBEAT_INTERVAL: TIME.HEARTBEAT_INTERVAL_MS / (60 * 1000),
  HEARTBEAT_THRESHOLD: TIME.HEARTBEAT_THRESHOLD_MS / (60 * 1000),
  INACTIVITY_WARNING: TIME.INACTIVITY_WARNING_MS / (60 * 1000),
  INACTIVITY_AUTO_CLOSE: TIME.INACTIVITY_AUTO_CLOSE_MS / (60 * 1000),
  INACTIVITY_CHECK_INTERVAL: TIME.INACTIVITY_CHECK_INTERVAL_MS / (60 * 1000),
  CLEANUP_NO_MESSAGES: TIME.CLEANUP_NO_MESSAGES_MS / (60 * 1000),
  CLEANUP_INACTIVE: TIME.CLEANUP_INACTIVE_MS / (60 * 1000),
  SEEKER_DISPLAY_THRESHOLD: TIME.SEEKER_DISPLAY_THRESHOLD_MS / (60 * 1000),
  SEEKER_STALE_REQUESTING: TIME.SEEKER_STALE_REQUESTING_MS / (60 * 1000),
} as const

// UI and UX constants
export const UI = {
  /** Default pagination limit for queries */
  DEFAULT_PAGE_SIZE: 20,

  /** Maximum length for bio text before truncation */
  BIO_TRUNCATE_LENGTH: 60,

  /** Minimum touch target size for accessibility (px) */
  MIN_TOUCH_TARGET: 44,
} as const

// Time zones for quiet hours — US + international
export const TIMEZONES = [
  // United States
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AK)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HI)' },
  { value: 'America/Phoenix', label: 'Arizona (AZ)' },
  // Canada
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'America/Vancouver', label: 'Vancouver (PT)' },
  { value: 'America/Halifax', label: 'Halifax (AT)' },
  // Latin America
  { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
  { value: 'America/Bogota', label: 'Bogotá (COT)' },
  { value: 'America/Lima', label: 'Lima (PET)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)' },
  // Europe
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Dublin', label: 'Dublin (GMT/IST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'Europe/Rome', label: 'Rome (CET)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET)' },
  { value: 'Europe/Warsaw', label: 'Warsaw (CET)' },
  { value: 'Europe/Athens', label: 'Athens (EET)' },
  { value: 'Europe/Istanbul', label: 'Istanbul (TRT)' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  // Middle East & Africa
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Riyadh', label: 'Riyadh (AST)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
  // Asia & Pacific
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dhaka', label: 'Dhaka (BST)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
] as const

// API and rate limiting (future use)
export const API = {
  /** Default timeout for API requests (ms) */
  DEFAULT_TIMEOUT_MS: 10 * 1000,

  /** Maximum retries for failed requests */
  MAX_RETRIES: 3,
} as const

// Validation constants
export const VALIDATION = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,

  /** Minimum display name length */
  MIN_DISPLAY_NAME_LENGTH: 2,

  /** Maximum display name length */
  MAX_DISPLAY_NAME_LENGTH: 50,

  /** Maximum bio length */
  MAX_BIO_LENGTH: 500,

  /** Maximum tagline length (matches SQL CHECK constraint) */
  MAX_TAGLINE_LENGTH: 60,

  /** Maximum chat message length */
  MAX_MESSAGE_LENGTH: 2000,
} as const

// Specialty tags for listener matching & discovery
export const SPECIALTY_TAGS = [
  'Early Recovery',
  'Long-Term Recovery',
  'Relapse Prevention',
  'Grief & Loss',
  'Family Issues',
  'Trauma',
  'Anxiety & Depression',
  'Substance Use',
  'Alcohol',
  'Codependency',
  'Self-Care',
  'Spirituality',
  'Career & Purpose',
  'Relationships',
  'Parenting in Recovery',
  'Veterans',
  'LGBTQ+',
  'Young Adults',
] as const

export type SpecialtyTag = typeof SPECIALTY_TAGS[number]

// Maximum number of tags a listener can select
export const MAX_SPECIALTY_TAGS = 5

// Conversation starter prompts for new chat sessions
export const CONVERSATION_STARTERS = {
  seeker: [
    "I've been having a tough day and could use someone to talk to.",
    "I'm struggling with cravings right now.",
    "I just need someone to listen for a bit.",
    "I've been feeling really alone lately.",
    "Something happened today and I need to process it.",
    "I'm not sure where to start, but I know I need support.",
  ],
  listener: [
    "Hey, I'm here for you. How are you feeling right now?",
    "Thanks for reaching out. What's on your mind today?",
    "I'm glad you're here. Is there something specific you'd like to talk about?",
    "Welcome — this is a safe space. Take your time. What's on your mind?",
    "I'm listening whenever you're ready to share.",
    "How has your day been going?",
  ],
} as const

// Quick reactions for chat messages (recovery-context appropriate)
export const REACTIONS = [
  { key: 'heart', emoji: '\u2764\uFE0F', label: 'Heart' },
  { key: 'hug', emoji: '\uD83E\uDD17', label: 'Hug' },
  { key: 'pray', emoji: '\uD83D\uDE4F', label: 'Prayer hands' },
  { key: 'strong', emoji: '\uD83D\uDCAA', label: 'Strength' },
  { key: 'sparkles', emoji: '\u2728', label: 'Sparkles' },
  { key: 'thumbsup', emoji: '\uD83D\uDC4D', label: 'Thumbs up' },
  { key: 'clap', emoji: '\uD83D\uDC4F', label: 'Clapping' },
  { key: 'blue_heart', emoji: '\uD83D\uDC99', label: 'Blue heart' },
] as const

// Export a helper to get time ago in minutes
export function getMinutesAgo(timestamp: string | Date): number {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return (Date.now() - date.getTime()) / (60 * 1000)
}

// Export a helper to check if a heartbeat is stale
export function isHeartbeatStale(lastHeartbeat: string | null): boolean {
  if (!lastHeartbeat) return true
  return getMinutesAgo(lastHeartbeat) > TIME_MINUTES.HEARTBEAT_THRESHOLD
}

// ---------------------------------------------------------------------------
// Push beyond "someone needs support"
// ---------------------------------------------------------------------------

/**
 * Copy for the queued notification categories. Kept beside OUTREACH_COPY so
 * every platform-initiated message is reviewable in one place.
 *
 * All of it is written to be lock-screen safe. A push renders on a locked
 * phone that other people can see, and this is a recovery app: nothing here
 * names the other person, quotes what they wrote, or implies why the recipient
 * uses RecoveryBridge.
 */
export const NOTIFICATION_COPY = {
  /** A seeker left a thank-you note after a session. Body names no one. */
  THANK_YOU_TITLE: 'You received a thank-you note 💙',
  THANK_YOU_BODY: 'Someone you listened to left you a note. Tap to read it.',

  /** Partway through listener training and stalled. */
  TRAINING_NUDGE_TITLE: 'You’re almost a listener 🎓',

  /**
   * Monthly check-in for people who haven't been around.
   *
   * Deliberately carries no listener count. The cron only queues this when
   * someone is genuinely online, but the queue drains on the cron's real
   * cadence (up to ~35 min later, longer if the recipient is in quiet hours),
   * and a number baked in at queue time can be flatly wrong by the time it
   * lands. "Listeners are here" stays true; "3 listeners are online" does not.
   */
  REENGAGEMENT_TITLE: 'We’re here whenever you’re ready 💙',
  REENGAGEMENT_BODY:
    'It’s been a while — no pressure at all. Listeners are around if you’d ever like to talk.',
} as const

/** Body for the training nudge, which depends on how much is left. */
export function trainingNudgeBody(sectionsRemaining: number): string {
  return sectionsRemaining === 1
    ? 'You have one section left in listener training. Tap to finish it.'
    : `You’re ${sectionsRemaining} sections from finishing listener training. Tap to pick up where you left off.`
}

/**
 * Who an admin broadcast can go to. The values are stored on `broadcasts.audience`
 * and resolved server-side in /api/admin/actions — the client never sends a
 * recipient list.
 */
export const BROADCAST_AUDIENCES = [
  {
    key: 'all',
    label: 'Everyone',
    description: 'Every registered user.',
  },
  {
    key: 'listeners',
    label: 'Trained listeners',
    description: 'Anyone who has completed listener training.',
  },
  {
    key: 'active_30d',
    label: 'Active in the last 30 days',
    description: 'Users seen in the last 30 days.',
  },
  {
    key: 'inactive_30d',
    label: 'Inactive 30+ days',
    description: 'Users not seen for 30 days, or never seen.',
  },
] as const

export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number]['key']

export const BROADCAST_LIMITS = {
  /** Push titles get truncated by the OS well before this; keep them short. */
  TITLE_MAX_LENGTH: 80,
  BODY_MAX_LENGTH: 500,
} as const

/** How long a user must be unseen before the monthly check-in considers them. */
export const REENGAGEMENT_INACTIVE_DAYS = 30

/**
 * Section ids for /training, in order.
 *
 * These live here rather than only in app/training/page.tsx because the nudge
 * cron needs the total to say "you're N sections from finishing" and never
 * loads the page's content. The page types its section array against
 * ListenerTrainingSectionId, so adding a section there without adding it here
 * is a compile error.
 */
export const LISTENER_TRAINING_SECTION_IDS = [
  'presence',
  'empathy',
  'safe-space',
  'boundaries',
  'scope',
  'all-paths',
  'meet-them',
  'crisis',
] as const

export type ListenerTrainingSectionId = (typeof LISTENER_TRAINING_SECTION_IDS)[number]

/** Shape of profiles.listener_training_progress. */
export type ListenerTrainingProgress = Partial<Record<string, boolean>>

/** How many sections are still unacknowledged. Ignores unknown keys, so a
 *  renamed or removed section can't push the count negative. */
export function trainingSectionsRemaining(progress: ListenerTrainingProgress | null): number {
  const done = LISTENER_TRAINING_SECTION_IDS.filter((id) => progress?.[id] === true).length
  return LISTENER_TRAINING_SECTION_IDS.length - done
}

/**
 * How long training progress must sit untouched before the nudge cron will
 * push. Guards against nudging someone who is working through the page right
 * now — the cron runs every ~15-35 minutes and the page takes a few minutes.
 */
export const TRAINING_NUDGE_STALL_DAYS = 3
