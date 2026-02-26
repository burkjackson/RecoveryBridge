'use client'

import { Heading1, Body16, Body18 } from '@/components/ui/Typography'

interface NotificationInstructionsModalProps {
  isOpen: boolean
  onClose: () => void
  platform?: 'ios' | 'android' | 'desktop'
}

export default function NotificationInstructionsModal({
  isOpen,
  onClose,
  platform = 'ios',
}: NotificationInstructionsModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Heading1 className="text-2xl">Enable Notifications</Heading1>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-2"
            aria-label="Close instructions"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── iOS ── */}
        {platform === 'ios' && <IOSInstructions />}

        {/* ── Android ── */}
        {platform === 'android' && <AndroidInstructions />}

        {/* ── Desktop ── */}
        {platform === 'desktop' && <DesktopInstructions />}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full min-h-[44px] px-6 py-3 bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full font-semibold hover:shadow-lg transition-all mt-2"
        >
          Got It!
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   iOS Instructions
───────────────────────────────────────── */
function IOSInstructions() {
  return (
    <>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
        <Body18 className="font-semibold text-blue-900 mb-2">📱 PWA Required on iPhone</Body18>
        <Body16 className="text-sm text-blue-800">
          Push notifications only work when RecoveryBridge is <strong>opened as a Progressive Web App</strong> from your home screen — not from Safari directly.
        </Body16>
      </div>

      <Body16 className="text-gray-600 mb-6">
        Follow these steps to get instant notifications when someone needs support:
      </Body16>

      <Step number={1} title="Add RecoveryBridge to Your Home Screen">
        <SubStep letter="a">Open RecoveryBridge in <strong>Safari</strong> on your iPhone.</SubStep>
        <SubStep letter="b">Tap the <strong>Share</strong> button at the bottom of the screen (the square with an arrow pointing up ⬆).</SubStep>
        <SubStep letter="c">Scroll down and tap <strong>"Add to Home Screen"</strong>.</SubStep>
        <SubStep letter="⚠" warning>
          <strong className="text-amber-700">IMPORTANT:</strong> Make sure <strong className="text-amber-700">"Open as Web App"</strong> is turned <strong className="text-green-600">ON</strong> (green toggle). This is required for notifications!
        </SubStep>
        <SubStep letter="d">Tap <strong>"Add"</strong> in the top right corner.</SubStep>
      </Step>

      <Step number={2} title="Open from Your Home Screen">
        <Body16 className="text-gray-700">
          Go to your home screen and tap the <strong>RecoveryBridge icon</strong> — not Safari.
        </Body16>
      </Step>

      <Step number={3} title="Turn On Notifications">
        <Body16 className="text-gray-700">
          Click the <strong>"Enable Notifications"</strong> button on your dashboard and allow when prompted.
        </Body16>
      </Step>

      <Step number={4} title="Make Alerts Stay on Screen (Listeners)">
        <Body16 className="text-gray-700 mb-2">
          By default, iOS dismisses notification banners after a few seconds. If you&apos;re a listener, change this so you never miss a support request:
        </Body16>
        <SubStep letter="a">Open your iPhone <strong>Settings</strong> app.</SubStep>
        <SubStep letter="b">Scroll down and tap <strong>RecoveryBridge</strong>.</SubStep>
        <SubStep letter="c">Tap <strong>Notifications</strong>.</SubStep>
        <SubStep letter="d">Under <strong>Banner Style</strong>, tap <strong>"Persistent"</strong>.</SubStep>
        <SubStep letter="✓" warning={false}>
          Alerts will now stay on your screen until you actively dismiss them — so you never miss someone in need.
        </SubStep>
      </Step>

      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded mb-6">
        <Body18 className="font-semibold text-amber-900 mb-2">⚠️ Important Reminder</Body18>
        <Body16 className="text-sm text-amber-800">
          Notifications <strong>only work when you open RecoveryBridge as a PWA from your home screen</strong>, not from Safari. If you&apos;re reading this in Safari right now, complete Steps 1 &amp; 2 first!
        </Body16>
      </div>

      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
        <Body18 className="font-semibold text-green-900 mb-2">⚡ Always Available Mode</Body18>
        <Body16 className="text-sm text-green-800 mb-2">
          Once notifications are enabled, listeners can turn on <strong>Always Available Mode</strong> to stay reachable even when the app is closed.
        </Body16>
        <Body16 className="text-sm text-green-800">
          <strong>Requires:</strong> PWA mode + Push notifications enabled. Available for listeners only.
        </Body16>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────
   Android Instructions
───────────────────────────────────────── */
function AndroidInstructions() {
  return (
    <>
      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
        <Body18 className="font-semibold text-green-900 mb-2">🤖 Great news — Android is easy!</Body18>
        <Body16 className="text-sm text-green-800">
          Android Chrome supports push notifications natively. Just install the app and you&apos;re ready to go.
        </Body16>
      </div>

      <Body16 className="text-gray-600 mb-6">
        Follow these quick steps:
      </Body16>

      <Step number={1} title="Install RecoveryBridge">
        <Body16 className="text-gray-700 mb-2">
          Chrome will show an <strong>"Install app"</strong> banner at the bottom of the screen — tap it. If you don&apos;t see it:
        </Body16>
        <SubStep letter="a">Tap the <strong>⋮ menu</strong> (three dots) in the top-right corner of Chrome.</SubStep>
        <SubStep letter="b">Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.</SubStep>
        <SubStep letter="c">Tap <strong>"Install"</strong> to confirm.</SubStep>
      </Step>

      <Step number={2} title="Open from Your Home Screen">
        <Body16 className="text-gray-700">
          Tap the <strong>RecoveryBridge icon</strong> on your home screen to open it as an app.
        </Body16>
      </Step>

      <Step number={3} title="Enable Notifications">
        <Body16 className="text-gray-700">
          Tap <strong>"Enable Notifications"</strong> on your dashboard and tap <strong>Allow</strong> when Chrome asks for permission. That&apos;s it — you&apos;re set!
        </Body16>
      </Step>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
        <Body18 className="font-semibold text-blue-900 mb-2">💡 Tip</Body18>
        <Body16 className="text-sm text-blue-800">
          On Android, notifications work in Chrome, Edge, and Samsung Internet. Firefox for Android does not support web push notifications.
        </Body16>
      </div>

      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
        <Body18 className="font-semibold text-green-900 mb-2">⚡ Always Available Mode</Body18>
        <Body16 className="text-sm text-green-800">
          Once notifications are enabled, listeners can turn on <strong>Always Available Mode</strong> to stay reachable even when the app is closed.
        </Body16>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────
   Desktop Instructions
───────────────────────────────────────── */
function DesktopInstructions() {
  return (
    <>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
        <Body18 className="font-semibold text-blue-900 mb-2">🖥️ Desktop Notifications</Body18>
        <Body16 className="text-sm text-blue-800">
          Desktop notifications work in Chrome and Edge without any installation required. Safari on Mac does not support web push.
        </Body16>
      </div>

      <Body16 className="text-gray-600 mb-6">
        Two options — pick whichever works best for you:
      </Body16>

      <Step number={1} title="Enable Notifications in Your Browser">
        <SubStep letter="a">Click <strong>"Enable Notifications"</strong> on your dashboard.</SubStep>
        <SubStep letter="b">When your browser asks for permission, click <strong>"Allow"</strong>.</SubStep>
        <SubStep letter="c">Notifications will appear on your desktop even when RecoveryBridge is in a background tab.</SubStep>
      </Step>

      <Step number={2} title="(Optional) Install as a Desktop App">
        <Body16 className="text-gray-700 mb-2">
          For a cleaner experience, you can install RecoveryBridge as a standalone app:
        </Body16>
        <SubStep letter="a">Look for the <strong>install icon</strong> (⊕ or monitor icon) in the address bar.</SubStep>
        <SubStep letter="b">Click it and select <strong>"Install"</strong>.</SubStep>
        <SubStep letter="c">RecoveryBridge will open in its own window, separate from your browser.</SubStep>
      </Step>

      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded mb-6">
        <Body18 className="font-semibold text-amber-900 mb-2">⚠️ Using Safari on Mac?</Body18>
        <Body16 className="text-sm text-amber-800">
          Safari does not support web push notifications. Please use <strong>Chrome</strong> or <strong>Edge</strong> for desktop notifications.
        </Body16>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────
   Shared sub-components
───────────────────────────────────────── */
function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold flex-shrink-0">
          {number}
        </div>
        <Body18 className="font-semibold text-gray-900">{title}</Body18>
      </div>
      <div className="ml-10 space-y-3">{children}</div>
    </div>
  )
}

function SubStep({ letter, warning, children }: { letter: string; warning?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${warning ? 'bg-amber-100' : 'bg-blue-100'}`}>
        <span className={`text-xs font-bold ${warning ? 'text-amber-600' : 'text-blue-600'}`}>{letter}</span>
      </div>
      <Body16 className="text-gray-700">{children}</Body16>
    </div>
  )
}
