import type { Metadata } from 'next'

// Metadata for the client-rendered /terms page (kept in the segment layout
// because a 'use client' page can't export metadata itself).
export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that govern your use of RecoveryBridge — a free, anonymous peer support platform for people in addiction recovery.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of Service | RecoveryBridge',
    description:
      'The terms that govern your use of RecoveryBridge peer support.',
    url: 'https://recoverybridge.app/terms',
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
