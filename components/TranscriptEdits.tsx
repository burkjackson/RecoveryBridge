'use client'

import { useState } from 'react'

export interface TranscriptMessageEdit {
  previous_content: string
  edited_at: string
}

/**
 * Admin transcript only: shows that a message was edited and, on tap, every
 * earlier version (migration 062, message_edits). A moderator deciding a
 * report needs what was actually said, not just the final text.
 */
export default function TranscriptEdits({ edits }: { edits?: TranscriptMessageEdit[] }) {
  const [open, setOpen] = useState(false)
  if (!edits || edits.length === 0) return null

  const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="mt-1 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-amber-300 hover:text-amber-200 underline underline-offset-2"
        aria-expanded={open}
      >
        Edited {edits.length === 1 ? 'once' : `${edits.length} times`} · {open ? 'hide' : 'show'} earlier version{edits.length === 1 ? '' : 's'}
      </button>
      {open && (
        <ol className="mt-1 space-y-1 border-l-2 border-amber-500/50 pl-2">
          {edits.map((e, i) => (
            <li key={`${e.edited_at}-${i}`} className="text-gray-300">
              <span className="text-gray-400">Before {time(e.edited_at)}:</span>{' '}
              <span className="whitespace-pre-wrap break-words">{e.previous_content}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
