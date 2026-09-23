import { ImageResponse } from 'next/og'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// The exact (w, h) pairs app/layout.tsx's apple-touch-startup-image <link>
// tags ever request — every real iOS device size this app supports. This
// route is unauthenticated and was previously unbounded (clamped to at most
// 3000x6000, but any value inside that range was a fresh, uncached edge
// render), which review item #28 flagged as a compute-burn vector: nothing
// stopped a script from cycling through thousands of distinct sizes. Now
// only these pairs render; anything else is rejected outright rather than
// clamped, since clamping still lets an attacker probe a huge space of
// distinct cache keys.
const ALLOWED_SIZES = new Set([
  '1290x2796', '1179x2556', '1170x2532', '1125x2436', '1242x2688',
  '1242x2208', '750x1334', '1536x2048', '1640x2360', '2048x2732',
])

// Coarse IP-based limit — this route has no auth to key on. Generous
// headroom for a real device re-requesting its splash image a few times
// while installing the PWA, well below what a scripted loop would need to
// matter.
const hits = new Map<string, number[]>()
const RATE_WINDOW_MS = 60 * 1000
const RATE_MAX = 30

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const recent = (hits.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 2000) {
    for (const [k, timestamps] of hits) {
      if (timestamps.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k)
    }
  }
  return false
}

export function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return new NextResponse('Too many requests', { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const wRaw = searchParams.get('w') ?? '1170'
  const hRaw = searchParams.get('h') ?? '2532'

  if (!ALLOWED_SIZES.has(`${wRaw}x${hRaw}`)) {
    return new NextResponse('Unsupported size', { status: 400 })
  }

  const w = parseInt(wRaw, 10)
  const h = parseInt(hRaw, 10)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8F9FA',
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 36,
            backgroundColor: '#5A7A8C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            boxShadow: '0 8px 32px rgba(90,122,140,0.3)',
          }}
        >
          <div style={{ fontSize: 80, lineHeight: 1 }}>🌉</div>
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#2D3436',
            letterSpacing: '-0.5px',
          }}
        >
          RecoveryBridge
        </div>
        <div
          style={{
            fontSize: 18,
            color: '#4A5568',
            marginTop: 12,
          }}
        >
          Peer support for recovery
        </div>
      </div>
    ),
    { width: w, height: h }
  )
}
