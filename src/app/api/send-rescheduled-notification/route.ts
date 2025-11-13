import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Interfaces
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

interface ChangeData {
  oldDate?: string
  oldTime?: string
  oldEndTime?: string
  oldEmployeeId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { appointmentId, changes } = await request.json()

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId es requerido' }, { status: 400 })
    }

    if (!changes) {
      return NextResponse.json({ error: 'changes es requerido' }, { status: 400 })
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

    // Obtener datos NUEVOS de la cita (después del cambio)
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        end_time,
        total_price,
        client_id,
        employee_id,
        business_id,
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

    const newEmployee = Array.isArray(appointment.employees)
      ? (appointment.employees[0] as Employee)
      : (appointment.employees as Employee)

    const client = Array.isArray(appointment.users)
      ? (appointment.users[0] as Client)
      : (appointment.users as Client)

    // Verificar datos necesarios
    if (!business?.name || !service?.name || !newEmployee?.first_name || !client?.email) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 404 })
    }

    // Obtener datos del empleado VIEJO si cambió
    let oldEmployee: Employee | null = null
    if (changes.oldEmployeeId && changes.oldEmployeeId !== appointment.employee_id) {
      const { data: oldEmp, error: oldEmpError } = await supabase
        .from('employees')
        .select('first_name, last_name, position')
        .eq('id', changes.oldEmployeeId)
        .single()

      if (!oldEmpError && oldEmp) {
        oldEmployee = oldEmp
      }
    }

    // Formatear fechas en español
    const formatDateToSpanish = (dateStr: string) => {
      const date = new Date(dateStr + 'T00:00:00')
      const formatted = date.toLocaleDateString('es-EC', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    }

    const newAppointmentDate = formatDateToSpanish(appointment.appointment_date)
    const oldAppointmentDate = changes.oldDate ? formatDateToSpanish(changes.oldDate) : newAppointmentDate

    // Determinar qué cambió
    const dateChanged = changes.oldDate && changes.oldDate !== appointment.appointment_date
    const timeChanged = changes.oldTime && changes.oldTime !== appointment.start_time
    const employeeChanged = oldEmployee !== null

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
        // Datos NUEVOS
        newAppointmentDate,
        newAppointmentTime: appointment.start_time.substring(0, 5),
        newAppointmentEndTime: appointment.end_time.substring(0, 5),
        newEmployeeName: `${newEmployee.first_name} ${newEmployee.last_name}`,
        newEmployeePosition: newEmployee.position || '',
        // Datos VIEJOS
        oldAppointmentDate,
        oldAppointmentTime: changes.oldTime?.substring(0, 5) || appointment.start_time.substring(0, 5),
        oldAppointmentEndTime: changes.oldEndTime?.substring(0, 5) || appointment.end_time.substring(0, 5),
        oldEmployeeName: oldEmployee
          ? `${oldEmployee.first_name} ${oldEmployee.last_name}`
          : `${newEmployee.first_name} ${newEmployee.last_name}`,
        oldEmployeePosition: oldEmployee?.position || newEmployee.position || '',
        // Indicadores de cambio
        dateChanged,
        timeChanged,
        employeeChanged
      }
    }

    console.log('📧 Sending rescheduled email to CLIENT:', client.email)
    console.log('📊 Changes:', { dateChanged, timeChanged, employeeChanged })

    // EMAIL 1: Enviar email al CLIENTE
    const emailResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-rescheduled-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify(emailData)
      }
    )

    let clientEmailSuccess = false
    if (emailResponse.ok) {
      const result = await emailResponse.json()
      console.log('✅ Client rescheduled email sent successfully:', result)
      clientEmailSuccess = true
    } else {
      const errorText = await emailResponse.text()
      console.error('⚠️ Failed to send client email:', errorText)
    }

    // EMAIL 2: Enviar notificación al NEGOCIO
    let businessEmailSuccess = false

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

    if (businessOwner) {
      console.log('📧 Sending rescheduled notification to BUSINESS:', businessOwner.email)

      const businessEmailData = {
        to: businessOwner.email,
        userName: `${businessOwner.first_name} ${businessOwner.last_name}`,
        data: {
          businessName: business.name,
          businessAddress: business.address || '',
          serviceName: service.name,
          servicePrice: appointmentServices[0].price,
          serviceDuration: service.duration_minutes,
          // NEW data
          newAppointmentDate,
          newAppointmentTime: appointment.start_time.substring(0, 5),
          newAppointmentEndTime: appointment.end_time.substring(0, 5),
          newEmployeeName: `${newEmployee.first_name} ${newEmployee.last_name}`,
          newEmployeePosition: newEmployee.position || '',
          // OLD data
          oldAppointmentDate,
          oldAppointmentTime: changes.oldTime?.substring(0, 5) || appointment.start_time.substring(0, 5),
          oldAppointmentEndTime: changes.oldEndTime?.substring(0, 5) || appointment.end_time.substring(0, 5),
          oldEmployeeName: oldEmployee ? `${oldEmployee.first_name} ${oldEmployee.last_name}` : `${newEmployee.first_name} ${newEmployee.last_name}`,
          oldEmployeePosition: oldEmployee ? (oldEmployee.position || '') : (newEmployee.position || ''),
          // Change indicators
          dateChanged,
          timeChanged,
          employeeChanged,
          // Client info
          clientName: `${client.first_name} ${client.last_name}`,
          clientEmail: client.email,
          clientPhone: client.phone || ''
        }
      }

      const businessEmailResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-rescheduled-business-notification`,
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
      }
    } else {
      console.warn('⚠️ Business owner not found, skipping business notification email')
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Notificaciones enviadas',
      details: {
        clientEmail: clientEmailSuccess ? 'sent' : 'failed',
        businessEmail: businessEmailSuccess ? 'sent' : 'failed'
      }
    }, { status: 200 })

  } catch (error) {
    console.error('💥 Error in send-rescheduled-notification:', error)
    return NextResponse.json({
      error: 'Error al enviar la notificación',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
