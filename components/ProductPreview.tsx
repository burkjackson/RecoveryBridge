'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// A lightweight "see the product" popup for the landing hero. Keeps the page
// short while letting visitors preview what a real-time peer conversation
// looks like. The chat is an illustrative mock — no real user data.
export default function ProductPreview() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus management: trap focus, close on Escape, lock scroll, restore focus.
  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    document.body.style.overflow = 'hidden'
    dialog?.querySelector<HTMLElement>('button, a[href]')?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key !== 'Tab' || !dialog) return
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.hasAttribute('disabled'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      ;(previouslyFocused ?? triggerRef.current)?.focus()
    }
  }, [open])

  return (
    <>
      {/* Trigger — secondary tier, doesn't compete with the primary CTAs */}
      <div className="flex justify-center mb-12 -mt-1">
        <button
          ref={triggerRef}
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-rb-blue/30 text-rb-blue dark:text-blue-300 text-sm font-semibold hover:bg-white/70 dark:hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75 14.5 12l-4.75 2.25v-4.5Z" />
          </svg>
          See how it works
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div className="min-h-full flex items-start sm:items-center justify-center p-4">
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-preview-title"
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 my-4 animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close preview"
                className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-rb-gray dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-2xl leading-none transition-colors"
              >
                ×
              </button>

              {/* Header */}
              <h2 id="product-preview-title" className="text-lg font-bold text-rb-dark dark:text-gray-100 pr-8">
                A peek inside RecoveryBridge
              </h2>
              <p className="text-sm text-rb-gray dark:text-gray-300 mt-1 mb-4">
                This is what a private, one-on-one conversation feels like — a real person who gets it, in real time.
              </p>

              {/* Chat mock */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-[#F8F9FA] dark:bg-gray-900">
                {/* Mock chat header */}
                <div className="flex items-center gap-2.5 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-9 h-9 rounded-full bg-rb-blue flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    J
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-rb-dark dark:text-gray-100 leading-tight">Jordan</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
                      <span className="text-xs text-rb-gray dark:text-gray-300">Active now</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-[11px] font-medium text-green-800 dark:text-green-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3 h-3" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    Private
                  </span>
                </div>

                {/* Mock messages */}
                <div className="p-4 space-y-2.5">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] px-3.5 py-2 rounded-2xl bg-white dark:bg-gray-700 text-rb-dark dark:text-gray-100 text-sm shadow-sm border border-gray-100 dark:border-gray-600">
                      Hey — I&apos;m really glad you reached out. What&apos;s going on today?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-3.5 py-2 rounded-2xl bg-rb-blue text-white text-sm shadow-sm">
                      Rough night. Almost slipped, but I didn&apos;t.
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[80%] px-3.5 py-2 rounded-2xl bg-white dark:bg-gray-700 text-rb-dark dark:text-gray-100 text-sm shadow-sm border border-gray-100 dark:border-gray-600">
                      That took real strength. I&apos;ve been there too — you&apos;re not alone in this.
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-3.5 py-2 rounded-2xl bg-rb-blue text-white text-sm shadow-sm">
                      Thank you. I really needed to hear that.
                    </div>
                  </div>
                </div>

                {/* Mock input (non-interactive) */}
                <div className="flex items-center gap-2 p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-400 dark:text-gray-300 select-none">
                    Type a message…
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-rb-blue text-white text-sm font-semibold select-none" aria-hidden="true">
                    Send
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 dark:text-gray-300 text-center mt-3">
                Sample conversation — illustrative only.
              </p>

              {/* CTA inside the popup */}
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="mt-4 block w-full text-center px-6 py-3.5 rounded-full bg-rb-blue hover:bg-rb-blue-hover text-white font-bold shadow-lg hover:shadow-xl transition-all"
              >
                Get Started — It&apos;s Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
