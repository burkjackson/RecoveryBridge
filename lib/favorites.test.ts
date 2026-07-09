import { describe, it, expect } from 'vitest'
import { normalizeFavorites } from './favorites'

const profile = {
  display_name: 'Sam',
  bio: null,
  tagline: null,
  avatar_url: null,
  role_state: 'available' as const,
  always_available: false,
  last_heartbeat_at: null,
  tags: null,
  user_role: null,
}

describe('normalizeFavorites', () => {
  it('keeps favorites whose profile is present (object embed)', () => {
    const out = normalizeFavorites([
      { id: 'f1', user_id: 'u1', favorite_user_id: 'u2', created_at: 't', favorite_profile: profile },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].favorite_profile.display_name).toBe('Sam')
  })

  it('flattens a 1-element array embed into an object', () => {
    const out = normalizeFavorites([
      { id: 'f1', user_id: 'u1', favorite_user_id: 'u2', created_at: 't', favorite_profile: [profile] },
    ])
    expect(out[0].favorite_profile.display_name).toBe('Sam')
  })

  it('drops favorites whose profile is null (RLS-hidden / offline target)', () => {
    const out = normalizeFavorites([
      { id: 'f1', user_id: 'u1', favorite_user_id: 'u2', created_at: 't', favorite_profile: null },
    ])
    expect(out).toHaveLength(0)
  })

  it('drops null from an empty-array embed', () => {
    const out = normalizeFavorites([
      { id: 'f1', user_id: 'u1', favorite_user_id: 'u2', created_at: 't', favorite_profile: [] },
    ])
    expect(out).toHaveLength(0)
  })

  it('keeps only the resolvable rows in a mixed list', () => {
    const out = normalizeFavorites([
      { id: 'f1', user_id: 'u1', favorite_user_id: 'u2', created_at: 't', favorite_profile: profile },
      { id: 'f2', user_id: 'u1', favorite_user_id: 'u3', created_at: 't', favorite_profile: null },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('f1')
  })

  it('returns [] for non-array input', () => {
    expect(normalizeFavorites(null)).toEqual([])
    expect(normalizeFavorites(undefined)).toEqual([])
  })
})
