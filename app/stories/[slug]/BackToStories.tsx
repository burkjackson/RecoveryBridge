'use client'

import { useRouter } from 'next/navigation'

interface BackToStoriesProps {
  label?: string
  variant?: 'header' | 'article'
}

export function BackToStories({
  label = '← All Stories',
  variant = 'header',
}: BackToStoriesProps) {
  const router = useRouter()

  function handleBack() {
    // If the previous page was on this same subdomain, use client-side back
    // so the user snaps back to the stories listing instantly.
    // Otherwise (e.g. they came from recoverybridge.app), navigate to /
    // which the Vercel rewrite maps to the stories listing.
    const referrer = document.referrer
    if (referrer && new URL(referrer).hostname === window.location.hostname) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const className =
    variant === 'header'
      ? 'text-sm text-white/70 hover:text-white transition flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-0 font-normal'
      : 'inline-flex items-center gap-2 text-sm font-semibold text-[#5A7A8C] hover:text-[#4A6A7C] transition cursor-pointer bg-transparent border-0 p-0'

  return (
    <button onClick={handleBack} className={className}>
      {label}
    </button>
  )
}
