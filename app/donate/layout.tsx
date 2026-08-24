import type { Metadata } from 'next'

// Metadata for the client-rendered /donate page (kept in the segment layout
// because a 'use client' page can't export metadata itself).
export const metadata: Metadata = {
  title: 'Donate',
  description:
    'RecoveryBridge is free, ad-free, and donation-supported. Your tax-deductible gift keeps anonymous peer recovery support available to everyone, 24/7.',
  alternates: { canonical: '/donate' },
  openGraph: {
    title: 'Donate | RecoveryBridge',
    description:
      'Your tax-deductible gift keeps free, anonymous peer recovery support available to everyone, 24/7.',
    url: 'https://recoverybridge.app/donate',
  },
}

export default function DonateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
