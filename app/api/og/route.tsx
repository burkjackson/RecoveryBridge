import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') ?? 'RecoveryBridge'
  const subtitle = searchParams.get('subtitle') ?? 'Peer support for people in recovery'

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #E8F0F4 0%, #FFFFFF 60%, #F3EFF8 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#5A7A8C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
          }}
        >
          <div style={{ width: 40, height: 40, background: '#FFFFFF', borderRadius: '50%', opacity: 0.9 }} />
        </div>
        <div
          style={{
            fontSize: title.length > 40 ? 44 : 60,
            fontWeight: 700,
            color: '#2D3436',
            marginBottom: 20,
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: 900,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#4A5568',
            textAlign: 'center',
            maxWidth: 750,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#5A7A8C' }} />
          <div style={{ fontSize: 22, color: '#5A7A8C', fontWeight: 600 }}>recoverybridge.app</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
