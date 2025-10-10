import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Interfaces
interface Business {
  name: string
  address: string
}

interface Employee {
  first_name: string
  last_name: string
  position: string
}

interface Client {
  email: string
  first_name: string
  last_name: string
}

interface Service {
  name: string
  duration_minutes: number
}

export async function POST(request: NextRequest) {
  try {
    const { appointmentId, cancellationReason } = await request.json()

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId es requerido' }, { status: 400 })
    }

    // Service Role Client para bypassear RLS
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

    // Obtener datos de la cita
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        total_price,
        client_id,
        businesses (
          name,
          address
        ),
        employees (
          first_name,
          last_name,
          position
        ),
        users!appointments_client_id_fkey (
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      console.error('Error fetching appointment:', appointmentError)
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    // Validar que el cliente esté registrado (no walk-in)
    if (!appointment.client_id || !appointment.users) {
      console.log('⚠️ Walk-in client detected, skipping email notification')
      return NextResponse.json({
        success: true,
        message: 'Walk-in client, no email sent'
      }, { status: 200 })
    }

    // Obtener servicios de la cita
    const { data: appointmentServices, error: servicesError } = await supabase
      .from('appointment_services')
      .select(`
        service_id,
        price,
        services (
          name,
          duration_minutes
        )
      `)
      .eq('appointment_id', appointmentId)

    if (servicesError || !appointmentServices || appointmentServices.length === 0) {
      console.error('Error fetching appointment services:', servicesError)
      return NextResponse.json({ error: 'Servicios no encontrados' }, { status: 404 })
    }

    // Convertir arrays a objetos individuales
    const service = Array.isArray(appointmentServices[0]?.services)
      ? (appointmentServices[0]?.services[0] as Service)
      : (appointmentServices[0]?.services as Service)

    const business = Array.isArray(appointment.businesses)
      ? (appointment.businesses[0] as Business)
      : (appointment.businesses as Business)

    const employee = Array.isArray(appointment.employees)
      ? (appointment.employees[0] as Employee)
      : (appointment.employees as Employee)

    const client = Array.isArray(appointment.users)
      ? (appointment.users[0] as Client)
      : (appointment.users as Client)

    // Verificar datos necesarios
    if (!business?.name || !service?.name || !employee?.first_name || !client?.email) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 404 })
    }

    // Formatear fecha en español
    const appointmentDate = new Date(appointment.appointment_date + 'T00:00:00')
    const formattedDate = appointmentDate.toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

    // Preparar datos para el email
    const emailData = {
      to: client.email,
      userName: `${client.first_name} ${client.last_name}`,
      data: {
        businessName: business.name,
        businessAddress: business.address || '',
        serviceName: service.name,
        servicePrice: appointmentServices[0].price,
        serviceDuration: service.duration_minutes,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        employeePosition: employee.position || '',
        appointmentDate: capitalizedDate,
        appointmentTime: appointment.start_time.substring(0, 5),
        appointmentEndTime: appointment.end_time.substring(0, 5),
        cancellationReason: cancellationReason || ''
      }
    }

    console.log('📧 Sending cancellation email to:', client.email)

    // Enviar email
    const emailResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-cancellation-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify(emailData)
      }
    )

    if (emailResponse.ok) {
      const result = await emailResponse.json()
      console.log('✅ Cancellation email sent successfully:', result)
      return NextResponse.json({
        success: true,
        message: 'Email de cancelación enviado',
        data: result
      }, { status: 200 })
    } else {
      const errorText = await emailResponse.text()
      console.error('⚠️ Failed to send cancellation email:', errorText)
      // No bloqueamos el flujo si el email falla
      return NextResponse.json({
        success: false,
        message: 'Error al enviar email',
        error: errorText
      }, { status: 200 }) // 200 para no bloquear la operación
    }

  } catch (error) {
    console.error('💥 Error in send-cancellation-notification:', error)
    return NextResponse.json({
      error: 'Error al enviar la notificación',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
