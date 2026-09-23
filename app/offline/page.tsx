// Deliberately a plain server component with inline styles, no Tailwind
// classes and no client JS.
//
// The service worker only precaches this page's HTML document (public/sw.js
// OFFLINE_URL), not its CSS bundle or JS chunks — those are hashed per build
// and can't be named ahead of time in the precache list. When this page
// used Tailwind classes and an onClick reload button, someone actually
// offline got unstyled text and a dead button, because the stylesheet and
// hydration bundle it depended on were exactly the things that couldn't
// load. Inline styles need no stylesheet; the "Try again" link below is
// next/link's Link, which still server-renders as a plain <a href="/">, so
// it works identically with no JS loaded — just without eslint's
// no-html-link-for-pages complaint. See CLAUDE.md known issue #22.
import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main
      id="main-content"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#F8F9FA',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: '380px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#2D3436', margin: '0 0 12px' }}>
          You&rsquo;re offline
        </h1>
        <p style={{ color: '#4A5568', margin: '0 0 24px', lineHeight: 1.6 }}>
          RecoveryBridge needs an internet connection to connect you with listeners. Check your
          connection and try again.
        </p>

        <div
          style={{
            background: '#FEF3E2',
            border: '1px solid #FDE0A8',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            textAlign: 'left',
          }}
        >
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#92400E', margin: '0 0 8px' }}>
            Need immediate support?
          </p>
          <p style={{ fontSize: '14px', color: '#92400E', margin: '0 0 6px', lineHeight: 1.5 }}>
            <a href="sms:988" style={{ color: '#92400E', fontWeight: 600 }}>Text 988</a>{' '}or{' '}
            <a href="tel:988" style={{ color: '#92400E', fontWeight: 600 }}>call</a>
            {' '}— Suicide &amp; Crisis Lifeline
          </p>
          <p style={{ fontSize: '14px', color: '#92400E', margin: '0 0 6px', lineHeight: 1.5 }}>
            <a href="sms:741741?&body=HOME" style={{ color: '#92400E', fontWeight: 600 }}>
              Text HOME to 741741
            </a>{' '}— Crisis Text Line
          </p>
          <p style={{ fontSize: '14px', color: '#92400E', margin: 0, lineHeight: 1.5 }}>
            <a href="tel:911" style={{ color: '#92400E', fontWeight: 600 }}>Call 911</a>{' '}
            in immediate danger
          </p>
        </div>

        {/* Not an onClick handler — this has to work with no JS loaded. Link
            still server-renders a plain <a href="/">, so it works the same. */}
        <Link
          href="/"
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            padding: '14px',
            background: '#4A6A7C',
            color: '#fff',
            borderRadius: '12px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Try again
        </Link>
      </div>
    </main>
  )
}
