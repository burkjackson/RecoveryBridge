import { describe, it, expect } from 'vitest'
import { errorMessage } from './errors'

describe('errorMessage', () => {
  it('uses an Error message', () => {
    expect(errorMessage(new Error('Boom'))).toBe('Boom')
  })

  it('uses a thrown string', () => {
    expect(errorMessage('Plain failure')).toBe('Plain failure')
  })

  it('falls back for an Error with no message', () => {
    expect(errorMessage(new Error(''), 'Fallback')).toBe('Fallback')
  })

  it('falls back for values that carry no message', () => {
    expect(errorMessage(null, 'Fallback')).toBe('Fallback')
    expect(errorMessage(undefined, 'Fallback')).toBe('Fallback')
    expect(errorMessage({ code: 500 }, 'Fallback')).toBe('Fallback')
  })

  it('has a usable default fallback', () => {
    expect(errorMessage(null)).toMatch(/try again/i)
  })
})
