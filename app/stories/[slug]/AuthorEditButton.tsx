'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  authorId: string
  postId: string
}

export function AuthorEditButton({ authorId, postId }: Props) {
  const [isAuthor, setIsAuthor] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user.id === authorId) setIsAuthor(true)
    })
  }, [authorId])

  if (!isAuthor) return null

  return (
    <a
      href={`/edit/${postId}`}
      className="text-xs font-semibold text-white/60 hover:text-white transition border border-white/20 hover:border-white/50 px-3 py-1.5 rounded-full"
    >
      ✏️ Edit Story
    </a>
  )
}
