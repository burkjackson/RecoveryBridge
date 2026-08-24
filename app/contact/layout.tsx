import type { Metadata } from 'next'

// Metadata for the client-rendered /contact page (kept in the segment layout
// because a 'use client' page can't export metadata itself).
export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with the RecoveryBridge team — questions, feedback, partnership inquiries, or help with your account. We read every message.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Us | RecoveryBridge',
    description:
      'Questions, feedback, or partnership inquiries? Get in touch with the RecoveryBridge team.',
    url: 'https://recoverybridge.app/contact',
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
