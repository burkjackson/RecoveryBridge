'use client'

import { Heading1, Body16, Body18 } from '@/components/ui/Typography'

interface NotificationInstructionsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationInstructionsModal({
  isOpen,
  onClose
}: NotificationInstructionsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
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

        <Body16 className="text-gray-600 mb-6">
          Follow these simple steps to get instant notifications when someone needs support:
        </Body16>

        {/* Step 1: Add to Home Screen */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
              1
            </div>
            <Body18 className="font-semibold text-gray-900">
              Add RecoveryBridge to Your Home Screen
            </Body18>
          </div>

          <div className="ml-10 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs text-blue-600 font-bold">a</span>
              </div>
              <Body16 className="text-gray-700">
                Open RecoveryBridge in <strong>Safari</strong> on your iPhone
              </Body16>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs text-blue-600 font-bold">b</span>
              </div>
              <Body16 className="text-gray-700">
                Tap the <strong>Share</strong> button at the bottom of your screen (the square with an arrow pointing up)
              </Body16>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs text-blue-600 font-bold">c</span>
              </div>
              <Body16 className="text-gray-700">
                Scroll down and tap <strong>"Add to Home Screen"</strong>
              </Body16>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs text-blue-600 font-bold">d</span>
              </div>
              <Body16 className="text-gray-700">
                Tap <strong>"Add"</strong> in the top right corner
              </Body16>
            </div>
          </div>
        </div>

        {/* Step 2: Open from Home Screen */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
              2
            </div>
            <Body18 className="font-semibold text-gray-900">
              Open from Your Home Screen
            </Body18>
          </div>

          <div className="ml-10">
            <Body16 className="text-gray-700">
              Go to your home screen and tap the <strong>RecoveryBridge icon</strong> (not Safari)
            </Body16>
          </div>
        </div>

        {/* Step 3: Enable Notifications */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
              3
            </div>
            <Body18 className="font-semibold text-gray-900">
              Turn On Notifications
            </Body18>
          </div>

          <div className="ml-10">
            <Body16 className="text-gray-700">
              Click the <strong>"Enable Notifications"</strong> button on your dashboard and allow when prompted
            </Body16>
          </div>
        </div>

        {/* Important Note */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded mb-6">
          <Body18 className="font-semibold text-amber-900 mb-2">
            Important
          </Body18>
          <Body16 className="text-sm text-amber-800">
            Notifications <strong>only work when you open RecoveryBridge from your home screen</strong>, not from Safari. Make sure you've completed Step 1 first!
          </Body16>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full min-h-[44px] px-6 py-3 bg-gradient-to-r from-rb-blue to-rb-blue-hover text-white rounded-full font-semibold hover:shadow-lg transition-all"
        >
          Got It!
        </button>
      </div>
    </div>
  )
}
