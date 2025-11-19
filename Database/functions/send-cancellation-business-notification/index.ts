const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:3000'

interface CancellationBusinessNotificationRequest {
  to: string
  userName: string // Business owner name
  data: {
    businessName: string
    businessAddress?: string
    serviceName: string
    servicePrice: number
    serviceDuration: number
    employeeName: string
    employeePosition?: string
    appointmentDate: string // Formato: "lunes, 15 de enero de 2025"
    appointmentTime: string // Formato: "09:00"
    appointmentEndTime: string // Formato: "10:00"
    cancellationReason?: string
    // Client info
    clientName: string
    clientEmail: string
    clientPhone?: string
  }
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

const getEmailTemplate = (userName: string, data: any) => {
  const businessGradient = 'linear-gradient(135deg, #ea580c 0%, #f59e0b 50%, #eab308 100%)'
  const businessColor = '#ea580c'

  return {
    subject: `Cliente canceló su cita - ${data.clientName}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancelación de Cita - TuTurno</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Container principal -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

          <!-- Header con gradiente naranja (business) -->
          <tr>
            <td style="background: ${businessGradient}; padding: 40px 32px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); padding: 8px 20px; border-radius: 20px; margin-bottom: 20px;">
                <span style="color: #ffffff; font-size: 12px; font-weight: 600; letter-spacing: 1px;">✕ CITA CANCELADA POR CLIENTE</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; line-height: 1.2;">
                Un cliente canceló su cita
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
                Hola <strong>${userName}</strong>,
              </p>

              <p style="margin: 0 0 32px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Te informamos que <strong>${data.clientName}</strong> ha cancelado su cita. A continuación los detalles:
              </p>

              <!-- Información del Cliente -->
              <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid ${businessColor};">
                <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: 600;">
                  👤 Información del Cliente
                </h2>

                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; font-weight: 500; width: 120px;">Nombre:</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600;">${data.clientName}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; font-weight: 500;">Email:</td>
                    <td style="color: #111827; font-size: 14px;">
                      <a href="mailto:${data.clientEmail}" style="color: ${businessColor}; text-decoration: none;">${data.clientEmail}</a>
                    </td>
                  </tr>
                  ${data.clientPhone ? `
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; font-weight: 500;">Teléfono:</td>
                    <td style="color: #111827; font-size: 14px;">
                      <a href="tel:${data.clientPhone}" style="color: ${businessColor}; text-decoration: none;">${data.clientPhone}</a>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- Detalles de la cita cancelada -->
              <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid #dc2626;">
                <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: 600;">
                  📅 Detalles de la Cita Cancelada
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
                    <td style="color: #6b7280; font-size: 14px; font-weight: 500; padding-top: 12px; border-top: 1px solid rgba(220, 38, 38, 0.2);">Valor:</td>
                    <td style="color: #dc2626; font-size: 18px; font-weight: 700; padding-top: 12px; border-top: 1px solid rgba(220, 38, 38, 0.2);">
                      ${formatPrice(data.servicePrice)}
                    </td>
                  </tr>
                </table>
              </div>

              ${data.cancellationReason ? `
              <!-- Motivo de cancelación -->
              <div style="background-color: #fffbeb; border-radius: 12px; padding: 20px; margin-bottom: 32px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 600;">
                  📝 Motivo de la Cancelación
                </h3>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                  ${data.cancellationReason}
                </p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${SITE_URL}/dashboard/business/appointments" style="display: inline-block; background: ${businessGradient}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                      Ver Calendario
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info note -->
              <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                  💡 Consejo
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  El horario cancelado ahora está disponible para otras reservas. Puedes contactar al cliente directamente si deseas reprogramar.
                </p>
              </div>

              <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                Este email se envió automáticamente cuando el cliente canceló su cita desde TuTurno.
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
                Tu plataforma de gestión de citas
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} TuTurno. Todos los derechos reservados.
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                Este es un email automático, por favor no responder.
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
    const { to, userName, data }: CancellationBusinessNotificationRequest = await req.json()

    console.log('📧 Sending cancellation business notification:', { to, userName, businessName: data?.businessName })

    const emailTemplate = getEmailTemplate(userName, data)

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TuTurno <citas@turnoapp.org>',
        to: [to],
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('❌ Resend API error:', errorText)
      throw new Error(`Resend API error: ${errorText}`)
    }

    const result = await emailResponse.json()
    console.log('✅ Cancellation business notification sent successfully:', result)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('💥 Error sending cancellation business notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
