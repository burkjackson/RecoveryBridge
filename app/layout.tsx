import type { Metadata } from 'next'
import './globals.css'
import CrisisResources from '@/components/CrisisResources'

export const metadata: Metadata = {
  title: 'RecoveryBridge',
  description: 'Safe, peer-to-peer support for people in recovery - because connection is the antidote to addiction',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <CrisisResources />
      </body>
    </html>
  )
}
