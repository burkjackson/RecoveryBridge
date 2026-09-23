// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// Renamed from sentry.client.config.ts (22 Sep 2026, review item). Next.js
// 15.3+ loads instrumentation-client.ts automatically, by its own
// convention, before the app hydrates — the older name relied on Sentry's
// webpack plugin injecting an import for it, which @sentry/nextjs 9+ no
// longer does when it detects this file instead. No other wiring changes:
// next.config.js's withSentryConfig call and instrumentation.ts (server +
// edge) are untouched, since those configs are still explicitly imported
// there rather than auto-loaded.

import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // 10% of transactions — enough signal for a low-traffic app without
    // spending the whole Sentry quota on routine page loads.
    tracesSampleRate: 0.1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    replaysOnErrorSampleRate: 1.0,

    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,

    // You can remove this option if you're not planning to use the Sentry Session Replay feature:
    integrations: [
      Sentry.replayIntegration({
        // Additional Replay configuration goes in here, for example:
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
