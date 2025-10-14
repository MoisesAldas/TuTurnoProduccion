const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:3000'

interface RescheduledEmailRequest {
  to: string
  userName: string
  data: {
    businessName: string
    businessAddress?: string
    serviceName: string
    servicePrice: number
    serviceDuration: number
    // Datos NUEVOS (después del cambio)
    newAppointmentDate: string // Formato: "lunes, 15 de enero de 2025"
    newAppointmentTime: string // Formato: "09:00"
    newAppointmentEndTime: string // Formato: "10:00"
    newEmployeeName: string
    newEmployeePosition?: string
    // Datos VIEJOS (antes del cambio)
    oldAppointmentDate: string
    oldAppointmentTime: string
    oldAppointmentEndTime: string
    oldEmployeeName: string
    oldEmployeePosition?: string
    // Indicadores de cambio
    dateChanged: boolean
    timeChanged: boolean
    employeeChanged: boolean
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
  const rescheduledGradient = 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)'
  const rescheduledColor = '#2563eb'

  // Determinar qué cambió para el mensaje principal
  let changesSummary = ''
  if (data.dateChanged && data.timeChanged && data.employeeChanged) {
    changesSummary = 'la fecha, hora y profesional'
  } else if (data.dateChanged && data.timeChanged) {
    changesSummary = 'la fecha y hora'
  } else if (data.dateChanged && data.employeeChanged) {
    changesSummary = 'la fecha y el profesional'
  } else if (data.timeChanged && data.employeeChanged) {
    changesSummary = 'la hora y el profesional'
  } else if (data.dateChanged) {
    changesSummary = 'la fecha'
  } else if (data.timeChanged) {
    changesSummary = 'la hora'
  } else if (data.employeeChanged) {
    changesSummary = 'el profesional'
  }

  return {
    subject: `Cita reagendada - ${data.businessName}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cita Reagendada - TuTurno</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Container principal -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

          <!-- Header con gradiente azul -->
          <tr>
            <td style="background: ${rescheduledGradient}; padding: 40px 32px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); padding: 8px 20px; border-radius: 20px; margin-bottom: 20px;">
                <span style="color: #ffffff; font-size: 12px; font-weight: 600; letter-spacing: 1px;">📅 CITA REAGENDADA</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; line-height: 1.2;">
                Tu cita ha sido reagendada
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
                Tu cita ha sido reagendada. Se ha modificado <strong>${changesSummary}</strong>. A continuación encontrarás los cambios realizados:
              </p>

              <!-- Comparación ANTES / DESPUÉS -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid ${rescheduledColor};">
                <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: 600; text-align: center;">
                  📊 Cambios Realizados
                </h2>

                <!-- Tabla de comparación -->
                <table width="100%" cellpadding="12" cellspacing="0" style="border-collapse: collapse;">
                  <tr>
                    <td style="width: 30%; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid rgba(37, 99, 235, 0.2);"></td>
                    <td style="width: 35%; color: #dc2626; font-size: 13px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid rgba(37, 99, 235, 0.2);">❌ Antes</td>
                    <td style="width: 35%; color: #059669; font-size: 13px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid rgba(37, 99, 235, 0.2);">✅ Ahora</td>
                  </tr>

                  ${data.dateChanged ? `
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 500; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">Fecha:</td>
                    <td style="padding: 12px 8px; color: #dc2626; font-size: 14px; font-weight: 600; text-align: center; background-color: rgba(254, 202, 202, 0.3); border-radius: 6px; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">
                      ${data.oldAppointmentDate}
                    </td>
                    <td style="padding: 12px 8px; color: #059669; font-size: 14px; font-weight: 600; text-align: center; background-color: rgba(167, 243, 208, 0.3); border-radius: 6px; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">
                      ${data.newAppointmentDate}
                    </td>
                  </tr>
                  ` : `
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 500; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">Fecha:</td>
                    <td colspan="2" style="padding: 12px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: center; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">
                      ${data.newAppointmentDate}
                    </td>
                  </tr>
                  `}

                  ${data.timeChanged ? `
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 500; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">Hora:</td>
                    <td style="padding: 12px 8px; color: #dc2626; font-size: 14px; font-weight: 600; text-align: center; background-color: rgba(254, 202, 202, 0.3); border-radius: 6px; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">
                      ${data.oldAppointmentTime} - ${data.oldAppointmentEndTime}
                    </td>
                    <td style="padding: 12px 8px; color: #059669; font-size: 14px; font-weight: 600; text-align: center; background-color: rgba(167, 243, 208, 0.3); border-radius: 6px; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">
                      ${data.newAppointmentTime} - ${data.newAppointmentEndTime}
                    </td>
                  </tr>
                  ` : `
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 500; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">Hora:</td>
                    <td colspan="2" style="padding: 12px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: center; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">
                      ${data.newAppointmentTime} - ${data.newAppointmentEndTime}
                    </td>
                  </tr>
                  `}

                  ${data.employeeChanged ? `
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 500; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">Profesional:</td>
                    <td style="padding: 12px 8px; color: #dc2626; font-size: 14px; font-weight: 600; text-align: center; background-color: rgba(254, 202, 202, 0.3); border-radius: 6px; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">
                      ${data.oldEmployeeName}${data.oldEmployeePosition ? ` - ${data.oldEmployeePosition}` : ''}
                    </td>
                    <td style="padding: 12px 8px; color: #059669; font-size: 14px; font-weight: 600; text-align: center; background-color: rgba(167, 243, 208, 0.3); border-radius: 6px; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">
                      ${data.newEmployeeName}${data.newEmployeePosition ? ` - ${data.newEmployeePosition}` : ''}
                    </td>
                  </tr>
                  ` : `
                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 500; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">Profesional:</td>
                    <td colspan="2" style="padding: 12px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: center; border-bottom: 1px solid rgba(37, 99, 235, 0.1);">
                      ${data.newEmployeeName}${data.newEmployeePosition ? ` - ${data.newEmployeePosition}` : ''}
                    </td>
                  </tr>
                  `}

                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Servicio:</td>
                    <td colspan="2" style="padding: 12px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: center;">
                      ${data.serviceName}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 500; padding-top: 16px; border-top: 2px solid rgba(37, 99, 235, 0.2);">Precio:</td>
                    <td colspan="2" style="padding: 12px 0; color: ${rescheduledColor}; font-size: 18px; font-weight: 700; text-align: center; padding-top: 16px; border-top: 2px solid rgba(37, 99, 235, 0.2);">
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

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${SITE_URL}/dashboard/client/appointments" style="display: inline-block; background: ${rescheduledGradient}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                      Ver mis citas
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Recordatorio -->
              <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                  💡 Recordatorio importante
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  Por favor, toma nota de los nuevos detalles de tu cita. Si tienes alguna duda o no puedes asistir, no dudes en contactar con el negocio.
                </p>
              </div>

              <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                Si tienes alguna pregunta sobre los cambios, no dudes en contactar directamente con el negocio.
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
    const { to, userName, data }: RescheduledEmailRequest = await req.json()

    console.log('📧 Sending rescheduled email:', { to, userName, businessName: data?.businessName })

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
    console.log('✅ Rescheduled email sent successfully:', result)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('💥 Error sending rescheduled email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
