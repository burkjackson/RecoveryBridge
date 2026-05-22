import type { Metadata, Viewport } from 'next'
import './globals.css'
import CrisisResources from '@/components/CrisisResources'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import ThemeProvider from '@/components/ThemeProvider'
import ToastProvider from '@/components/ToastProvider'
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
        {/* iOS PWA splash screens */}
        <link rel="apple-touch-startup-image" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" href="/api/splash?w=1290&h=2796" />
        <link rel="apple-touch-startup-image" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" href="/api/splash?w=1179&h=2556" />
        <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/api/splash?w=1170&h=2532" />
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/api/splash?w=1125&h=2436" />
        <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" href="/api/splash?w=1242&h=2688" />
        <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" href="/api/splash?w=1242&h=2208" />
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/api/splash?w=750&h=1334" />
        <link rel="apple-touch-startup-image" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" href="/api/splash?w=1536&h=2048" />
        <link rel="apple-touch-startup-image" media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)" href="/api/splash?w=1640&h=2360" />
        <link rel="apple-touch-startup-image" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" href="/api/splash?w=2048&h=2732" />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <ServiceWorkerRegistration />
            {children}
            <CrisisResources />
            <BottomNav />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
