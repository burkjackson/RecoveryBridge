import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const w = Math.min(parseInt(searchParams.get('w') || '1170', 10), 3000)
  const h = Math.min(parseInt(searchParams.get('h') || '2532', 10), 6000)

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
