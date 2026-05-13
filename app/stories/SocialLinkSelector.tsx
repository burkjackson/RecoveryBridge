'use client'

import { useState, useEffect } from 'react'
import { IconWebsite, IconInstagram, IconX, IconLinkedIn, IconThreads, IconYouTube } from '@/components/SocialIcons'

type Platform = 'website' | 'instagram' | 'twitter' | 'linkedin' | 'threads' | 'youtube'

const PLATFORMS: {
  key: Platform
  label: string
  Icon: React.ComponentType<{ className?: string }>
  type: 'url' | 'text'
  prefix?: string
  placeholder: string
}[] = [
  { key: 'website',   label: 'Website',    Icon: IconWebsite,   type: 'url',  placeholder: 'https://yoursite.com' },
  { key: 'instagram', label: 'Instagram',  Icon: IconInstagram, type: 'text', prefix: '@', placeholder: 'username' },
  { key: 'twitter',   label: 'X / Twitter', Icon: IconX,        type: 'text', prefix: '@', placeholder: 'username' },
  { key: 'linkedin',  label: 'LinkedIn',   Icon: IconLinkedIn,  type: 'url',  placeholder: 'https://linkedin.com/in/...' },
  { key: 'threads',   label: 'Threads',    Icon: IconThreads,   type: 'text', prefix: '@', placeholder: 'username' },
  { key: 'youtube',   label: 'YouTube',    Icon: IconYouTube,   type: 'url',  placeholder: 'Channel URL' },
]

interface Props {
  website: string;    setWebsite: (v: string) => void
  instagram: string;  setInstagram: (v: string) => void
  twitter: string;    setTwitter: (v: string) => void
  linkedin: string;   setLinkedin: (v: string) => void
  threads: string;    setThreads: (v: string) => void
  youtube: string;    setYoutube: (v: string) => void
}

export function SocialLinkSelector({
  website, setWebsite, instagram, setInstagram,
  twitter, setTwitter, linkedin, setLinkedin,
  threads, setThreads, youtube, setYoutube,
}: Props) {
  const values: Record<Platform, string> = { website, instagram, twitter, linkedin, threads, youtube }
  const setters: Record<Platform, (v: string) => void> = {
    website: setWebsite, instagram: setInstagram, twitter: setTwitter,
    linkedin: setLinkedin, threads: setThreads, youtube: setYoutube,
  }

  const [active, setActive] = useState<Set<Platform>>(() => {
    const s = new Set<Platform>()
    if (website)   s.add('website')
    if (instagram) s.add('instagram')
    if (twitter)   s.add('twitter')
    if (linkedin)  s.add('linkedin')
    if (threads)   s.add('threads')
    if (youtube)   s.add('youtube')
    return s
  })

  // Auto-activate platforms when values load in from outside (edit page)
  useEffect(() => {
    setActive(prev => {
      const next = new Set(prev)
      if (website)   next.add('website')
      if (instagram) next.add('instagram')
      if (twitter)   next.add('twitter')
      if (linkedin)  next.add('linkedin')
      if (threads)   next.add('threads')
      if (youtube)   next.add('youtube')
      return next
    })
  }, [website, instagram, twitter, linkedin, threads, youtube])

  function toggle(key: Platform) {
    setActive(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        setters[key]('')
      } else {
        next.add(key)
      }
      return next
    })
  }

  const activePlatforms = PLATFORMS.filter(p => active.has(p.key))

  return (
    <div>
      <label className="text-sm font-semibold text-[#2D3436] dark:text-gray-100 block mb-2">
        Your Links{' '}
        <span className="font-normal text-gray-400 dark:text-gray-500">
          (optional — shown on your published story)
        </span>
      </label>

      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
        Tap the platforms you want to share — a field will appear for each one.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {PLATFORMS.map(({ key, label, Icon }) => {
          const isActive = active.has(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#5A7A8C] border-[#5A7A8C] text-white shadow-sm'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-[#4A5568] dark:text-gray-400 hover:border-[#5A7A8C] hover:text-[#5A7A8C] dark:hover:text-[#5A7A8C]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {label}
            </button>
          )
        })}
      </div>

      {activePlatforms.length > 0 && (
        <div className="space-y-2">
          {activePlatforms.map(({ key, Icon, type, prefix, placeholder }) => (
            <div
              key={key}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-[#5A7A8C]/30 focus-within:border-[#5A7A8C] transition"
            >
              <Icon className="w-4 h-4 text-[#5A7A8C] flex-shrink-0" />
              {prefix && (
                <span className="text-sm text-gray-400 dark:text-gray-500 select-none">{prefix}</span>
              )}
              <input
                type={type}
                value={values[key]}
                onChange={(e) => {
                  const val = e.target.value
                  setters[key](
                    key === 'instagram' || key === 'twitter' || key === 'threads'
                      ? val.replace(/^@/, '')
                      : val
                  )
                }}
                placeholder={placeholder}
                className="flex-1 text-sm text-[#2D3436] dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
