'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Notice {
  id: string
  title: string
  body: string
  created_at: string
}

/**
 * Surfaces unread in-app notices for the current user — the platform reaching
 * back out (an auto "we couldn't connect you" follow-up, or a personal note
 * from an admin). This is the fallback path for anyone who doesn't have push
 * enabled, so a message still lands the next time they open the app. Dismissing
 * marks the notice read.
 */
export default function NoticeBanner() {
  const supabase = createClient()
  const [notices, setNotices] = useState<Notice[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const loadNotices = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('user_notices')
      .select('id, title, body, created_at')
      .eq('user_id', uid)
      .is('read_at', null)
      .order('created_at', { ascending: false })
    setNotices(data || [])
  }, [supabase])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await loadNotices(user.id)

      // Live delivery: a notice created while the app is open appears at once.
      channel = supabase
        .channel(`notices-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'user_notices', filter: `user_id=eq.${user.id}` },
          () => loadNotices(user.id)
        )
        .subscribe()
    })()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, loadNotices])

  async function dismiss(id: string) {
    // Optimistic: hide immediately, then persist the read receipt.
    setNotices((prev) => prev.filter((n) => n.id !== id))
    if (!userId) return
    await supabase
      .from('user_notices')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
  }

  if (notices.length === 0) return null

  return (
    <div className="space-y-3 mb-4" aria-live="polite">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className="relative rounded-xl border border-rb-blue/30 bg-rb-blue-light dark:bg-gray-800 dark:border-gray-700 p-4 pr-10 shadow-sm"
          role="status"
        >
          <button
            onClick={() => dismiss(notice.id)}
            aria-label="Dismiss message"
            className="absolute right-2 top-2 min-h-[36px] min-w-[36px] text-rb-gray dark:text-gray-300 hover:text-rb-dark dark:hover:text-gray-100 text-xl leading-none rounded-full focus:outline-none focus:ring-2 focus:ring-rb-blue"
          >
            ×
          </button>
          <p className="font-semibold text-rb-dark dark:text-gray-100">{notice.title}</p>
          <p className="text-sm text-rb-gray dark:text-gray-200 mt-1 whitespace-pre-line">{notice.body}</p>
        </div>
      ))}
    </div>
  )
}
