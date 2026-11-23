'use client'

import { useEffect } from 'react'
import { viewportShift } from '@/lib/viewportShift'

/**
 * Keeps --vv-shift on <html> equal to how far the fixed bottom UI (BottomNav,
 * the floating SOS button) has to move down to sit on the real bottom of the
 * screen. Works around the iOS 26 keyboard-dismissal bug; see
 * lib/viewportShift.ts. Elsewhere the value stays 0px.
 */
export default function ViewportFix() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const root = document.documentElement
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--vv-shift', `${viewportShift(vv, window.innerHeight)}px`)
      })
    }
    // Safari settles the viewport a beat after the keyboard animates away.
    const updateLater = () => {
      update()
      setTimeout(update, 350)
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('focusout', updateLater)
    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      window.removeEventListener('scroll', update)
      window.removeEventListener('focusout', updateLater)
      root.style.removeProperty('--vv-shift')
    }
  }, [])

  return null
}
