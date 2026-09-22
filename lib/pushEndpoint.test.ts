import { describe, it, expect } from 'vitest'
import { isAllowedPushEndpoint } from './pushEndpoint'

describe('isAllowedPushEndpoint', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc123',
    'https://web.push.apple.com/QGx5ZyW',
    'https://api.push.apple.com/3/device/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/gAAAA',
    'https://wns2-by3p.notify.windows.com/w/?token=abc',
  ])('accepts %s', (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(true)
  })

  it.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://evil.example/fcm.googleapis.com',
    'https://fcm.googleapis.com.evil.example/x',
    'https://notpush.apple.com.evil.example/x',
    'not a url',
    '',
    42,
    null,
  ])('rejects %j', (value) => {
    expect(isAllowedPushEndpoint(value)).toBe(false)
  })
})
