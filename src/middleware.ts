import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // OAuth/Supabase sometimes returns to the site root with ?code=... instead of our callback route.
  // If we detect a code (and we're not already under /auth), redirect to /auth/callback preserving the query.
  const isAuthPath = req.nextUrl.pathname.startsWith('/auth')
  const hasOAuthCode = req.nextUrl.searchParams.has('code')
  if (!isAuthPath && hasOAuthCode) {
    const redirectUrl = new URL('/auth/callback', req.url)
    // Preserve all original query params
    req.nextUrl.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value)
    })
    return NextResponse.redirect(redirectUrl)
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Rutas protegidas que requieren autenticación
  const protectedRoutes = ['/dashboard', '/profile', '/business']
  const authRoutes = ['/auth/login', '/auth/setup']

  // Rutas públicas que NO requieren autenticación
  const publicRoutes = ['/']

  const isProtectedRoute = protectedRoutes.some(route =>
    req.nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some(route =>
    req.nextUrl.pathname.startsWith(route)
  )
  const isPublicRoute = publicRoutes.some(route =>
    req.nextUrl.pathname === route
  )

  // Verificar rutas específicas de dashboard
  const isBusinessDashboard = req.nextUrl.pathname.startsWith('/dashboard/business')
  const isClientDashboard = req.nextUrl.pathname.startsWith('/dashboard/client')
  const isBusinessSetup = req.nextUrl.pathname.startsWith('/business/setup')

  // Si es una ruta pública, permitir acceso siempre
  if (isPublicRoute) {
    return res
  }

  // Si es una ruta protegida y no hay sesión, redirigir al login
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Si hay sesión, obtener datos del usuario para validaciones
  if (session) {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    // Si es una ruta de auth y ya hay sesión con perfil completo
    if (isAuthRoute && user) {
      // Verificar si tiene negocio si es business_owner
      if (user.is_business_owner) {
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .single()

        const redirectPath = business ? '/dashboard/business' : '/business/setup'
        return NextResponse.redirect(new URL(redirectPath, req.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard/client', req.url))
      }
    }

    // Validaciones específicas por tipo de usuario en rutas protegidas
    if (user && isProtectedRoute) {
      // Business owner intentando acceder a dashboard de cliente
      if (user.is_business_owner && isClientDashboard) {
        // Verificar si tiene negocio configurado
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .single()

        const redirectPath = business ? '/dashboard/business' : '/business/setup'
        return NextResponse.redirect(new URL(redirectPath, req.url))
      }

      // Cliente intentando acceder a dashboard de negocio o setup
      if (user.is_client && (isBusinessDashboard || isBusinessSetup)) {
        return NextResponse.redirect(new URL('/dashboard/client', req.url))
      }

      // Business owner sin negocio intentando acceder al dashboard
      if (user.is_business_owner && isBusinessDashboard) {
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .single()

        if (!business) {
          return NextResponse.redirect(new URL('/business/setup', req.url))
        }
      }
    }

    // Si no tiene perfil completo y está intentando acceder a rutas protegidas (pero NO a rutas públicas)
    if (!user && isProtectedRoute && !isPublicRoute) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }
  }
  return res
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/profile/:path*',
    '/business/:path*',
    '/auth/:path*'
  ],
}