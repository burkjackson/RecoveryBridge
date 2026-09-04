import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * A minimal hand-built stand-in for a Supabase client, shared by the API
 * route tests under app/api/. The routes tested against this each call
 * createClient() fresh per request and touch several tables per request
 * with a different query shape each time — a single generic chain object
 * (fine for a one-table helper like lib/directConnect.test.ts's fake) isn't
 * enough here, so this dispatches by table name instead: each test
 * configures what `.from('sessions')`, `.from('profiles')`, etc. should
 * resolve to, and every chained method (.select/.eq/.neq/.in/.or/.order/...)
 * is accepted and just keeps the chain going regardless of order or count.
 *
 * The chain resolves no matter where `await` lands on it — after a single
 * `.select()`, after `.eq().single()`, after `.eq().maybeSingle()`, whatever
 * the route happens to call — because every chain object is itself
 * thenable: `await` on any point in the chain triggers the same resolved
 * result for that table.
 *
 * This is intentionally coarse: it can't tell two different `.eq()` calls
 * against the same table apart within one query. Where a route queries the
 * same table twice in one request expecting different results each time
 * (e.g. notifications/send selects `profiles` once for the seeker and
 * separately for a target listener), pass an array for that table's entry —
 * each new `.from(table)` call consumes the next array item in order,
 * repeating the last one once exhausted (same "consumed in call order"
 * idiom lib/directConnect.test.ts already uses for its own fake).
 *
 * `calls` records every method invoked per table with its arguments, so a
 * test can assert not just the response but what was actually asked for —
 * e.g. that only the seeker's id, not the listener's, appeared in a
 * `profiles` update.
 */

export interface FakeTableResult {
  data?: unknown
  error?: unknown
}

export interface FakeSupabaseCall {
  table: string
  method: string
  args: unknown[]
}

export type FakeTableEntry =
  | FakeTableResult
  | FakeTableResult[]
  | (() => FakeTableResult)

export interface FakeSupabaseOptions {
  tables?: Record<string, FakeTableEntry>
  authUser?: Record<string, unknown> | null
  authError?: unknown
}

export function fakeSupabase(opts: FakeSupabaseOptions = {}): {
  client: SupabaseClient
  calls: FakeSupabaseCall[]
} {
  const tables = opts.tables ?? {}
  const calls: FakeSupabaseCall[] = []
  const nextIndex: Record<string, number> = {}

  function resolveTable(name: string): FakeTableResult {
    const entry = tables[name]
    if (entry === undefined) return { data: null, error: null }
    if (typeof entry === 'function') return entry()
    if (Array.isArray(entry)) {
      const i = nextIndex[name] ?? 0
      nextIndex[name] = i + 1
      return entry[Math.min(i, entry.length - 1)] ?? { data: null, error: null }
    }
    return entry
  }

  function chainFor(table: string) {
    // Resolved once per `.from(table)` call and cached, so however many
    // times something on this one chain gets awaited, an array-backed
    // table entry only advances its index once.
    let cached: FakeTableResult | undefined
    const resolve = () => {
      if (cached === undefined) cached = resolveTable(table)
      return cached
    }

    const chain: unknown = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'then') {
            return (
              onFulfilled: (value: FakeTableResult) => void,
              onRejected?: (reason: unknown) => void
            ) => {
              try {
                onFulfilled(resolve())
              } catch (err) {
                onRejected?.(err)
              }
            }
          }
          return (...args: unknown[]) => {
            calls.push({ table, method: String(prop), args })
            return chain
          }
        },
      }
    )

    return chain
  }

  const client = {
    from: (table: string) => chainFor(table),
    auth: {
      getUser: async () => ({
        data: { user: opts.authUser ?? null },
        error: opts.authError ?? null,
      }),
    },
  } as unknown as SupabaseClient

  return { client, calls }
}
