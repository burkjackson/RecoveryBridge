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
    // Otherwise fall back to /stories (the Next.js route, not '/' which
    // resolves to the main app's root on the client-side router).
    const referrer = document.referrer
    if (referrer && new URL(referrer).hostname === window.location.hostname) {
      router.back()
    } else {
      router.push('/stories')
    }
  }

  const className =
    variant === 'header'
      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-sm text-white/90 hover:text-white transition cursor-pointer border-0 font-normal'
      : 'inline-flex items-center gap-2 text-sm font-semibold text-[#5A7A8C] hover:text-[#4A6A7C] transition cursor-pointer bg-transparent border-0 p-0'

  return (
    <button onClick={handleBack} className={className}>
      {label}
    </button>
  )
}
