const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:3000'

interface NoShowEmailRequest {
  to: string
  userName: string
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
    cancellationPolicy?: string
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
  const noShowGradient = 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)'
  const noShowColor = '#ea580c'

  return {
    subject: `No asististe a tu cita - ${data.businessName}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>No Asististe - TuTurno</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Container principal -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

          <!-- Header con gradiente naranja -->
          <tr>
            <td style="background: ${noShowGradient}; padding: 40px 32px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); padding: 8px 20px; border-radius: 20px; margin-bottom: 20px;">
                <span style="color: #ffffff; font-size: 12px; font-weight: 600; letter-spacing: 1px;">⚠️ NO ASISTIÓ</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; line-height: 1.2;">
                No asististe a tu cita
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
                Registramos que no asististe a tu cita programada. A continuación encontrarás los detalles de la cita a la que no pudiste asistir:
              </p>

              <!-- Detalles de la cita -->
              <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid ${noShowColor};">
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
                    <td style="color: #6b7280; font-size: 14px; font-weight: 500; padding-top: 12px; border-top: 1px solid rgba(234, 88, 12, 0.2);">Precio:</td>
                    <td style="color: ${noShowColor}; font-size: 18px; font-weight: 700; padding-top: 12px; border-top: 1px solid rgba(234, 88, 12, 0.2);">
                      ${formatPrice(data.servicePrice)}
                    </td>
                  </tr>
                </table>
              </div>

              ${data.businessAddress ? `
              <!-- Información del negocio -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
                <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 600; display: flex; align-items: center;">
                  📍 Ubicación
                </h3>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                  ${data.businessAddress}
                </p>
              </div>
              ` : ''}

              <!-- Política de cancelación -->
              <div style="background-color: #fffbeb; border-radius: 12px; padding: 20px; margin-bottom: 32px; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 600;">
                  📋 Recordatorio de Política
                </h3>
                <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                  ${data.cancellationPolicy || 'Por favor, recuerda que es importante cancelar tus citas con anticipación si no podrás asistir. Esto permite que otros clientes puedan aprovechar ese horario.'}
                </p>
                <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5; font-style: italic;">
                  💡 Si necesitas cancelar una cita en el futuro, puedes hacerlo desde tu panel de citas con al menos 24 horas de anticipación.
                </p>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${SITE_URL}/dashboard/client/appointments" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                      Reservar Nueva Cita
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Mensaje adicional -->
              <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                  💙 Te esperamos pronto
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  Esperamos poder atenderte en una próxima ocasión. Si tuviste algún inconveniente, por favor contáctanos para ayudarte.
                </p>
              </div>

              <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                Gracias por usar TuTurno. Esperamos verte pronto.
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
    const { to, userName, data }: NoShowEmailRequest = await req.json()

    console.log('📧 Sending no-show email:', { to, userName, businessName: data?.businessName })

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
    console.log('✅ No-show email sent successfully:', result)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('💥 Error sending no-show email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
