/**
 * Application-wide constants for RecoveryBridge
 * Centralized configuration for timeouts, thresholds, and limits
 */

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

  /** Maximum tagline length */
  MAX_TAGLINE_LENGTH: 100,
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
