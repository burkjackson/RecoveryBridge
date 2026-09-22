/**
 * Whether a value is an https URL on a real browser push service. Used by
 * /api/push/resubscribe so a caller can't point someone's pushes at a
 * server of their own.
 */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^([a-z0-9-]+\.)*push\.apple\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^([a-z0-9-]+\.)*notify\.windows\.com$/,
]

export function isAllowedPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(url.hostname))
  } catch {
    return false
  }
}

