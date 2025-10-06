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

    // Verificar que el email no esté siendo usado por otro usuario (diferente ID)
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .neq('id', session.user.id)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'Este email ya está registrado con otro tipo de cuenta.' 
      }, { status: 409 })
    }

    // Crear el perfil del usuario
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

    console.log('Creating user with data:', userData)

    const { data: user, error } = await supabase
      .from('users')
      .upsert(userData)
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json({ 
        error: 'Error al crear el perfil: ' + error.message 
      }, { status: 500 })
    }

    console.log('User created successfully:', user)
    
    return NextResponse.json(user, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in create-user:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}