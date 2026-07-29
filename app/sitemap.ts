import { MetadataRoute } from 'next'

const BASE = 'https://recoverybridge.app'

// Stable per-page "last modified" dates. Deliberately NOT `new Date()` — that
// stamped every URL with the build date on every deploy, which trains search
// engines to distrust the signal ("everything changed today, again"). Bump a
// page's date here when its content actually changes.
//
// Note: /stories is intentionally absent — it 301-redirects to the Ghost blog
// (see next.config redirects), and the blog serves its own sitemap. Listing a
// redirecting URL here is a weak signal.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      lastModified: '2026-07-28',
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE}/support/talk-to-someone-in-recovery`,
      lastModified: '2026-07-29',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE}/safety`,
      lastModified: '2026-07-01',
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE}/donate`,
      lastModified: '2026-07-01',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE}/contact`,
      lastModified: '2026-07-01',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE}/terms`,
      lastModified: '2026-06-01',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: '2026-06-01',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
