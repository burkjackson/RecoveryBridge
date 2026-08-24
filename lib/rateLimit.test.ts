import { describe, it, expect, vi, afterEach } from 'vitest'
import { isRateLimited } from './rateLimit'

afterEach(() => {
  vi.useRealTimers()
})

describe('isRateLimited', () => {
  it('allows up to the limit, then blocks', () => {
    expect(isRateLimited('t-basic', 'user-1', 3, 60_000)).toBe(false)
    expect(isRateLimited('t-basic', 'user-1', 3, 60_000)).toBe(false)
    expect(isRateLimited('t-basic', 'user-1', 3, 60_000)).toBe(false)
    expect(isRateLimited('t-basic', 'user-1', 3, 60_000)).toBe(true)
  })

  it('counts each key separately', () => {
    isRateLimited('t-keys', 'a', 1, 60_000)
    expect(isRateLimited('t-keys', 'a', 1, 60_000)).toBe(true)
    expect(isRateLimited('t-keys', 'b', 1, 60_000)).toBe(false)
  })

  it('counts each bucket separately, so routes do not interfere', () => {
    isRateLimited('t-bucket-one', 'shared', 1, 60_000)
    expect(isRateLimited('t-bucket-one', 'shared', 1, 60_000)).toBe(true)
    expect(isRateLimited('t-bucket-two', 'shared', 1, 60_000)).toBe(false)
  })

  it('lets the caller through again once the window has passed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    expect(isRateLimited('t-window', 'user-1', 1, 60_000)).toBe(false)
    expect(isRateLimited('t-window', 'user-1', 1, 60_000)).toBe(true)

    vi.setSystemTime(new Date('2026-01-01T00:01:01Z'))
    expect(isRateLimited('t-window', 'user-1', 1, 60_000)).toBe(false)
  })

  it('does not extend the block while the caller keeps retrying', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    isRateLimited('t-retry', 'user-1', 1, 60_000)
    // Hammering during the window must not push the expiry out
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'))
    expect(isRateLimited('t-retry', 'user-1', 1, 60_000)).toBe(true)

    vi.setSystemTime(new Date('2026-01-01T00:01:01Z'))
    expect(isRateLimited('t-retry', 'user-1', 1, 60_000)).toBe(false)
  })
})
