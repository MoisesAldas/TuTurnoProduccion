import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Supabase Service Role Client (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const EDGE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-cancellation-email`

export async function POST(request: Request) {
  try {
    // 1. Obtener emails pendientes (máximo 10 por ejecución)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('Error fetching email queue:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending emails',
        processed: 0
      })
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as any[]
    }

    // 2. Procesar cada email
    for (const email of pendingEmails) {
      try {
        // Llamar a la Edge Function
        const response = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            to: email.to_email,
            userName: email.user_name,
            data: email.email_data
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Edge Function error: ${errorText}`)
        }

        // Marcar como enviado
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempts: email.attempts + 1
          })
          .eq('id', email.id)

        if (updateError) {
          console.error('Error updating email status:', updateError)
        }

        results.sent++

      } catch (error: any) {
        console.error(`Error sending email ${email.id}:`, error)

        // Marcar como fallido si ya intentó 3 veces
        const newAttempts = email.attempts + 1
        const newStatus = newAttempts >= 3 ? 'failed' : 'pending'

        const { error: updateError } = await supabase
          .from('email_queue')
          .update({
            status: newStatus,
            attempts: newAttempts,
            error_message: error.message
          })
          .eq('id', email.id)

        if (updateError) {
          console.error('Error updating failed email:', updateError)
        }

        results.failed++
        results.errors.push({
          email_id: email.id,
          to: email.to_email,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: pendingEmails.length,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors
    })

  } catch (error: any) {
    console.error('Error processing email queue:', error)
    return NextResponse.json({
      error: error.message
    }, {
      status: 500
    })
  }
}

// Permitir GET para verificar el estado
export async function GET(request: Request) {
  try {
    const { data: stats, error } = await supabase
      .from('email_queue')
      .select('status')

    if (error) throw error

    const pending = stats?.filter(s => s.status === 'pending').length || 0
    const sent = stats?.filter(s => s.status === 'sent').length || 0
    const failed = stats?.filter(s => s.status === 'failed').length || 0

    return NextResponse.json({
      pending,
      sent,
      failed,
      total: stats?.length || 0
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
