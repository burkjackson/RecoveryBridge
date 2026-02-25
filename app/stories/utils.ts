// Shared utilities for the Stories feature

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateShort(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Returns estimated reading time in minutes.
 * Uses word_count from DB if available, otherwise counts words from raw content.
 */
export function readingTime(wordCount: number | null, content?: string): number {
  const words = wordCount ?? (content ? content.trim().split(/\s+/).filter(Boolean).length : 0)
  return Math.max(1, Math.ceil(words / 200))
}

/**
 * Counts words in a markdown string (raw, before HTML conversion).
 */
export function countWords(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length
}
