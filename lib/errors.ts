/**
 * Message from an unknown caught value.
 *
 * Lets `catch (error: unknown)` read a message without reaching for `any`,
 * and keeps a sensible fallback when something non-Error is thrown.
 */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return fallback
}
