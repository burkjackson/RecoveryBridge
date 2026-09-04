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
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Load Sentry's server SDK and its OpenTelemetry/Prisma instrumentation at runtime
  // via Node require instead of bundling them with webpack. Bundling this tree makes
  // `next dev` route compilation extremely slow.
  serverExternalPackages: [
    '@sentry/nextjs',
    '@sentry/node',
    '@prisma/instrumentation',
    '@opentelemetry/instrumentation',
  ],
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
  async headers() {
    // Supabase's REST/Storage host and its realtime websocket live on the
    // project URL; Sentry's ingest host comes from the DSN. Both are read
    // from env so this works the same in every environment without hardcoding
    // a project ref. hostFrom() never throws — a missing or malformed value
    // (e.g. running without .env.local) just drops that source from the
    // policy instead of failing the build, same spirit as the Sentry-config
    // guard below it.
    const hostFrom = (url) => {
      try {
        return url ? new URL(url).host : ''
      } catch {
        return ''
      }
    }

    const supabaseHost = hostFrom(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const sentryHost = hostFrom(process.env.NEXT_PUBLIC_SENTRY_DSN)

    const connectSrc = [
      "'self'",
      supabaseHost && `https://${supabaseHost}`,
      supabaseHost && `wss://${supabaseHost}`,
      // Sentry's Next.js SDK proxies most client traffic through the
      // same-origin /monitoring tunnelRoute above, but Session Replay
      // (enabled in sentry.client.config.ts) can still talk to the ingest
      // host directly, so it needs to be allowed too.
      sentryHost && `https://${sentryHost}`,
    ].filter(Boolean).join(' ')

    const imgSrc = [
      "'self'",
      'data:',
      // AvatarUpload.tsx and the profile page preview a File via
      // URL.createObjectURL() before it's uploaded.
      'blob:',
      supabaseHost && `https://${supabaseHost}`,
    ].filter(Boolean).join(' ')

    // Report-only for now: this is a starting policy, not a battle-tested
    // one. Promote it by renaming the header below to plain
    // Content-Security-Policy once Sentry's /api/monitoring endpoint has run
    // reports-clean in production for a while — check the Reporting API
    // destination configured in Sentry, or browser devtools' console on a
    // few real page loads, before flipping it.
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' script-src: the JSON-LD <script type="application/ld+json">
      // tags on app/page.tsx and every app/support/*/page.tsx are still
      // <script> elements as far as CSP is concerned, even though they never
      // execute as JS.
      "script-src 'self' 'unsafe-inline'",
      // 'unsafe-inline' style-src: Tailwind's utility classes rely on inline
      // style attributes / injected <style> tags in a few places.
      "style-src 'self' 'unsafe-inline'",
      `img-src ${imgSrc}`,
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
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
