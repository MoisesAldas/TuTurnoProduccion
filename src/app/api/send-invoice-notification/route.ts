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

interface Invoice {
  invoice_number: string
  subtotal: number
  tax: number
  discount: number
  total: number
  created_at: string
}

interface Payment {
  payment_method: 'cash' | 'transfer'
  amount: number
  transfer_reference?: string
  payment_date: string
}

export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = await request.json()

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

    // Obtener la factura
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('invoice_number, subtotal, tax, discount, total, created_at')
      .eq('appointment_id', appointmentId)
      .single()

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError)
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    // Obtener el pago más reciente de la factura
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('id')
      .eq('appointment_id', appointmentId)
      .single()

    let payment: Payment | null = null
    if (invoiceData) {
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('payment_method, amount, transfer_reference, payment_date')
        .eq('invoice_id', invoiceData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!paymentError && paymentData) {
        payment = paymentData
      }
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

    // Formatear fechas en español
    const appointmentDate = new Date(appointment.appointment_date + 'T00:00:00')
    const formattedAppointmentDate = appointmentDate.toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const capitalizedAppointmentDate = formattedAppointmentDate.charAt(0).toUpperCase() + formattedAppointmentDate.slice(1)

    const invoiceDate = new Date(invoice.created_at)
    const formattedInvoiceDate = invoiceDate.toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const capitalizedInvoiceDate = formattedInvoiceDate.charAt(0).toUpperCase() + formattedInvoiceDate.slice(1)

    const paymentDate = payment?.payment_date
      ? new Date(payment.payment_date).toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : capitalizedInvoiceDate

    // Preparar servicios para el email
    const services = appointmentServices.map((as: any) => {
      const svc = Array.isArray(as.services) ? as.services[0] : as.services
      return {
        name: svc.name,
        price: as.price,
        duration: svc.duration_minutes
      }
    })

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
        appointmentDate: capitalizedAppointmentDate,
        appointmentTime: appointment.start_time.substring(0, 5),
        appointmentEndTime: appointment.end_time.substring(0, 5),
        // Datos de la factura
        invoiceNumber: invoice.invoice_number,
        invoiceDate: capitalizedInvoiceDate,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        discount: invoice.discount,
        total: invoice.total,
        // Datos del pago
        paymentMethod: payment?.payment_method || 'cash',
        paymentAmount: payment?.amount || invoice.total,
        transferReference: payment?.transfer_reference || '',
        paymentDate,
        // Servicios múltiples
        services
      }
    }

    console.log('📧 Sending invoice email to:', client.email)
    console.log('📄 Invoice number:', invoice.invoice_number)

    // Enviar email
    const emailResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invoice-email`,
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
      console.log('✅ Invoice email sent successfully:', result)
      return NextResponse.json({
        success: true,
        message: 'Email de factura enviado',
        data: result
      }, { status: 200 })
    } else {
      const errorText = await emailResponse.text()
      console.error('⚠️ Failed to send invoice email:', errorText)
      // No bloqueamos el flujo si el email falla
      return NextResponse.json({
        success: false,
        message: 'Error al enviar email',
        error: errorText
      }, { status: 200 }) // 200 para no bloquear la operación
    }

  } catch (error) {
    console.error('💥 Error in send-invoice-notification:', error)
    return NextResponse.json({
      error: 'Error al enviar la notificación',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
