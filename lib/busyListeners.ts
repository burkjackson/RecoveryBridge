import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Always-available listeners who are in a chat right now (migration 069).
 * They keep role_state while chatting, so without this they stay on every
 * list and a Connect tap fails on the one-active-session-per-listener index.
 *
 * Fails open: an empty set just means the list shows them, and the connect
 * path still explains it (see isListenerBusyError()).
 */
export async function getBusyListenerIds(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('get_busy_listener_ids')
  if (error) {
    console.error('[busyListeners] get_busy_listener_ids failed', error)
    return new Set()
  }
  return new Set(((data ?? []) as string[]).filter(Boolean))
}
