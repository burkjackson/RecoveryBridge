import type { Metadata } from 'next'
import './globals.css'
import CrisisResources from '@/components/CrisisResources'

export const metadata: Metadata = {
  title: 'RecoveryBridge',
  description: 'A modern recovery support application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="skip-link"
          aria-label="Skip to main content"
        >
          Skip to main content
        </a>
        {children}
        <CrisisResources />
      </body>
    </html>
  )
}
