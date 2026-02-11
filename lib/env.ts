/**
 * Environment variable validation
 * Ensures all required environment variables are present and valid
 */

// Helper to check if a value is a non-empty string
function validateEnvString(value: string | undefined, name: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// Helper to validate URL format
function validateEnvUrl(value: string | undefined, name: string): string {
  const str = validateEnvString(value, name)
  try {
    new URL(str)
    return str
  } catch {
    throw new Error(`Invalid URL format for environment variable: ${name}`)
  }
}

// Validate and export environment variables
// These are validated at import time, so errors will be caught early
export const env = {
  // Supabase
  SUPABASE_URL: validateEnvUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL'
  ),
  SUPABASE_SERVICE_ROLE_KEY: validateEnvString(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    'SUPABASE_SERVICE_ROLE_KEY'
  ),

  // VAPID keys for web push notifications
  VAPID_PUBLIC_KEY: validateEnvString(
    process.env.VAPID_PUBLIC_KEY,
    'VAPID_PUBLIC_KEY'
  ),
  VAPID_PRIVATE_KEY: validateEnvString(
    process.env.VAPID_PRIVATE_KEY,
    'VAPID_PRIVATE_KEY'
  ),

  // Optional: Cleanup secret key (defaults to dev key if not provided)
  CLEANUP_SECRET_KEY: process.env.CLEANUP_SECRET_KEY || 'dev-secret-key-change-in-production',
} as const

// Export a function to safely access environment variables
export function getEnv<K extends keyof typeof env>(key: K): typeof env[K] {
  return env[key]
}

// Helper for runtime checks
export function checkEnvInProduction() {
  if (process.env.NODE_ENV === 'production') {
    // Warn if using dev defaults in production
    if (env.CLEANUP_SECRET_KEY === 'dev-secret-key-change-in-production') {
      console.warn('⚠️  WARNING: Using default CLEANUP_SECRET_KEY in production!')
    }
  }
}

// Run production checks immediately
if (typeof window === 'undefined') {
  // Only run on server-side
  checkEnvInProduction()
}
