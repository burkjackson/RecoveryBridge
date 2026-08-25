'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from '@/components/Modal'
import { Body14, Body16, Body18 } from '@/components/ui/Typography'
import { NOTIFICATION_KIND_INFO } from '@/lib/constants'

/**
 * Admin switches for what the platform is allowed to send.
 *
 * Distinct from the per-person preferences on /profile: those are a
 * recipient's consent, these are our decision about whether a kind of message
 * goes out at all. Both have to say yes.
 *
 * The three automatic kinds ship off. Turning one on is a deliberate act, and
 * turning it back off cancels whatever it already queued.
 */

interface KindSetting {
  kind: string
  enabled: boolean
  updated_at: string | null
}

interface Props {
  adminFetch: (body: object) => Promise<{
    settings?: KindSetting[]
    pending?: Record<string, number>
    cancelled?: number
    [key: string]: unknown
  }>
  onError: (message: string) => void
  /** Reports the current switch state up, so the composer can reflect it. */
  onSettingsChange?: (settings: Record<string, boolean>) => void
}

export default function NotificationControls({ adminFetch, onError, onSettingsChange }: Props) {
  const [settings, setSettings] = useState<Record<string, boolean>>({})
  const [pending, setPending] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [confirmOff, setConfirmOff] = useState<{ kind: string; label: string; queued: number } | null>(null)

  // adminFetch is rebuilt on every render of the admin page, so it can't be an
  // effect dependency without looping.
  const adminFetchRef = useRef(adminFetch)
  adminFetchRef.current = adminFetch
  const onSettingsChangeRef = useRef(onSettingsChange)
  onSettingsChangeRef.current = onSettingsChange

  const load = useCallback(async () => {
    try {
      const result = await adminFetchRef.current({ action: 'notification_settings' })
      const map: Record<string, boolean> = {}
      for (const row of result.settings ?? []) map[row.kind] = row.enabled
      setSettings(map)
      setPending(result.pending ?? {})
      onSettingsChangeRef.current?.(map)
    } catch {
      onError('Could not load notification settings.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onError is rebuilt every render of the admin page; including it would reload in a loop
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function apply(kind: string, enabled: boolean) {
    setSaving(kind)
    // Optimistic: the switch has already moved under the user's finger.
    setSettings((prev) => ({ ...prev, [kind]: enabled }))
    try {
      await adminFetchRef.current({ action: 'set_notification_kind', kind, enabled })
      await load()
    } catch (error) {
      setSettings((prev) => ({ ...prev, [kind]: !enabled }))
      onError(error instanceof Error ? error.message : 'Could not change that setting.')
    } finally {
      setSaving(null)
      setConfirmOff(null)
    }
  }

  function request(kind: string, label: string, enabled: boolean) {
    const queued = pending[kind] ?? 0
    // Only worth a confirm when switching off would actually throw something
    // away. Turning one on, or off with an empty queue, is undoable.
    if (!enabled && queued > 0) {
      setConfirmOff({ kind, label, queued })
      return
    }
    apply(kind, enabled)
  }

  const automatic = NOTIFICATION_KIND_INFO.filter((k) => k.automatic)
  const anyAutomaticOn = automatic.some((k) => settings[k.key])

  return (
    <div className="mb-8">
      <Body18>What RecoveryBridge is allowed to send</Body18>
      <Body16 className="text-sm text-rb-gray dark:text-gray-300 mt-1 mb-4">
        A message only goes out if it&rsquo;s switched on here <em>and</em> the recipient hasn&rsquo;t
        opted out on their own profile. Notifications about someone needing support are separate
        and are never affected by these.
      </Body16>

      {loading ? (
        <Body16 className="text-rb-gray dark:text-gray-300">Loading…</Body16>
      ) : (
        <>
          {!anyAutomaticOn && (
            <div className="rounded-lg bg-rb-blue-light dark:bg-gray-700 border border-rb-blue/20 dark:border-gray-600 p-3 mb-4">
              <Body14 className="text-rb-dark dark:text-gray-100">
                Nothing automatic is on. Right now the only push anyone gets is a support request,
                a chat message, or an announcement you send yourself.
              </Body14>
            </div>
          )}

          <ul className="space-y-3">
            {NOTIFICATION_KIND_INFO.map((info) => {
              const enabled = settings[info.key] ?? false
              const queued = pending[info.key] ?? 0
              return (
                <li
                  key={info.key}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`kind-${info.key}`}
                      checked={enabled}
                      disabled={saving === info.key}
                      onChange={(e) => request(info.key, info.label, e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-gray-300 dark:border-gray-600 accent-rb-blue disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={`kind-${info.key}`}
                        className="flex flex-wrap items-center gap-2 font-medium text-rb-dark dark:text-gray-100 cursor-pointer"
                      >
                        {info.label}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            info.automatic
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {info.automatic ? 'Automatic' : 'You send it'}
                        </span>
                      </label>
                      <Body14 className="text-rb-gray dark:text-gray-300 mt-0.5">
                        {info.description}
                      </Body14>
                      {queued > 0 && (
                        <Body14 className="text-rb-gray dark:text-gray-400 mt-1">
                          {queued} waiting to be delivered.
                        </Body14>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <Modal
        isOpen={confirmOff !== null}
        onClose={() => setConfirmOff(null)}
        title="Turn this off?"
        type="confirm"
        confirmText="Turn it off"
        confirmStyle="danger"
        onConfirm={() => confirmOff && apply(confirmOff.kind, false)}
      >
        <p>
          <strong>{confirmOff?.label}</strong> has <strong>{confirmOff?.queued}</strong>{' '}
          notification{confirmOff?.queued === 1 ? '' : 's'} waiting to go out.
        </p>
        <p className="mt-2 text-sm text-rb-gray dark:text-gray-300">
          Switching it off cancels {confirmOff?.queued === 1 ? 'it' : 'them'} — they won&rsquo;t be
          delivered later if you switch it back on. Anything already sent has landed.
        </p>
      </Modal>
    </div>
  )
}
