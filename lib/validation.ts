/**
 * Matches a canonical UUID (any version), case-insensitive. Shared wherever a
 * user-supplied id gets interpolated into a raw string — a PostgREST `.or()`
 * filter, an `auth.admin.deleteUser()` call — where a malformed value isn't
 * just a 400 waiting to happen but a structural risk (commas and dots are
 * meaningful inside a PostgREST filter string).
 */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
