import { TIME } from './constants'
import type { ChatMessage } from './types/database'

function byCreatedAt(a: ChatMessage, b: ChatMessage) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

/**
 * Merges fetched or realtime rows into the chat's message list.
 *
 * - A new id is appended and the list re-sorted by created_at.
 * - A known id picks up an edit only when the incoming copy's edited_at is
 *   newer than what's shown. edited_at only ever moves forward (migration
 *   062), so a poll that started before an edit landed can't roll the text
 *   back to the old version.
 * - A known id picks up read_at if it didn't have one yet. read_at is never
 *   cleared once set.
 *
 * Returns the SAME array reference when nothing changed, so quiet polls
 * don't re-render the chat or restart effects keyed on the list.
 */
export function mergeMessageLists(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const indexById = new Map(current.map((m, i) => [m.id, i]))
  let updated: ChatMessage[] | null = null
  const fresh: ChatMessage[] = []

  for (const m of incoming) {
    const i = indexById.get(m.id)
    if (i === undefined) {
      if (!fresh.some((f) => f.id === m.id)) fresh.push(m)
      continue
    }
    const shown = (updated ?? current)[i]
    const isNewerEdit =
      !!m.edited_at &&
      (!shown.edited_at || new Date(m.edited_at).getTime() > new Date(shown.edited_at).getTime())
    const gainsReadAt = !shown.read_at && !!m.read_at
    if (!isNewerEdit && !gainsReadAt) continue

    updated ??= [...current]
    updated[i] = {
      ...shown,
      ...(isNewerEdit ? { content: m.content, edited_at: m.edited_at } : {}),
      ...(gainsReadAt ? { read_at: m.read_at } : {}),
    }
  }

  const base = updated ?? current
  if (fresh.length === 0) return base
  return [...base, ...fresh].sort(byCreatedAt)
}

/**
 * Whether the UI should offer to edit this message. Mirrors the database's
 * rules (migration 062) so the button doesn't appear where the save would
 * fail — but the database is the real gate, and a save can still be
 * refused (say, the device clock is off).
 */
export function canEditMessage(
  message: Pick<ChatMessage, 'sender_id' | 'created_at'>,
  userId: string | null,
  sessionActive: boolean,
  now: number = Date.now()
): boolean {
  if (!userId || !sessionActive || message.sender_id !== userId) return false
  const age = now - new Date(message.created_at).getTime()
  return age < TIME.MESSAGE_EDIT_WINDOW_MS
}
