import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isRateLimited } from '@/lib/rateLimit'
import { isAllowedPushEndpoint } from '@/lib/pushEndpoint'

// Called by the service worker's `pushsubscriptionchange` handler when the
// push service rotates or expires a device's subscription. The service worker
// has no user session, so this can't authenticate the usual way. Instead the
// old endpoint is the credential: it's an unguessable URL that only the push
// service, this device and our database ever see, and the route only ever
// replaces a row that already holds it. Nothing new is created here.

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  if (isRateLimited('push-resubscribe', ip, 10, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let oldEndpoint: unknown
  let subscription: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined
  try {
    const body = await request.json()
    oldEndpoint = body.oldEndpoint
    subscription = body.subscription
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const p256dh = subscription?.keys?.p256dh
  const auth = subscription?.keys?.auth
  if (
    !isAllowedPushEndpoint(oldEndpoint) ||
    !isAllowedPushEndpoint(subscription?.endpoint) ||
    typeof p256dh !== 'string' || p256dh.length > 256 ||
    typeof auth !== 'string' || auth.length > 256
  ) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('push_subscriptions')
    .update({ subscription: { endpoint: subscription!.endpoint, keys: { p256dh, auth } } })
    .eq('subscription->>endpoint', oldEndpoint)
    .select('id')

  if (error) {
    console.error('[push/resubscribe] update failed:', error)
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }

  if ((data ?? []).length === 0) {
    console.log('[push/resubscribe] no row held the old endpoint')
  }
  // Same response either way, so this can't be used to probe which
  // endpoints exist.
  return NextResponse.json({ success: true })
}
