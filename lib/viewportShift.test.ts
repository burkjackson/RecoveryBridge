import { describe, expect, it } from 'vitest'
import { viewportShift } from './viewportShift'

describe('viewportShift', () => {
  it('is 0 when the visual and layout viewports line up', () => {
    expect(viewportShift({ offsetTop: 0, height: 800, scale: 1 }, 800)).toBe(0)
  })

  it('pushes fixed UI down when offsetTop is stuck after the keyboard closes', () => {
    expect(viewportShift({ offsetTop: 300, height: 800, scale: 1 }, 800)).toBe(300)
  })

  it('stays 0 while the keyboard is open', () => {
    expect(viewportShift({ offsetTop: 100, height: 450, scale: 1 }, 800)).toBe(0)
  })

  it('stays 0 when the user has pinch-zoomed', () => {
    expect(viewportShift({ offsetTop: 300, height: 400, scale: 2 }, 800)).toBe(0)
  })

  it('ignores sub-pixel noise and missing data', () => {
    expect(viewportShift({ offsetTop: 0.5, height: 800, scale: 1 }, 800)).toBe(0)
    expect(viewportShift(null, 800)).toBe(0)
    expect(viewportShift({ offsetTop: 0, height: 800, scale: 1 }, 0)).toBe(0)
  })
})
