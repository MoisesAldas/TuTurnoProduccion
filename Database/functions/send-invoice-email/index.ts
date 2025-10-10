const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:3000'

interface InvoiceEmailRequest {
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
    // Datos de la factura
    invoiceNumber: string // "INV-2025-0001"
    invoiceDate: string // Formato: "15 de enero de 2025"
    subtotal: number
    tax: number
    discount: number
    total: number
    // Datos del pago
    paymentMethod: 'cash' | 'transfer'
    paymentAmount: number
    transferReference?: string // Solo si paymentMethod === 'transfer'
    paymentDate: string
    // Servicios (puede ser multiple)
    services?: Array<{
      name: string
      price: number
      duration: number
    }>
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

const getPaymentMethodLabel = (method: string) => {
  return method === 'cash' ? '💵 Efectivo' : '💳 Transferencia'
}

const getEmailTemplate = (userName: string, data: any) => {
  const invoiceGradient = 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)'
  const invoiceColor = '#059669'

  return {
    subject: `Factura ${data.invoiceNumber} - ${data.businessName}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura - TuTurno</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Container principal -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

          <!-- Header con gradiente verde -->
          <tr>
            <td style="background: ${invoiceGradient}; padding: 40px 32px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); padding: 8px 20px; border-radius: 20px; margin-bottom: 20px;">
                <span style="color: #ffffff; font-size: 12px; font-weight: 600; letter-spacing: 1px;">✅ PAGO COMPLETADO</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; line-height: 1.2;">
                Factura ${data.invoiceNumber}
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
                Gracias por tu pago. Tu servicio ha sido completado exitosamente. A continuación encontrarás los detalles de tu factura:
              </p>

              <!-- Información de la factura -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                  <table width="100%" cellpadding="8" cellspacing="0">
                    <tr>
                      <td style="color: #6b7280; font-size: 13px; width: 50%;">Número de Factura:</td>
                      <td style="color: #111827; font-size: 13px; font-weight: 600; text-align: right;"> ${data.invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td style="color: #6b7280; font-size: 13px;">Fecha de Emisión:</td>
                      <td style="color: #111827; font-size: 13px; font-weight: 600; text-align: right;">${data.invoiceDate}</td>
                    </tr>
                    <tr>
                      <td style="color: #6b7280; font-size: 13px;">Método de Pago:</td>
                      <td style="color: #111827; font-size: 13px; font-weight: 600; text-align: right;">${getPaymentMethodLabel(data.paymentMethod)}</td>
                    </tr>
                    ${data.paymentMethod === 'transfer' && data.transferReference ? `
                    <tr>
                      <td style="color: #6b7280; font-size: 13px;">Ref. Transferencia:</td>
                      <td style="color: #111827; font-size: 13px; font-weight: 600; text-align: right; font-family: 'Courier New', monospace;">${data.transferReference}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="color: #6b7280; font-size: 13px;">Fecha de Pago:</td>
                      <td style="color: #111827; font-size: 13px; font-weight: 600; text-align: right;">${data.paymentDate}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <!-- Detalles de la cita -->
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid ${invoiceColor};">
                <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 18px; font-weight: 600;">
                  📅 Detalles del Servicio
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
                    <td style="color: #6b7280; font-size: 14px; font-weight: 500;">Profesional:</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600;">
                      ${data.employeeName}${data.employeePosition ? ` - ${data.employeePosition}` : ''}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Servicios y Costos -->
              <div style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 600;">
                  📋 Servicios
                </h3>

                <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse: collapse;">
                  ${data.services && data.services.length > 0 ? data.services.map((service: any, index: number) => `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="color: #111827; font-size: 14px; font-weight: 500; padding: 12px 0;">
                        ${service.name}
                        <span style="display: block; color: #6b7280; font-size: 12px; font-weight: 400; margin-top: 4px;">
                          ${formatDuration(service.duration)}
                        </span>
                      </td>
                      <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right; padding: 12px 0;">
                        ${formatPrice(service.price)}
                      </td>
                    </tr>
                  `).join('') : `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="color: #111827; font-size: 14px; font-weight: 500; padding: 12px 0;">
                        ${data.serviceName}
                        <span style="display: block; color: #6b7280; font-size: 12px; font-weight: 400; margin-top: 4px;">
                          ${formatDuration(data.serviceDuration)}
                        </span>
                      </td>
                      <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right; padding: 12px 0;">
                        ${formatPrice(data.servicePrice)}
                      </td>
                    </tr>
                  `}

                  <!-- Subtotal -->
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="color: #6b7280; font-size: 14px; padding: 12px 0;">Subtotal:</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right; padding: 12px 0;">
                      ${formatPrice(data.subtotal)}
                    </td>
                  </tr>

                  ${data.tax > 0 ? `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="color: #6b7280; font-size: 14px; padding: 12px 0;">IVA:</td>
                    <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right; padding: 12px 0;">
                      ${formatPrice(data.tax)}
                    </td>
                  </tr>
                  ` : ''}

                  ${data.discount > 0 ? `
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="color: #dc2626; font-size: 14px; padding: 12px 0;">Descuento:</td>
                    <td style="color: #dc2626; font-size: 14px; font-weight: 600; text-align: right; padding: 12px 0;">
                      -${formatPrice(data.discount)}
                    </td>
                  </tr>
                  ` : ''}

                  <!-- Total -->
                  <tr>
                    <td style="color: #111827; font-size: 18px; font-weight: 700; padding: 16px 0 0 0;">
                      TOTAL PAGADO:
                    </td>
                    <td style="color: ${invoiceColor}; font-size: 24px; font-weight: 700; text-align: right; padding: 16px 0 0 0;">
                      ${formatPrice(data.total)}
                    </td>
                  </tr>
                </table>
              </div>

              ${data.businessAddress ? `
              <!-- Información del negocio -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
                <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 600;">
                  📍 Datos del Negocio
                </h3>
                <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                  ${data.businessName}
                </p>
                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                  ${data.businessAddress}
                </p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${SITE_URL}/dashboard/client/appointments" style="display: inline-block; background: ${invoiceGradient}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                      Ver mis citas
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Mensaje de agradecimiento -->
              <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                  💙 ¡Gracias por tu preferencia!
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  Esperamos que hayas disfrutado de nuestro servicio. Nos encantaría volver a atenderte pronto.
                </p>
              </div>

              <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                Esta factura ha sido generada automáticamente. Guarda este email como comprobante de pago.
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
    const { to, userName, data }: InvoiceEmailRequest = await req.json()

    console.log('📧 Sending invoice email:', { to, userName, invoiceNumber: data?.invoiceNumber })

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
    console.log('✅ Invoice email sent successfully:', result)

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('💥 Error sending invoice email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
