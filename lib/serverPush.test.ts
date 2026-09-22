import { describe, it, expect, vi } from 'vitest'

vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}))

import { isSubscriptionGone } from './serverPush'

describe('isSubscriptionGone', () => {
  it.each([404, 410])('treats %i as a dead subscription', (statusCode) => {
    expect(isSubscriptionGone({ statusCode })).toBe(true)
  })

  it.each([400, 403, 413, 429, 500, 503])('keeps the subscription on %i', (statusCode) => {
    expect(isSubscriptionGone({ statusCode })).toBe(false)
  })

  it('keeps the subscription on a network error with no status', () => {
    expect(isSubscriptionGone(new Error('ETIMEDOUT'))).toBe(false)
    expect(isSubscriptionGone(undefined)).toBe(false)
  })
})
