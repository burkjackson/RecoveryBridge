/**
 * Matches a canonical UUID (any version), case-insensitive. Shared wherever a
 * user-supplied id gets interpolated into a raw string — a PostgREST `.or()`
 * filter, an `auth.admin.deleteUser()` call — where a malformed value isn't
 * just a 400 waiting to happen but a structural risk (commas and dots are
 * meaningful inside a PostgREST filter string).
 */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Name of migration 029's one-active-session-per-listener unique index. A
 *  23505 naming it means the listener is already in another chat (only
 *  possible for an always_available listener, who stays listed and pushed
 *  while chatting). */
export const LISTENER_BUSY_INDEX = 'idx_one_active_session_per_listener'

export function isListenerBusyError(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === '23505' && !!error.message?.includes(LISTENER_BUSY_INDEX)
}
