const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:3000';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const getEmailTemplate = (type, userName, data)=>{
  const isBusinessOwner = data?.userType === 'business_owner';
  // Colores dinámicos según tipo de usuario
  const gradient = isBusinessOwner ? 'linear-gradient(135deg, #ea580c 0%, #f59e0b 50%, #eab308 100%)' // Orange/Amber/Yellow para negocios
   : 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)' // Emerald/Teal/Cyan para clientes
  ;
  const badgeColor = isBusinessOwner ? '#ea580c' : '#059669';
  const buttonColor = isBusinessOwner ? '#ea580c' : '#059669';
  const buttonHoverColor = isBusinessOwner ? '#c2410c' : '#047857';
  switch(type){
    case 'welcome_google':
      const badge = isBusinessOwner ? 'CUENTA DE NEGOCIO CREADA' : 'REGISTRO EXITOSO CON GOOGLE';
      const title = isBusinessOwner ? '¡Bienvenido a TuTurno Business!' : '¡Bienvenido a TuTurno!';
      const message = isBusinessOwner ? 'Tu cuenta de negocio está lista. Puedes comenzar a gestionar tus citas, empleados y clientes desde tu panel de administración.' : 'Tu cuenta está lista. Explora negocios, reserva citas y gestiona tus servicios favoritos en un solo lugar.';
      const ctaText = isBusinessOwner ? '🏢 Ir a mi Panel de Negocio' : '🎯 Ir a mi Dashboard';
      const ctaLink = data?.redirectUrl ? `${SITE_URL}${data.redirectUrl}` : SITE_URL;
      const features = isBusinessOwner ? [
        {
          icon: '📅',
          title: 'Gestión de Citas',
          desc: 'Administra todas tus reservas en tiempo real'
        },
        {
          icon: '👥',
          title: 'Empleados',
          desc: 'Configura horarios y ausencias de tu equipo'
        },
        {
          icon: '💼',
          title: 'Servicios',
          desc: 'Crea y gestiona tu catálogo de servicios'
        },
        {
          icon: '📊',
          title: 'Estadísticas',
          desc: 'Visualiza métricas de tu negocio'
        }
      ] : [
        {
          icon: '🔍',
          title: 'Descubre Negocios',
          desc: 'Encuentra los mejores servicios cerca de ti'
        },
        {
          icon: '📅',
          title: 'Reserva Fácil',
          desc: 'Agenda citas en segundos'
        },
        {
          icon: '🔔',
          title: 'Recordatorios',
          desc: 'Recibe notificaciones de tus reservas'
        },
        {
          icon: '⭐',
          title: 'Favoritos',
          desc: 'Guarda tus negocios preferidos'
        }
      ];
      return {
        subject: isBusinessOwner ? '¡Tu negocio en TuTurno está listo!' : '¡Bienvenido a TuTurno!',
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Container principal -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">

          <!-- Header con gradiente -->
          <tr>
            <td style="background: ${gradient}; padding: 40px 32px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); padding: 8px 20px; border-radius: 20px; margin-bottom: 20px;">
                <span style="color: #ffffff; font-size: 12px; font-weight: 600; letter-spacing: 1px;">${badge}</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; line-height: 1.2;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Contenido principal -->
          <tr>
            <td style="padding: 40px 32px;">
              <p style="margin: 0 0 24px 0; color: #111827; font-size: 18px; line-height: 1.6;">
                Hola <strong>${userName}</strong>,
              </p>

              <p style="margin: 0 0 32px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${message}
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 40px;">
                <tr>
                  <td align="center">
                    <a href="${ctaLink}" style="display: inline-block; background: ${gradient}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: transform 0.2s;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Features grid -->
              <div style="background: linear-gradient(135deg, ${isBusinessOwner ? '#fff7ed' : '#ecfdf5'} 0%, ${isBusinessOwner ? '#fffbeb' : '#f0fdfa'} 100%); border-radius: 12px; padding: 32px 24px; margin-bottom: 32px;">
                <h2 style="margin: 0 0 24px 0; color: #111827; font-size: 20px; font-weight: 600; text-align: center;">
                  ${isBusinessOwner ? '¿Qué puedes hacer ahora?' : 'Funcionalidades destacadas'}
                </h2>

                <table width="100%" cellpadding="0" cellspacing="0">
                  ${features.map((feature, index)=>`
                    <tr>
                      <td style="padding: ${index > 0 ? '16px 0 0 0' : '0'};">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="40" valign="top" style="padding-right: 16px;">
                              <div style="width: 40px; height: 40px; background-color: rgba(${isBusinessOwner ? '234, 88, 12' : '5, 150, 105'}, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                                ${feature.icon}
                              </div>
                            </td>
                            <td valign="top">
                              <h3 style="margin: 0 0 4px 0; color: #111827; font-size: 16px; font-weight: 600;">
                                ${feature.title}
                              </h3>
                              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                                ${feature.desc}
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  `).join('')}
                </table>
              </div>

              <!-- Ayuda -->
              <div style="background-color: #f9fafb; border-left: 4px solid ${badgeColor}; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                  💡 Consejo profesional
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  ${isBusinessOwner ? 'Completa tu perfil de negocio y configura tus servicios para empezar a recibir reservas.' : 'Explora el marketplace y descubre negocios cerca de ti para hacer tu primera reserva.'}
                </p>
              </div>

              <!-- Footer info -->
              <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                Si tienes alguna pregunta, no dudes en contactarnos. Estamos aquí para ayudarte.
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
      };
    default:
      return {
        subject: 'Notificación de TuTurno',
        html: '<p>Email genérico</p>'
      };
  }
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { type, to, userName, data } = await req.json();
    console.log('📧 Sending email:', {
      type,
      to,
      userName,
      userType: data?.userType
    });
    const emailTemplate = getEmailTemplate(type, userName || to.split('@')[0], data);
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'TuTurno <bienvenida@turnoapp.org>',
        to: [
          to
        ],
        subject: emailTemplate.subject,
        html: emailTemplate.html
      })
    });
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('❌ Resend API error:', errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }
    const result = await emailResponse.json();
    console.log('✅ Email sent successfully:', result);
    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('💥 Error sending email:', error);
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
