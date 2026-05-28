export async function register() {
  // Skip Sentry in development: its auto-instrumentation pulls in the full
  // OpenTelemetry/Prisma tracing tree, which makes `next dev` startup extremely slow.
  if (process.env.NODE_ENV !== 'production') return

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export async function onRequestError(
  err: unknown,
  request: {
    path: string
  },
  context: {
    routerKind: 'Pages Router' | 'App Router'
    routePath: string
    routeType: 'render' | 'route' | 'action' | 'middleware'
  }
) {
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureException(err, {
    contexts: {
      nextjs: {
        request_path: request.path,
        router_kind: context.routerKind,
        router_path: context.routePath,
        route_type: context.routeType,
      },
    },
  })
}
