import { describe, it, expect } from 'vitest'
import { safeRedirectPath } from './safeRedirect'

describe('safeRedirectPath', () => {
  it('allows a plain in-app path', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard')
  })

  it('allows an in-app path with a query string', () => {
    expect(safeRedirectPath('/connect?seekerId=x')).toBe('/connect?seekerId=x')
  })

  it('rejects a protocol-relative URL', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/dashboard')
  })

  it('rejects a backslash-prefixed path some browsers normalize to protocol-relative', () => {
    expect(safeRedirectPath('/\\evil.com')).toBe('/dashboard')
  })

  it('rejects an absolute URL', () => {
    expect(safeRedirectPath('https://evil.com')).toBe('/dashboard')
  })

  it('rejects a scheme with no leading slash at all', () => {
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/dashboard')
  })

  it('falls back for an empty string', () => {
    expect(safeRedirectPath('')).toBe('/dashboard')
  })

  it('falls back for null and undefined', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard')
    expect(safeRedirectPath(undefined)).toBe('/dashboard')
  })

  it('honors a custom fallback', () => {
    expect(safeRedirectPath('https://evil.com', '/login')).toBe('/login')
    expect(safeRedirectPath(null, '/login')).toBe('/login')
  })
})
