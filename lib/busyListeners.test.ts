import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getBusyListenerIds } from './busyListeners'

function fake(result: { data: unknown; error: unknown }) {
  return { rpc: vi.fn(async () => result) } as unknown as SupabaseClient
}

describe('getBusyListenerIds', () => {
  it('returns the ids the RPC reports', async () => {
    const ids = await getBusyListenerIds(fake({ data: ['l1', 'l2'], error: null }))
    expect([...ids]).toEqual(['l1', 'l2'])
  })

  it('fails open with an empty set when the RPC errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const ids = await getBusyListenerIds(fake({ data: null, error: { message: 'boom' } }))
    expect(ids.size).toBe(0)
  })
})
