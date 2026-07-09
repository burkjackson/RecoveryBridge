import type { FavoriteWithProfile } from '@/lib/types/database'

/**
 * Normalize the rows returned by the dashboard favorites query into
 * FavoriteWithProfile[].
 *
 * Two things this guards against:
 *  1. Supabase embeds a to-one relation as either an object or a 1-element
 *     array depending on how the relationship is inferred — flatten it.
 *  2. The favorites query embeds the target profile WITHOUT an inner join, so
 *     under row-level security the embed comes back `null` whenever the viewer
 *     can't read that profile (e.g. the favorited listener is currently
 *     offline). A null favorite_profile would crash the dashboard render, so we
 *     drop those rows here — the source of the "Dashboard couldn't load" bug.
 */
export function normalizeFavorites(rows: unknown): FavoriteWithProfile[] {
  if (!Array.isArray(rows)) return []

  return rows
    .map((row: any) => ({
      ...row,
      favorite_profile: Array.isArray(row?.favorite_profile)
        ? row.favorite_profile[0]
        : row?.favorite_profile,
    }))
    .filter((row: any) => row.favorite_profile != null) as FavoriteWithProfile[]
}
