import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
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
