import type { Metadata } from 'next'

// safety/page.tsx is a client component and can't export metadata, so the
// canonical lives here. Self-referencing canonical (resolved against the root
// metadataBase) collapses any tracking variants like
// /safety?ref=blog.recoverybridge.app back to the clean /safety URL for SEO.
export const metadata: Metadata = {
  title: 'Safety Guidelines',
  description:
    'How RecoveryBridge keeps peer support safe — crisis resources, community guidelines, and privacy expectations.',
  alternates: {
    canonical: '/safety',
  },
}

export default function SafetyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
