import React from 'react'

const URL_PATTERN = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi

// Splits text on URLs and renders the URLs as clickable links, preserving
// everything else as plain text. Safe against XSS since we never use
// dangerouslySetInnerHTML — React escapes all text nodes.
export function linkifyText(text: string, linkClassName = 'underline hover:opacity-80'): React.ReactNode[] {
  const parts = text.split(URL_PATTERN)

  return parts.map((part, i) => {
    if (!part) return null
    if (URL_PATTERN.test(part)) {
      // Reset lastIndex since URL_PATTERN has the global flag and .test() mutates it
      URL_PATTERN.lastIndex = 0
      const href = part.startsWith('www.') ? `https://${part}` : part
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    URL_PATTERN.lastIndex = 0
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}
