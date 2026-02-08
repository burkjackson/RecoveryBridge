'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

export default function CrisisResources() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const isChat = pathname?.startsWith('/chat')

  return (
    <>
      {/* Floating Crisis Button - Always Visible */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed right-6 z-50 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2 font-semibold ${isChat ? 'bottom-24' : 'bottom-6'}`}
        aria-label="Access crisis resources and emergency contacts"
      >
        <span className="text-xl" aria-hidden="true">🆘</span>
        <span className="hidden sm:inline">Crisis Help</span>
      </button>

      {/* Crisis Resources Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 overflow-y-auto"
          onClick={() => setIsOpen(false)}
        >
          <div className="min-h-full flex items-start sm:items-center justify-center p-4">
            <div
              role="dialog"
              aria-labelledby="crisis-modal-title"
              aria-modal="true"
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl my-4"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">🆘</span>
                <h2
                  id="crisis-modal-title"
                  className="text-2xl font-bold text-rb-dark"
                >
                  Crisis Support
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-rb-gray hover:text-rb-dark text-2xl leading-none"
                aria-label="Close crisis resources"
              >
                ×
              </button>
            </div>

            {/* Message */}
            <p className="text-rb-dark mb-6 text-lg">
              If you're in crisis or need immediate support, please reach out to one of these resources:
            </p>

            {/* Crisis Resources List */}
            <div className="space-y-4 mb-6">
              {/* 988 Suicide & Crisis Lifeline */}
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <h3 className="font-bold text-rb-dark mb-2 text-lg">
                  988 Suicide & Crisis Lifeline
                </h3>
                <div className="space-y-1 text-rb-dark">
                  <p className="flex items-center gap-2">
                    <span className="font-semibold">Call or Text:</span>
                    <a
                      href="tel:988"
                      className="text-rb-blue hover:text-rb-blue-hover underline font-bold text-lg"
                    >
                      988
                    </a>
                  </p>
                  <p className="text-sm text-rb-gray">24/7 • Free & Confidential</p>
                </div>
              </div>

              {/* Crisis Text Line */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h3 className="font-bold text-rb-dark mb-2 text-lg">
                  Crisis Text Line
                </h3>
                <div className="space-y-1 text-rb-dark">
                  <p className="flex items-center gap-2">
                    <span className="font-semibold">Text:</span>
                    <span className="font-bold">HOME</span>
                    <span>to</span>
                    <a
                      href="sms:741741"
                      className="text-rb-blue hover:text-rb-blue-hover underline font-bold text-lg"
                    >
                      741741
                    </a>
                  </p>
                  <p className="text-sm text-rb-gray">24/7 • Free & Confidential</p>
                </div>
              </div>

              {/* SAMHSA National Helpline */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <h3 className="font-bold text-rb-dark mb-2 text-lg">
                  SAMHSA National Helpline
                </h3>
                <div className="space-y-1 text-rb-dark">
                  <p className="flex items-center gap-2">
                    <span className="font-semibold">Call:</span>
                    <a
                      href="tel:1-800-662-4357"
                      className="text-rb-blue hover:text-rb-blue-hover underline font-bold text-lg"
                    >
                      1-800-662-4357
                    </a>
                  </p>
                  <p className="text-sm text-rb-gray">
                    Treatment referral & information service
                  </p>
                  <p className="text-sm text-rb-gray">24/7 • Free & Confidential</p>
                </div>
              </div>

              {/* Emergency Services */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <h3 className="font-bold text-rb-dark mb-2 text-lg">
                  Emergency Services
                </h3>
                <div className="space-y-1 text-rb-dark">
                  <p className="flex items-center gap-2">
                    <span className="font-semibold">Call:</span>
                    <a
                      href="tel:911"
                      className="text-rb-blue hover:text-rb-blue-hover underline font-bold text-lg"
                    >
                      911
                    </a>
                  </p>
                  <p className="text-sm text-rb-gray">For immediate life-threatening emergencies</p>
                </div>
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-rb-blue/10 border border-rb-blue/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-rb-dark">
                <strong>You're not alone.</strong> These services are staffed by trained counselors who can help you through difficult moments. All calls and texts are confidential.
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full bg-rb-blue hover:bg-rb-blue-hover text-white py-3 rounded-full font-semibold transition"
            >
              Close
            </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
