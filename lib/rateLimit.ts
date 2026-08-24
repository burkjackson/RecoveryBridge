// Simple in-memory rate limiter shared by the API routes.
//
// Known limitation (see CLAUDE.md): the counters live in the serverless
// instance's memory, so they reset on cold start and aren't shared across
// concurrent instances. That's adequate for blunting accidental loops and
// casual abuse on a low-volume app; move to Postgres or KV if it ever needs
// to be authoritative.

interface Bucket {
  windowMs: number
  max: number
  hits: Map<string, number[]>
}

const buckets = new Map<string, Bucket>()

/**
 * Record a hit for `key` in the named bucket and report whether it exceeded
 * the limit. Buckets are created on first use.
 *
 * @param name    bucket name — usually the route, so limits don't interfere
 * @param key     what to count per (user id, IP, …)
 * @param max     allowed hits per window
 * @param windowMs window length in milliseconds
 */
export function isRateLimited(name: string, key: string, max: number, windowMs: number): boolean {
  let bucket = buckets.get(name)
  if (!bucket) {
    bucket = { windowMs, max, hits: new Map() }
    buckets.set(name, bucket)
  }

  const now = Date.now()
  const recent = (bucket.hits.get(key) || []).filter((t) => now - t < windowMs)

  if (recent.length >= max) {
    bucket.hits.set(key, recent)
    return true
  }

  recent.push(now)
  bucket.hits.set(key, recent)

  // Opportunistic cleanup so a long-lived instance doesn't accumulate keys
  // for users who stopped calling.
  if (bucket.hits.size > 5000) {
    for (const [k, timestamps] of bucket.hits) {
      if (timestamps.every((t) => now - t >= windowMs)) bucket.hits.delete(k)
    }
  }

  return false
}
