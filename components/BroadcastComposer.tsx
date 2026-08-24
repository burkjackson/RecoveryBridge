'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/Modal'
import { Body14, Body16, Body18 } from '@/components/ui/Typography'
import { BROADCAST_AUDIENCES, BROADCAST_LIMITS, type BroadcastAudience } from '@/lib/constants'

/**
 * Admin composer for a platform announcement — one message to a named
 * audience, delivered as a push to anyone with announcements enabled and as an
 * in-app notice to everyone in the audience.
 *
 * Lives in its own component rather than inside app/admin/page.tsx, which is
 * already ~1,900 lines (CLAUDE.md known issue #7).
 */

interface BroadcastRow {
  id: string
  title: string
  body: string
  audience: string
  recipient_count: number
  created_at: string
}

interface DeliveryCounts {
  sent: number
  pending: number
  skipped: number
  failed: number
}

interface Props {
  /** The admin page's authenticated POST to /api/admin/actions. */
  adminFetch: (body: object) => Promise<{
    recipientCount?: number
    optedInCount?: number
    queued?: number
    [key: string]: unknown
  }>
  onError: (message: string) => void
  onSuccess: (message: string) => void
}

const RECENT_LIMIT = 10

export default function BroadcastComposer({ adminFetch, onError, onSuccess }: Props) {
  const supabase = createClient()

  const [audience, setAudience] = useState<BroadcastAudience>('all')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [linkPath, setLinkPath] = useState('/dashboard')
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [preview, setPreview] = useState<{ recipients: number; optedIn: number } | null>(null)
  const [previewing, setPreviewing] = useState(false)

  const [recent, setRecent] = useState<BroadcastRow[]>([])
  const [delivery, setDelivery] = useState<Record<string, DeliveryCounts>>({})

  const trimmedTitle = title.trim()
  const trimmedMessage = message.trim()
  const canSend =
    trimmedTitle.length > 0 &&
    trimmedMessage.length > 0 &&
    trimmedTitle.length <= BROADCAST_LIMITS.TITLE_MAX_LENGTH &&
    trimmedMessage.length <= BROADCAST_LIMITS.BODY_MAX_LENGTH &&
    linkPath.startsWith('/') &&
    !linkPath.startsWith('//') &&
    !sending

  const loadRecent = useCallback(async () => {
    const { data } = await supabase
      .from('broadcasts')
      .select('id, title, body, audience, recipient_count, created_at')
      .order('created_at', { ascending: false })
      .limit(RECENT_LIMIT)

    const rows = (data ?? []) as BroadcastRow[]
    setRecent(rows)
    if (rows.length === 0) return

    // One query for every listed broadcast, aggregated here — PostgREST has no
    // GROUP BY, and a count query per broadcast per status would be 30+ round
    // trips. Queue rows are pruned after 30 days, so this stays small.
    const { data: queueRows } = await supabase
      .from('notification_queue')
      .select('broadcast_id, status')
      .in('broadcast_id', rows.map((r) => r.id))

    const counts: Record<string, DeliveryCounts> = {}
    for (const row of (queueRows ?? []) as { broadcast_id: string; status: string }[]) {
      const entry = counts[row.broadcast_id] ?? { sent: 0, pending: 0, skipped: 0, failed: 0 }
      // 'sending' is a transient claim inside one drain run; count it as pending.
      const key = row.status === 'sending' ? 'pending' : (row.status as keyof DeliveryCounts)
      if (key in entry) entry[key] += 1
      counts[row.broadcast_id] = entry
    }
    setDelivery(counts)
  }, [supabase])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  // adminFetch is redefined on every render of the admin page, so it can't be
  // an effect dependency — the preview below would refetch in a loop. Hold the
  // latest one in a ref and key the effect on the audience alone.
  const adminFetchRef = useRef(adminFetch)
  adminFetchRef.current = adminFetch

  // Refresh the audience estimate whenever the selection changes, so the
  // confirm step can say who this actually reaches.
  useEffect(() => {
    let cancelled = false
    setPreviewing(true)
    setPreview(null)
    adminFetchRef.current({ action: 'preview_broadcast', audience })
      .then((result) => {
        if (cancelled) return
        setPreview({
          recipients: result.recipientCount ?? 0,
          optedIn: result.optedInCount ?? 0,
        })
      })
      .catch(() => {
        if (!cancelled) setPreview(null)
      })
      .finally(() => {
        if (!cancelled) setPreviewing(false)
      })
    return () => {
      cancelled = true
    }
  }, [audience])

  async function send() {
    if (!canSend) return
    setSending(true)
    try {
      const result = await adminFetch({
        action: 'send_broadcast',
        audience,
        title: trimmedTitle,
        body: trimmedMessage,
        url: linkPath.trim(),
      })
      setConfirmOpen(false)
      setTitle('')
      setMessage('')
      setLinkPath('/dashboard')
      await loadRecent()
      onSuccess(
        `Queued for ${result.recipientCount ?? 0} ${
          (result.recipientCount ?? 0) === 1 ? 'person' : 'people'
        }. Pushes go out on the next cron run (within about 15–35 minutes), and everyone sees it in-app on their next visit.`
      )
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not send the broadcast.')
    } finally {
      setSending(false)
    }
  }

  const audienceLabel = (key: string) =>
    BROADCAST_AUDIENCES.find((a) => a.key === key)?.label ?? key

  return (
    <div>
      <div className="mb-4">
        <Body18>Broadcast</Body18>
        <Body16 className="text-sm text-rb-gray dark:text-gray-300 mt-1">
          Send one message to a group. Everyone in the audience gets an in-app notice; those with
          announcement notifications on also get a push. Support-request notifications are a
          separate setting and are never affected by this.
        </Body16>
      </div>

      {/* Audience */}
      <fieldset className="mb-4">
        <legend className="text-sm font-semibold text-rb-dark dark:text-gray-100 mb-2">
          Audience
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {BROADCAST_AUDIENCES.map((option) => (
            <label
              key={option.key}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                audience === option.key
                  ? 'border-rb-blue bg-rb-blue-light dark:bg-gray-700'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <input
                type="radio"
                name="broadcast-audience"
                className="mt-1 w-4 h-4 accent-rb-blue"
                checked={audience === option.key}
                onChange={() => setAudience(option.key)}
              />
              <span>
                <span className="block text-sm font-medium text-rb-dark dark:text-gray-100">
                  {option.label}
                </span>
                <span className="block text-xs text-rb-gray dark:text-gray-300">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
        <Body14 className="text-rb-gray dark:text-gray-300 mt-2">
          {previewing
            ? 'Counting…'
            : preview
              ? `${preview.recipients} ${preview.recipients === 1 ? 'person' : 'people'} — ${preview.optedIn} can receive a push, the rest see it in-app.`
              : 'Could not estimate this audience.'}
        </Body14>
      </fieldset>

      {/* Title */}
      <label className="block mb-4">
        <span className="block text-sm font-semibold text-rb-dark dark:text-gray-100 mb-1">
          Title
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={BROADCAST_LIMITS.TITLE_MAX_LENGTH}
          placeholder="A short headline"
          className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-rb-dark dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rb-blue"
        />
        <span className="block text-xs text-rb-gray dark:text-gray-400 mt-1">
          {trimmedTitle.length}/{BROADCAST_LIMITS.TITLE_MAX_LENGTH}
        </span>
      </label>

      {/* Body */}
      <label className="block mb-4">
        <span className="block text-sm font-semibold text-rb-dark dark:text-gray-100 mb-1">
          Message
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={BROADCAST_LIMITS.BODY_MAX_LENGTH}
          rows={4}
          placeholder="What do you want people to know?"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-rb-dark dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rb-blue"
        />
        <span className="block text-xs text-rb-gray dark:text-gray-400 mt-1">
          {trimmedMessage.length}/{BROADCAST_LIMITS.BODY_MAX_LENGTH}
        </span>
      </label>

      {/* Link */}
      <label className="block mb-4">
        <span className="block text-sm font-semibold text-rb-dark dark:text-gray-100 mb-1">
          Opens when tapped
        </span>
        <input
          type="text"
          value={linkPath}
          onChange={(e) => setLinkPath(e.target.value)}
          placeholder="/dashboard"
          className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-rb-dark dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rb-blue"
        />
        <span className="block text-xs text-rb-gray dark:text-gray-400 mt-1">
          An in-app path only, e.g. /dashboard or /training.
        </span>
      </label>

      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 mb-4">
        <Body14 className="text-amber-900 dark:text-amber-200">
          Push text shows on a locked phone that other people can see. Keep it general — nothing
          that implies why someone uses RecoveryBridge.
        </Body14>
      </div>

      <button
        onClick={() => setConfirmOpen(true)}
        disabled={!canSend}
        className="min-h-[44px] px-5 py-2 bg-rb-blue text-white rounded-lg hover:bg-rb-blue-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Review &amp; send
      </button>

      {/* Recent broadcasts */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Body18>Recent broadcasts</Body18>
        {recent.length === 0 ? (
          <Body16 className="text-rb-gray dark:text-gray-300 mt-2">Nothing sent yet.</Body16>
        ) : (
          <ul className="mt-3 space-y-3">
            {recent.map((row) => {
              const counts = delivery[row.id]
              return (
                <li
                  key={row.id}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <p className="font-semibold text-rb-dark dark:text-gray-100">{row.title}</p>
                  <p className="text-sm text-rb-gray dark:text-gray-300 mt-0.5 whitespace-pre-line">
                    {row.body}
                  </p>
                  <p className="text-xs text-rb-gray dark:text-gray-400 mt-2">
                    {audienceLabel(row.audience)} · {row.recipient_count}{' '}
                    {row.recipient_count === 1 ? 'recipient' : 'recipients'} ·{' '}
                    {new Date(row.created_at).toLocaleString()}
                  </p>
                  {counts && (
                    <p className="text-xs text-rb-gray dark:text-gray-400 mt-1">
                      Push: {counts.sent} sent
                      {counts.pending > 0 && `, ${counts.pending} waiting`}
                      {counts.skipped > 0 && `, ${counts.skipped} no push`}
                      {counts.failed > 0 && `, ${counts.failed} failed`}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Send this broadcast?"
        type="confirm"
        confirmText={sending ? 'Sending…' : 'Send it'}
        onConfirm={send}
      >
        <div className="space-y-3">
          <p className="text-rb-gray dark:text-gray-300">
            Going to <strong>{audienceLabel(audience)}</strong>
            {preview ? ` — ${preview.recipients} ${preview.recipients === 1 ? 'person' : 'people'}, ${preview.optedIn} by push` : ''}.
          </p>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <p className="font-semibold text-rb-dark dark:text-gray-100">{trimmedTitle}</p>
            <p className="text-sm text-rb-gray dark:text-gray-300 mt-1 whitespace-pre-line">
              {trimmedMessage}
            </p>
          </div>
          <p className="text-sm text-rb-gray dark:text-gray-400">
            This can&apos;t be unsent.
          </p>
        </div>
      </Modal>
    </div>
  )
}
