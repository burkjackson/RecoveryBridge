import type { Metadata } from 'next'

// Metadata for the client-rendered /safety page. A page marked 'use client'
// can't export metadata itself, so it lives here in the segment layout.
export const metadata: Metadata = {
  title: 'Safety & Community Guidelines',
  description:
    'How RecoveryBridge keeps peer support safe: community guidelines, listener orientation, reporting and blocking tools, and 24/7 crisis resources (988, Crisis Text Line).',
  alternates: { canonical: '/safety' },
  openGraph: {
    title: 'Safety & Community Guidelines | RecoveryBridge',
    description:
      'Community guidelines, reporting and blocking tools, and 24/7 crisis resources that keep peer recovery support safe.',
    url: 'https://recoverybridge.app/safety',
  },
}

export default function SafetyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
