'use client'

import { useState, useEffect } from 'react'
import {
  isPushNotificationSupported,
  getNotificationPermission,
  isIOSNeedsPWAInstall,
} from '@/lib/pushNotifications'
import { Body16 } from '@/components/ui/Typography'

export default function NotificationDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const info = {
      // Browser detection
      userAgent: navigator.userAgent,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isInStandaloneMode: ('standalone' in window.navigator) && (window.navigator as any).standalone,

      // Feature detection
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushManager: 'PushManager' in window,
      hasNotification: 'Notification' in window,

      // Our functions
      isPushSupported: isPushNotificationSupported(),
      notificationPermission: getNotificationPermission(),
      needsPWAInstall: isIOSNeedsPWAInstall(),

      // Additional checks
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
    }

    setDebugInfo(info)
  }, [])

  return (
    <div className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300 text-xs font-mono">
      <div className="mb-2 font-bold text-sm">🔍 Notification Debug Info</div>
      <div className="space-y-1 text-gray-700">
        <div><strong>iOS Device:</strong> {debugInfo.isIOS ? 'Yes' : 'No'}</div>
        <div><strong>PWA Mode:</strong> {debugInfo.isInStandaloneMode ? 'Yes ✓' : 'No ✗'}</div>
        <div><strong>Needs PWA Install:</strong> {debugInfo.needsPWAInstall ? 'Yes' : 'No'}</div>
        <div className="border-t border-gray-300 pt-1 mt-1">
          <strong>Feature Support:</strong>
        </div>
        <div>• Service Worker: {debugInfo.hasServiceWorker ? 'Yes ✓' : 'No ✗'}</div>
        <div>• PushManager: {debugInfo.hasPushManager ? 'Yes ✓' : 'No ✗'}</div>
        <div>• Notification API: {debugInfo.hasNotification ? 'Yes ✓' : 'No ✗'}</div>
        <div>• Push Supported: {debugInfo.isPushSupported ? 'Yes ✓' : 'No ✗'}</div>
        <div className="border-t border-gray-300 pt-1 mt-1">
          <strong>Permission:</strong> {debugInfo.notificationPermission}
        </div>
        <div><strong>Secure Context:</strong> {debugInfo.isSecureContext ? 'Yes ✓' : 'No ✗'}</div>
        <div><strong>Protocol:</strong> {debugInfo.protocol}</div>
        <div className="border-t border-gray-300 pt-1 mt-1 text-[10px] break-all">
          <strong>User Agent:</strong> {debugInfo.userAgent}
        </div>
      </div>
    </div>
  )
}
