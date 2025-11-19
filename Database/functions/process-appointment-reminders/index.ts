import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Formatear fecha en español
const formatSpanishDate = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00')
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]

  const dayName = days[date.getDay()]
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()

  return `${dayName}, ${day} de ${month} de ${year}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('═══════════════════════════════════════════════')
    console.log('⏰ [CRON] Starting reminder processing job...')
    console.log('═══════════════════════════════════════════════')

    // Crear cliente de Supabase con Service Role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Obtener reminders pendientes que ya llegaron a su hora programada
    const now = new Date().toISOString()
    console.log(`⏰ [CRON] Current time: ${now}`)

    const { data: pendingReminders, error: fetchError } = await supabase
      .from('appointment_reminders')
      .select('id, appointment_id, reminder_type, scheduled_for')
      .eq('status', 'pending')
      .eq('reminder_type', 'email')  // Por ahora solo emails
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })

    if (fetchError) {
      console.error('❌ [CRON] Error fetching reminders:', fetchError)
      throw fetchError
    }

    console.log(`📊 [CRON] Found ${pendingReminders?.length || 0} pending reminders to process`)

    if (!pendingReminders || pendingReminders.length === 0) {
      console.log('✅ [CRON] No reminders to process')
      console.log('═══════════════════════════════════════════════\n')
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No pending reminders' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    let successCount = 0
    let errorCount = 0
    const errors: Array<{ reminderId: string; error: string }> = []

    // 2. Procesar cada reminder
    for (const reminder of pendingReminders) {
      try {
        console.log(`\n📧 [CRON] Processing reminder ${reminder.id} for appointment ${reminder.appointment_id}`)
        console.log(`📅 [CRON] Scheduled for: ${reminder.scheduled_for}`)

        // Obtener datos completos de la cita con relaciones
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            start_time,
            end_time,
            total_price,
            client_notes,
            status,
            users!appointments_client_id_fkey(
              first_name,
              last_name,
              email
            ),
            employees(
              first_name,
              last_name,
              position
            ),
            businesses(
              name,
              address
            ),
            appointment_services(
              price,
              services(
                name,
                duration_minutes
              )
            )
          `)
          .eq('id', reminder.appointment_id)
          .single()

        if (appointmentError || !appointmentData) {
          console.error(`❌ [CRON] Error fetching appointment ${reminder.appointment_id}:`, appointmentError)
          throw new Error(`Appointment not found: ${appointmentError?.message}`)
        }

        console.log(`✅ [CRON] Appointment data fetched successfully`)
        console.log(`📊 [CRON] Appointment status: ${appointmentData.status}`)
        console.log(`📊 [CRON] Client: ${appointmentData.users?.first_name} ${appointmentData.users?.last_name}`)

        // Verificar que la cita siga confirmada o pending
        if (!['confirmed', 'pending'].includes(appointmentData.status)) {
          console.warn(`⚠️ [CRON] Appointment ${reminder.appointment_id} status is ${appointmentData.status}, cancelling reminder`)

          await supabase
            .from('appointment_reminders')
            .update({
              status: 'cancelled',
              error_message: `Cita con status ${appointmentData.status}, no válida para recordatorio`
            })
            .eq('id', reminder.id)

          errorCount++
          continue
        }

        // Verificar que el cliente tenga email
        if (!appointmentData.users || !appointmentData.users.email) {
          console.warn(`⚠️ [CRON] Appointment ${reminder.appointment_id} has no client email, marking as failed`)

          await supabase
            .from('appointment_reminders')
            .update({
              status: 'failed',
              error_message: 'Cliente no tiene email registrado'
            })
            .eq('id', reminder.id)

          errorCount++
          continue
        }

        // Preparar datos para el email
        const serviceName = appointmentData.appointment_services
          .map((as: any) => as.services.name)
          .join(', ')

        const totalDuration = appointmentData.appointment_services
          .reduce((sum: number, as: any) => sum + (as.services.duration_minutes || 0), 0)

        const emailData = {
          appointmentId: appointmentData.id,
          clientEmail: appointmentData.users.email,
          clientName: `${appointmentData.users.first_name} ${appointmentData.users.last_name}`,
          businessName: appointmentData.businesses.name,
          businessAddress: appointmentData.businesses.address,
          serviceName,
          servicePrice: parseFloat(appointmentData.total_price || '0'),
          serviceDuration: totalDuration,
          employeeName: `${appointmentData.employees.first_name} ${appointmentData.employees.last_name}`,
          employeePosition: appointmentData.employees.position,
          appointmentDate: formatSpanishDate(appointmentData.appointment_date),
          appointmentTime: appointmentData.start_time.substring(0, 5),
          appointmentEndTime: appointmentData.end_time.substring(0, 5),
          clientNotes: appointmentData.client_notes
        }

        console.log(`📤 [CRON] Sending reminder email to ${emailData.clientEmail}`)

        // Llamar a la edge function de email
        const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-reminder-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData)
        })

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text()
          console.error(`❌ [CRON] Error sending email for reminder ${reminder.id}:`, errorText)
          throw new Error(`Email sending failed: ${errorText}`)
        }

        const emailResult = await emailResponse.json()
        console.log(`✅ [CRON] Email sent successfully for reminder ${reminder.id}`)
        console.log(`📧 [CRON] Resend ID: ${emailResult.data?.id}`)

        // Marcar reminder como enviado
        const { error: updateError } = await supabase
          .from('appointment_reminders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', reminder.id)

        if (updateError) {
          console.error(`⚠️ [CRON] Error updating reminder ${reminder.id} status:`, updateError)
        } else {
          console.log(`✅ [CRON] Reminder ${reminder.id} marked as sent`)
        }

        successCount++

      } catch (error: any) {
        console.error(`❌ [CRON] Error processing reminder ${reminder.id}:`, error)

        // Marcar reminder como failed
        await supabase
          .from('appointment_reminders')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error'
          })
          .eq('id', reminder.id)

        errors.push({
          reminderId: reminder.id,
          error: error.message
        })

        errorCount++
      }
    }

    console.log('\n═══════════════════════════════════════════════')
    console.log(`✅ [CRON] Reminder processing completed`)
    console.log(`📊 [CRON] Total processed: ${pendingReminders.length}`)
    console.log(`✅ [CRON] Success: ${successCount}`)
    console.log(`❌ [CRON] Errors: ${errorCount}`)
    if (errors.length > 0) {
      console.log(`⚠️ [CRON] Error details:`, JSON.stringify(errors, null, 2))
    }
    console.log('═══════════════════════════════════════════════\n')

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingReminders.length,
        success_count: successCount,
        error_count: errorCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('\n💥 [CRON] Fatal error processing reminders:', error)
    console.error('═══════════════════════════════════════════════\n')
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
