'use client'

import { useState } from 'react'
import { IconWebsite, IconInstagram, IconX, IconLinkedIn, IconThreads } from '@/components/SocialIcons'

interface Props {
  slug: string
  title: string
}

export function ShareButtons({ slug, title }: Props) {
  const [copied, setCopied] = useState(false)
  const url = `https://stories.recoverybridge.app/${slug}`
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = url
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openShare(shareUrl: string) {
    window.open(shareUrl, '_blank', 'width=600,height=400,noopener,noreferrer')
  }

  const shareLinks = [
    {
      key: 'facebook',
      label: 'Facebook',
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      hoverClass: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700',
    },
    {
      key: 'x',
      label: 'Post on X',
      icon: <IconX className="w-3.5 h-3.5" />,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      hoverClass: 'hover:bg-gray-900 hover:border-gray-900 hover:text-white',
    },
    {
      key: 'instagram',
      label: 'Instagram',
      icon: <IconInstagram className="w-3.5 h-3.5" />,
      href: `https://www.instagram.com/`,
      hoverClass: 'hover:bg-pink-50 hover:border-pink-200 hover:text-pink-700',
    },
    {
      key: 'threads',
      label: 'Threads',
      icon: <IconThreads className="w-3.5 h-3.5" />,
      href: `https://www.threads.net/intent/post?text=${encodedTitle}%20${encodedUrl}`,
      hoverClass: 'hover:bg-gray-100 hover:border-gray-400 hover:text-gray-900',
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: <IconLinkedIn className="w-3.5 h-3.5" />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      hoverClass: 'hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700',
    },
    {
      key: 'website',
      label: 'Copy URL',
      icon: <IconWebsite className="w-3.5 h-3.5" />,
      href: url,
      hoverClass: 'hover:bg-[#E8F0F4] hover:border-[#5A7A8C] hover:text-[#5A7A8C]',
    },
  ]

  return (
    <div className="py-6 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Share this story</p>
      <div className="flex flex-wrap gap-2">

        {/* Copy Link */}
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-[#4A5568] transition"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Copy Link
            </>
          )}
        </button>

        {/* Social share buttons */}
        {shareLinks.map(({ key, label, icon, href, hoverClass }) => (
          <button
            key={key}
            onClick={() => openShare(href)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-[#4A5568] transition ${hoverClass}`}
          >
            {icon}
            {label}
          </button>
        ))}

      </div>
    </div>
  )
}
