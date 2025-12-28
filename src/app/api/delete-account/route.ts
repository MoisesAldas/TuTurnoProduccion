import { createServerClient } from '@/lib/supabaseServer'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Obtener sesión del usuario autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      console.error('❌ No session found:', sessionError)
      return NextResponse.json(
        { error: 'No hay sesión activa' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const userEmail = session.user.email

    console.log('🗑️ Delete account request from:', userEmail, '(ID:', userId, ')')

    // Verificar que el usuario existe en public.users
    const { data: userData, error: getUserError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, is_business_owner')
      .eq('id', userId)
      .single()

    if (getUserError || !userData) {
      console.error('❌ User not found in public.users:', getUserError)
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Prevenir que business owners eliminen su cuenta si tienen un negocio activo
    if (userData.is_business_owner) {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, is_active')
        .eq('owner_id', userId)
        .single()

      if (!businessError && business && business.is_active) {
        console.warn('⚠️ Business owner tried to delete account with active business:', business.name)
        return NextResponse.json(
          {
            error: 'No puedes eliminar tu cuenta mientras tengas un negocio activo. Primero desactiva o elimina tu negocio.',
            business_name: business.name
          },
          { status: 400 }
        )
      }
    }

    // Llamar a la Edge Function para eliminar el usuario
    // Usamos Service Role Key para tener permisos de admin
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user-account`

    console.log('📡 Calling Edge Function:', edgeFunctionUrl)

    const deleteResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        user_id: userId
      })
    })

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json()
      console.error('❌ Edge Function error:', errorData)
      throw new Error(errorData.error || 'Error al eliminar la cuenta')
    }

    const result = await deleteResponse.json()

    console.log('✅ User deleted successfully:', {
      user_id: userId,
      email: userEmail,
      result
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Cuenta eliminada exitosamente',
        user_email: userEmail
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('💥 Error in delete-account API route:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al eliminar la cuenta'
      },
      { status: 500 }
    )
  }
}
