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
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}
