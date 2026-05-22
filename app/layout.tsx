import type { Metadata, Viewport } from 'next'
import './globals.css'
import CrisisResources from '@/components/CrisisResources'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import ThemeProvider from '@/components/ThemeProvider'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  metadataBase: new URL('https://recoverybridge.app'),
  title: {
    default: 'RecoveryBridge — Free Peer Support for Addiction Recovery',
    template: '%s | RecoveryBridge',
  },
  description: 'Safe, peer-to-peer support for people in recovery — because connection is the antidote to addiction.',
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
  openGraph: {
    siteName: 'RecoveryBridge',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@recoverybridge',
  },
}

export const viewport: Viewport = {
  themeColor: '#7FA1B3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Prevent flash of incorrect theme */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){if(localStorage.getItem('rb-theme')==='dark'){document.documentElement.classList.add('dark');}})();` }} />
      </head>
      <body>
        <ThemeProvider>
          <ServiceWorkerRegistration />
          {children}
          <CrisisResources />
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  )
}
