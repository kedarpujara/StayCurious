import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                      request.nextUrl.pathname.startsWith('/callback')
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/ask') ||
                           request.nextUrl.pathname.startsWith('/backlog') ||
                           request.nextUrl.pathname.startsWith('/learn') ||
                           request.nextUrl.pathname.startsWith('/daily') ||
                           request.nextUrl.pathname.startsWith('/profile')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages and landing page
  const isLandingPage = request.nextUrl.pathname === '/'
  if (user && (isAuthRoute || isLandingPage) && !request.nextUrl.pathname.startsWith('/callback')) {
    const url = request.nextUrl.clone()
    url.pathname = '/ask'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
