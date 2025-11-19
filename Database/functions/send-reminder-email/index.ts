const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:3000'

interface ReminderEmailRequest {
  appointmentId: string
  clientEmail: string
  clientName: string
  businessName: string
  businessAddress?: string
  serviceName: string
  servicePrice: number
  serviceDuration: number
  employeeName: string
  employeePosition?: string
  appointmentDate: string // Formato: "lunes, 22 de octubre de 2025"
  appointmentTime: string // Formato: "14:30"
  appointmentEndTime: string // Formato: "15:30"
  clientNotes?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
}

const getEmailTemplate = (data: ReminderEmailRequest) => {
  const clientGradient = 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)'
  const clientColor = '#059669'

  return {
    subject: `⏰ Recordatorio: Tu cita en ${data.businessName}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Cita - TuTurno</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Container principal -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

          <!-- Header con gradiente verde -->
          <tr>
            <td style="background: ${clientGradient}; padding: 40px 32px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); padding: 8px 20px; border-radius: 20px; margin-bottom: 20px;">
                <span style="color: #ffffff; font-size: 12px; font-weight: 600; letter-spacing: 1px;">⏰ RECORDATORIO</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; line-height: 1.2;">
                ¡No olvides tu cita!
              </h1>
              <p style="margin: 16px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                ${data.businessName}
              </p>
            </td>
          </tr>

          <!-- Contenido principal -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 24px 0; color: #111827; font-size: 18px; line-height: 1.6;">
                Hola <strong>${data.clientName}</strong>,
              </p>

              <p style="margin: 0 0 32px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Este es un recordatorio amistoso de tu próxima cita. A continuación encontrarás todos los detalles:
              </p>

              <!-- Detalles de la cita con efecto destacado -->
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid ${clientColor};">
                <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: 600;">
                  📅 Detalles de la Cita
                </h2>

                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; font-weight: 500; width: 140px;">Fecha:</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600;">${data.appointmentDate}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; font-weight: 500;">Hora:</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600;">${data.appointmentTime} - ${data.appointmentEndTime}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; font-weight: 500;">Servicio:</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600;">${data.serviceName}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; font-weight: 500;">Duración:</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600;">${formatDuration(data.serviceDuration)}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; font-weight: 500;">Profesional:</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600;">
                      ${data.employeeName}${data.employeePosition ? ` - ${data.employeePosition}` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; font-weight: 500; padding-top: 12px; border-top: 1px solid rgba(5, 150, 105, 0.2);">Precio:</td>
                    <td style="color: ${clientColor}; font-size: 18px; font-weight: 700; padding-top: 12px; border-top: 1px solid rgba(5, 150, 105, 0.2);">
                      ${formatPrice(data.servicePrice)}
                    </td>
                  </tr>
                </table>
              </div>

              ${data.businessAddress ? `
              <!-- Información del negocio -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
                <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 600;">
                  📍 Ubicación
                </h3>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                  ${data.businessAddress}
                </p>
              </div>
              ` : ''}

              ${data.clientNotes ? `
              <!-- Notas del cliente -->
              <div style="background-color: #fffbeb; border-radius: 12px; padding: 20px; margin-bottom: 32px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 600;">
                  📝 Tus notas
                </h3>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                  ${data.clientNotes}
                </p>
              </div>
              ` : ''}

              <!-- Alerta importante -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 8px; margin-bottom: 32px;">
                <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                  ⚠️ Importante
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  Por favor, confirma tu asistencia o cancela con anticipación si no puedes asistir. Esto ayuda a otros clientes a obtener una cita disponible.
                </p>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${SITE_URL}/dashboard/client/appointments" style="display: inline-block; background: ${clientGradient}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                      Ver mis citas
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Recordatorio adicional -->
              <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                  💡 Consejos útiles
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                  <li>Llega 5-10 minutos antes de tu cita</li>
                  <li>Si necesitas cancelar, hazlo con al menos 24 horas de anticipación</li>
                  <li>Trae cualquier material o información relevante para tu servicio</li>
                </ul>
              </div>

              <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                ¡Te esperamos! Si tienes alguna pregunta, no dudes en contactar al negocio directamente.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <div style="margin-bottom: 16px;">
                <h2 style="margin: 0; color: #000000; font-size: 24px; font-weight: 700;">TuTurno</h2>
              </div>
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
                Tu plataforma de reservas inteligente
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} TuTurno. Todos los derechos reservados.
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                Este es un recordatorio automático. No responder a este email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const data: ReminderEmailRequest = await req.json()

    console.log('📧 [REMINDER] Sending reminder email:', {
      appointmentId: data.appointmentId,
      to: data.clientEmail,
      clientName: data.clientName,
      businessName: data.businessName
    })

    const emailTemplate = getEmailTemplate(data)

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TuTurno <citas@turnoapp.org>',
        to: [data.clientEmail],
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('❌ [REMINDER] Resend API error:', errorText)
      throw new Error(`Resend API error: ${errorText}`)
    }

    const result = await emailResponse.json()
    console.log('✅ [REMINDER] Email sent successfully:', result)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('💥 [REMINDER] Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
