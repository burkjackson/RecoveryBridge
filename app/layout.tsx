import type { Metadata, Viewport } from 'next'
import './globals.css'
import CrisisResources from '@/components/CrisisResources'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title: 'RecoveryBridge',
  description: 'Safe, peer-to-peer support for people in recovery - because connection is the antidote to addiction',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RecoveryBridge',
  },
  applicationName: 'RecoveryBridge',
}

export const viewport: Viewport = {
  themeColor: '#7FA1B3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        {children}
        <CrisisResources />
      </body>
    </html>
  )
}
