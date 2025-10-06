import { createServerClient } from '@/lib/supabaseServer'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { first_name, last_name, phone, user_type } = await request.json()

    if (!first_name || !last_name || !user_type) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (!['client', 'business_owner'].includes(user_type)) {
      return NextResponse.json({ error: 'Tipo de usuario inválido' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Obtener sesión del usuario autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      console.error('No session found:', sessionError)
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 })
    }

    console.log('🔐 Session found for user:', session.user.id, 'email:', session.user.email)

    // Verificar si el usuario ya existía en la tabla users (para saber si es nuevo)
    const { data: existingUserInDb } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    // Verificar que el email no esté siendo usado por otro usuario (diferente ID)
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .neq('id', session.user.id)
      .single()

    if (existingUser) {
      console.warn('⚠️ Email already exists for different user:', existingUser.id)
      return NextResponse.json({
        error: 'Este email ya está registrado con otro tipo de cuenta.'
      }, { status: 409 })
    }

    // Crear/actualizar el perfil del usuario
    const userData = {
      id: session.user.id,
      email: session.user.email!,
      first_name,
      last_name,
      phone: phone || null,
      avatar_url: session.user.user_metadata?.avatar_url || null,
      is_business_owner: user_type === 'business_owner',
      is_client: user_type === 'client',
    }

    console.log('📝 Creating/updating user with data:', userData)

    const { data: user, error } = await supabase
      .from('users')
      .upsert(userData)
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating/updating user:', error)
      return NextResponse.json({
        error: 'Error al crear el perfil: ' + error.message
      }, { status: 500 })
    }

    console.log('✅ User created/updated successfully:', user.id)

    // 🔥 ENVIAR EMAIL DE BIENVENIDA si es usuario de Google
    const isGoogleUser = session.user.app_metadata?.provider === 'google'
    const isNewUser = !existingUserInDb // Es nuevo si no existía antes en la tabla users

    if (isGoogleUser && isNewUser) {
      try {
        console.log('📧 Sending welcome email to:', user.email)

        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            type: 'welcome_google',
            to: user.email,
            userName: `${first_name} ${last_name}`,
            data: {
              userType: user_type, // 'client' o 'business_owner'
              redirectUrl: user_type === 'business_owner' ? '/dashboard/business' : '/dashboard/client'
            }
          })
        })

        if (emailResponse.ok) {
          console.log('✅ Welcome email sent successfully')
        } else {
          const errorText = await emailResponse.text()
          console.error('⚠️ Failed to send welcome email:', errorText)
          // No bloqueamos el registro si el email falla
        }
      } catch (emailError) {
        console.error('⚠️ Error sending welcome email:', emailError)
        // No bloqueamos el registro si el email falla
      }
    }

    // Determinar la URL de redirección correcta
    let redirectUrl: string
    if (user_type === 'business_owner') {
      // Verificar si ya tiene un negocio configurado
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      redirectUrl = business ? '/dashboard/business' : '/business/setup'
    } else {
      redirectUrl = '/dashboard/client'
    }

    console.log('🚀 Redirect URL determined:', redirectUrl)

    return NextResponse.json({
      user,
      redirectUrl,
      success: true
    }, { status: 201 })

  } catch (error) {
    console.error('💥 Unexpected error in complete-profile:', error)
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}