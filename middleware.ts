import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // getAll/setAll, not the old per-cookie get/set/remove — @supabase/ssr
  // deprecated the latter (still works in 0.5.2, but is unmaintained going
  // forward, and Next.js 15's cookies API is itself moving the same
  // direction). Behavior is unchanged: every cookie the client wants to set
  // still gets mirrored onto both `request` (so this same middleware pass
  // sees it) and a freshly-built `response` (so the browser gets it).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get user session
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Routes that require authentication (redirect to /login if not signed in)
  const authRoutes = ['/dashboard', '/chat', '/profile', '/listeners', '/admin', '/training', '/history', '/connect']
  if (authRoutes.some((route) => pathname.startsWith(route)) && !user) {
    const loginUrl = new URL('/login', request.url)
    // Keep the query string: /connect carries ?seekerId=, and dropping it
    // strands a listener who tapped a notification while signed out.
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // Onboarding requires auth but redirects to /signup instead
  if (pathname.startsWith('/onboarding') && !user) {
    return NextResponse.redirect(new URL('/signup', request.url))
  }

  // Admin routes additionally require is_admin = true. is_admin isn't a
  // client-SELECT-able column anymore (migration 059 — it let anyone read
  // whether an arbitrary profile was an admin), so this goes through the
  // get_my_admin_status() RPC, which only ever answers for the caller.
  if (pathname.startsWith('/admin') && user) {
    const { data: isAdmin } = await supabase.rpc('get_my_admin_status')

    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/chat/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/listeners/:path*',
    '/onboarding/:path*',
    '/training/:path*',
    '/history/:path*',
    '/connect/:path*',
    '/connect'
  ]
}
