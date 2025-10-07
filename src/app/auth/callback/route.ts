import { createServerClient } from '@/lib/supabaseServer'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Try to resolve user type from query param first, then from cookie fallback
  let type = searchParams.get('type') as 'client' | 'business_owner' | null // 'client' o 'business_owner'
  const cookieType = request.cookies.get('auth_user_type')?.value as 'client' | 'business_owner' | undefined
  if (!type && cookieType && (cookieType === 'client' || cookieType === 'business_owner')) {
    type = cookieType
  }
  const action = searchParams.get('action') // 'reset-password' o undefined

  console.log('🔐 Auth callback received:', { hasCode: !!code, userType: type, action })

  if (!code) {
    console.error('No authorization code received')
    // Si no hay tipo, ir al login general, si no, al específico
    const loginPath = type === 'business_owner' ? '/auth/business/login' : '/auth/client/login'
    const res = NextResponse.redirect(`${origin}${loginPath}?error=no_code`)
    // Clean fallback cookie
    res.cookies.set('auth_user_type', '', { maxAge: 0, path: '/' })
    return res
  }

  if (!type || !['client', 'business_owner'].includes(type)) {
    console.error('Invalid or missing user type')
    const res = NextResponse.redirect(`${origin}/auth/client/login?error=invalid_type`)
    res.cookies.set('auth_user_type', '', { maxAge: 0, path: '/' })
    return res
  }

  try {
    const supabase = createServerClient()
    
    // Intercambiar código por sesión
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Error exchanging code for session:', sessionError)
      const loginPath = type === 'business_owner' ? '/auth/business/login' : '/auth/client/login'
      const res = NextResponse.redirect(`${origin}${loginPath}?error=session_error`)
      res.cookies.set('auth_user_type', '', { maxAge: 0, path: '/' })
      return res
    }

    if (!session?.user) {
      console.error('No user in session after exchange')
      const loginPath = type === 'business_owner' ? '/auth/business/login' : '/auth/client/login'
      const res = NextResponse.redirect(`${origin}${loginPath}?error=no_user`)
      res.cookies.set('auth_user_type', '', { maxAge: 0, path: '/' })
      return res
    }

    console.log('✅ Session created for user:', session.user.id, session.user.email)

    // Si es una acción de reset password, redirigir a la página de reset
    if (action === 'reset-password') {
      console.log('🔄 Password reset action detected, redirecting to reset page')
      const resetPath = type === 'business_owner' ? '/auth/business/reset-password' : '/auth/client/reset-password'
      const res = NextResponse.redirect(`${origin}${resetPath}`)
      res.cookies.set('auth_user_type', '', { maxAge: 0, path: '/' })
      return res
    }

    // Verificar si el usuario ya existe en nuestra base de datos
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      // Error diferente a "no encontrado"
      console.error('Error checking existing user:', userCheckError)
      const loginPath = type === 'business_owner' ? '/auth/business/login' : '/auth/client/login'
      const res = NextResponse.redirect(`${origin}${loginPath}?error=database_error`)
      res.cookies.set('auth_user_type', '', { maxAge: 0, path: '/' })
      return res
    }

    if (existingUser) {
      // Usuario ya existe, verificar compatibilidad de tipo
      const isCompatibleType = 
        (type === 'client' && existingUser.is_client) ||
        (type === 'business_owner' && existingUser.is_business_owner)

      if (!isCompatibleType) {
        console.log('User exists but with different type')
        // El usuario ya existe pero con un tipo diferente
        await supabase.auth.signOut()
        // Redirigir al login opuesto para sugerir el tipo correcto
        const suggestionPath = type === 'business_owner' ? '/auth/client/login' : '/auth/business/login'
        const res = NextResponse.redirect(`${origin}${suggestionPath}?error=email_different_type`)
        res.cookies.set('auth_user_type', '', { maxAge: 0, path: '/' })
        return res
      }

      // Usuario existe y es compatible, determinar redirección correcta
      let redirectPath: string

      if (existingUser.is_business_owner) {
        // Verificar si tiene negocio configurado
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', existingUser.id)
          .single()

        redirectPath = business ? '/dashboard/business' : '/business/setup'
      } else {
        redirectPath = '/dashboard/client'
      }

      console.log('✅ Existing user, redirecting to:', redirectPath)
      const res = NextResponse.redirect(`${origin}${redirectPath}`)
      res.cookies.set('auth_user_type', '', { maxAge: 0, path: '/' })
      return res
    }

    // Verificar si el email ya está usado por otro usuario (diferente ID)
    const { data: emailUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .neq('id', session.user.id)
      .single()

    if (emailUser) {
      console.log('Email already used by different user')
      await supabase.auth.signOut()
      const loginPath = type === 'business_owner' ? '/auth/business/login' : '/auth/client/login'
      const res = NextResponse.redirect(`${origin}${loginPath}?error=email_exists`)
      res.cookies.set('auth_user_type', '', { maxAge: 0, path: '/' })
      return res
    }

    // Usuario nuevo, redirigir a setup de perfil
    console.log('👤 New user detected, redirecting to profile setup with type:', type)
    const setupPath = type === 'business_owner' ? '/auth/business/setup' : '/auth/client/setup'
    const res = NextResponse.redirect(`${origin}${setupPath}`)
    res.cookies.set('auth_user_type', '', { maxAge: 0, path: '/' })
    return res

  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    const loginPath = type === 'business_owner' ? '/auth/business/login' : '/auth/client/login'
    const res = NextResponse.redirect(`${origin}${loginPath}?error=unexpected_error`)
    res.cookies.set('auth_user_type', '', { maxAge: 0, path: '/' })
    return res
  }
}