/** @type {import('next').NextConfig} */

// Stories now live on the Ghost blog at blog.recoverybridge.app.
// Redirect the old in-app /stories URLs so existing links + SEO transfer.
const BLOG_URL = 'https://blog.recoverybridge.app'
const MIGRATED_STORY_SLUGS = [
  'how-it-all-began',
  'what-happens-between-the-meetings',
  'you-dont-have-to-do-this-alone-why-connection-matters-in-recovery',
  '10-reasons-your-recovery-plan-isnt-working-and-how-private-11-connection-can-hel',
  'recovery-chat-rooms-matter-why-human-connection-beats-ai-in-early-sobriety',
]

const nextConfig = {
  async redirects() {
    return [
      // Migrated stories -> their exact blog posts (preserves SEO link equity)
      ...MIGRATED_STORY_SLUGS.map((slug) => ({
        source: `/stories/${slug}`,
        destination: `${BLOG_URL}/${slug}/`,
        permanent: true,
      })),
      // Stories index -> blog home
      { source: '/stories', destination: `${BLOG_URL}/`, permanent: true },
      // Any other /stories/* (unknown slugs, retired write/edit pages) -> blog home
      { source: '/stories/:path*', destination: `${BLOG_URL}/`, permanent: true },
    ]
  },
}

// Only wrap with Sentry when auth token is available (production/CI)
// This prevents the dev server from hanging when Sentry vars aren't set
if (process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
  const { withSentryConfig } = require("@sentry/nextjs");
  module.exports = withSentryConfig(
    nextConfig,
    {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    },
    {
      widenClientFileUpload: true,
      transpileClientSDK: true,
      tunnelRoute: "/monitoring",
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    }
  );
} else {
  module.exports = nextConfig;
}
