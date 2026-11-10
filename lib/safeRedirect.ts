/**
 * Guards a user-controlled `?redirect=` query param against being used as an
 * open redirect. `router.push()` happily navigates to an absolute URL, so
 * `?redirect=https://evil.example` or `?redirect=//evil.example` (protocol-
 * relative — no scheme needed) sent someone who just typed their password
 * straight to another site. The realistic path in is a phishing email with a
 * genuine recoverybridge.app login link and a crafted redirect param.
 *
 * Only an in-app path is safe: must start with a single `/` and not `//`
 * (which the browser resolves as protocol-relative, i.e. off-site) or `/\`
 * (some browsers normalize backslashes to forward slashes, so `/\evil.com`
 * is the same trick spelled differently). Everything else — absolute URLs,
 * protocol-relative URLs, `javascript:`, empty string — falls back.
 *
 * Two further checks, because prefix tests alone were not enough: the URL
 * parser strips tabs and newlines, so `/<tab>/evil.com` (sent as
 * `?redirect=/%09/evil.com`) passed the checks above and still resolved to
 * `https://evil.com/`. Control characters and backslashes are refused
 * outright, and the value is then resolved the way the browser will: it must
 * stay on the origin it was resolved against.
 */
const PLACEHOLDER_ORIGIN = 'https://redirect-check.invalid'

// Control characters (incl. tab, CR, LF) and backslashes never belong in an in-app path.
const UNSAFE_CHARS = /[\u0000-\u001f\u007f\\]/

export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (UNSAFE_CHARS.test(value)) return fallback
  try {
    if (new URL(value, PLACEHOLDER_ORIGIN).origin !== PLACEHOLDER_ORIGIN) return fallback
  } catch {
    return fallback
  }
  return value
}
