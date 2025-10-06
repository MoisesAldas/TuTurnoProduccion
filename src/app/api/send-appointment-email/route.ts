import { createServerClient } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Definir interfaces para los tipos de datos
interface Business {
  name: string
  address: string
  owner_id: string
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
  phone: string
}

interface Service {
  name: string
  duration_minutes: number
}

export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = await request.json()

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId es requerido' }, { status: 400 })
    }

    // Usar Service Role Client para bypassear RLS
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

    // Obtener todos los datos de la cita con JOINS
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        total_price,
        client_notes,
        client_id,
        business_id,
        employee_id,
        businesses (
          name,
          address,
          owner_id
        ),
        employees (
          first_name,
          last_name,
          position
        ),
        users!appointments_client_id_fkey (
          email,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      console.error('Error fetching appointment:', appointmentError)
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    // Obtener los servicios de la cita
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

    // Preparar datos para el email y convertir los arrays a objetos individuales
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

    // Verificar que todos los datos necesarios estén presentes
    if (!business?.name || !business?.address) {
      return NextResponse.json({ error: 'Datos del negocio no encontrados o incompletos' }, { status: 404 })
    }
    if (!service?.name || !service?.duration_minutes) {
      return NextResponse.json({ error: 'Datos del servicio no encontrados o incompletos' }, { status: 404 })
    }
    if (!employee?.first_name || !employee?.last_name) {
      return NextResponse.json({ error: 'Datos del empleado no encontrados o incompletos' }, { status: 404 })
    }
    if (!client?.email || !client?.first_name || !client?.last_name) {
      return NextResponse.json({ error: 'Datos del cliente no encontrados o incompletos' }, { status: 404 })
    }

    // Formatear la fecha en español
    const appointmentDate = new Date(appointment.appointment_date + 'T00:00:00')
    const formattedDate = appointmentDate.toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Capitalizar primera letra
    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

    // Obtener datos del dueño del negocio
    console.log('🔍 Fetching business owner with owner_id:', business.owner_id)

    const { data: businessOwner, error: ownerError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', business.owner_id)
      .single()

    if (ownerError) {
      console.error('⚠️ Error fetching business owner:', ownerError)
    }

    console.log('👤 Business owner found:', businessOwner ? `${businessOwner.first_name} ${businessOwner.last_name} (${businessOwner.email})` : 'NOT FOUND')

    // 📧 EMAIL 1: Confirmación al CLIENTE (verde)
    const clientEmailData = {
      type: 'appointment_confirmed',
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
        clientNotes: appointment.client_notes || ''
      }
    }

    console.log('📧 Sending appointment confirmation email to CLIENT:', client.email)

    // Enviar email al cliente
    const clientEmailResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-appointment-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify(clientEmailData)
      }
    )

    let clientEmailSuccess = false
    if (clientEmailResponse.ok) {
      const clientResult = await clientEmailResponse.json()
      console.log('✅ Client confirmation email sent successfully:', clientResult)
      clientEmailSuccess = true
    } else {
      const errorText = await clientEmailResponse.text()
      console.error('⚠️ Failed to send client email:', errorText)
    }

    // 📧 EMAIL 2: Notificación al NEGOCIO (naranja)
    let businessEmailSuccess = false
    if (businessOwner) {
      console.log('🏢 Preparing business notification email...')

      const businessEmailData = {
        type: 'appointment_new_business',
        to: businessOwner.email,
        userName: `${businessOwner.first_name} ${businessOwner.last_name}`,
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
          clientNotes: appointment.client_notes || '',
          // Datos del cliente para el negocio
          clientName: `${client.first_name} ${client.last_name}`,
          clientEmail: client.email,
          clientPhone: client.phone || ''
        }
      }

      console.log('📧 Sending new appointment notification to BUSINESS:', businessOwner.email)

      const businessEmailResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-appointment-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify(businessEmailData)
        }
      )

      if (businessEmailResponse.ok) {
        const businessResult = await businessEmailResponse.json()
        console.log('✅ Business notification email sent successfully:', businessResult)
        businessEmailSuccess = true
      } else {
        const errorText = await businessEmailResponse.text()
        console.error('⚠️ Failed to send business email:', errorText)
        console.error('Response status:', businessEmailResponse.status)
      }
    } else {
      console.warn('⚠️ Business owner not found, skipping business notification email')
    }

    return NextResponse.json({
      success: true,
      message: 'Emails enviados',
      details: {
        clientEmail: clientEmailSuccess ? 'sent' : 'failed',
        businessEmail: businessEmailSuccess ? 'sent' : 'failed'
      }
    }, { status: 200 })

  } catch (error) {
    console.error('💥 Error in send-appointment-email API:', error)
    return NextResponse.json({
      error: 'Error al enviar el email de confirmación',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
