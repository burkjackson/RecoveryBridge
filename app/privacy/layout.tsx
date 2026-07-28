import type { Metadata } from 'next'

// Metadata for the client-rendered /privacy page (kept in the segment layout
// because a 'use client' page can't export metadata itself).
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How RecoveryBridge protects your privacy: anonymous by design, private conversations, and a promise never to sell your data or share it with advertisers.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy | RecoveryBridge',
    description:
      'Anonymous by design, private conversations, and a promise never to sell your data.',
    url: 'https://recoverybridge.app/privacy',
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
