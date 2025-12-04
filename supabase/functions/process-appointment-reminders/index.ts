import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CRON_SECRET = Deno.env.get('cron') || '7d4f9c2a-3b8e-4f1d-a5c6-2e9b7f3d8a1c';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const formatSpanishDate = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00');
  const days = [
    'domingo',
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado'
  ];
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre'
  ];
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${day} de ${month} de ${year}`;
};

// ⏱️ Helper para delay entre envíos (rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  // ✅ Validar secret desde query parameter
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');

  console.log('🔍 [DEBUG] Secret from URL:', secret ? `${secret.substring(0, 20)}...` : 'NULL');
  console.log('🔍 [DEBUG] Expected:', CRON_SECRET ? `${CRON_SECRET.substring(0, 20)}...` : 'NULL');
  console.log('🔍 [DEBUG] Match:', secret === CRON_SECRET);

  if (!secret || secret !== CRON_SECRET) {
    console.error('❌ [SECURITY] Invalid secret');
    return new Response(JSON.stringify({
      error: 'Unauthorized'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 401
    });
  }

  console.log('✅ [SECURITY] Secret validated');
  console.log('⏰ [CRON] Starting reminder processing...');

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const now = new Date().toISOString();

    const { data: pendingReminders, error: fetchError } = await supabase
      .from('appointment_reminders')
      .select('id, appointment_id, reminder_type, scheduled_for')
      .eq('status', 'pending')
      .eq('reminder_type', 'email')
      .lte('scheduled_for', now)
      .order('scheduled_for', {
        ascending: true
      });

    if (fetchError) throw fetchError;

    console.log(`📊 Found ${pendingReminders?.length || 0} pending reminders`);

    if (!pendingReminders || pendingReminders.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        message: 'No pending reminders'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const reminder of pendingReminders) {
      try {
        // Fetch appointment data
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            id, appointment_date, start_time, end_time, total_price, client_notes, status,
            users!appointments_client_id_fkey(first_name, last_name, email),
            employees(first_name, last_name, position),
            businesses(name, address),
            appointment_services(price, services(name, duration_minutes))
          `)
          .eq('id', reminder.appointment_id)
          .single();

        if (appointmentError || !appointmentData) throw new Error('Appointment not found');

        // Check appointment status
        if (!['confirmed', 'pending'].includes(appointmentData.status)) {
          await supabase
            .from('appointment_reminders')
            .update({
              status: 'cancelled'
            })
            .eq('id', reminder.id);
          errorCount++;
          continue;
        }

        // Check if client has email
        if (!appointmentData.users?.email) {
          await supabase
            .from('appointment_reminders')
            .update({
              status: 'failed',
              error_message: 'No email'
            })
            .eq('id', reminder.id);
          errorCount++;
          continue;
        }

        // Prepare email data
        const serviceName = appointmentData.appointment_services
          .map((as: any) => as.services.name)
          .join(', ');
        const totalDuration = appointmentData.appointment_services
          .reduce((sum: number, as: any) => sum + (as.services.duration_minutes || 0), 0);

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
        };

        // Send email via Edge Function
        const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-reminder-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailData)
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          throw new Error(`Email failed: ${errorText}`);
        }

        // Mark as sent
        await supabase
          .from('appointment_reminders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', reminder.id);

        successCount++;
        console.log(`✅ Reminder sent: ${reminder.id}`);

        // ⏱️ Delay de 2 segundos para respetar rate limits de Resend
        if (successCount < pendingReminders.length) {
          console.log('⏱️ Waiting 2 seconds before next email...');
          await delay(2000);
        }

      } catch (error: any) {
        console.error(`❌ Error processing reminder ${reminder.id}:`, error.message);
        await supabase
          .from('appointment_reminders')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', reminder.id);
        errorCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: pendingReminders.length,
      success_count: successCount,
      error_count: errorCount
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error: any) {
    console.error('💥 Fatal error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
