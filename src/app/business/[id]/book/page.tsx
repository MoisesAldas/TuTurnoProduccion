'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft, Clock, Calendar as CalendarIcon, User,
  CheckCircle, Loader2, AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  address?: string
  phone?: string
}

interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  position?: string
  avatar_url?: string
}

interface TimeSlot {
  time: string
  available: boolean
}

type BookingStep = 'service' | 'employee' | 'datetime' | 'details' | 'confirmation'

export default function BookingPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Booking state
  const [currentStep, setCurrentStep] = useState<BookingStep>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [clientNotes, setClientNotes] = useState('')

  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { authState } = useAuth()
  const businessId = params.id as string
  const preSelectedServiceId = searchParams.get('service')
  const supabase = createClient()

  useEffect(() => {
    if (businessId) {
      fetchData()
    }
  }, [businessId])

  useEffect(() => {
    if (preSelectedServiceId && services.length > 0) {
      const service = services.find(s => s.id === preSelectedServiceId)
      if (service) {
        setSelectedService(service)
        setCurrentStep('employee')
      }
    }
  }, [preSelectedServiceId, services])

  useEffect(() => {
    if (selectedDate && selectedEmployee && selectedService) {
      generateTimeSlots()
    }
  }, [selectedDate, selectedEmployee, selectedService])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch business
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, address, phone')
        .eq('id', businessId)
        .eq('is_active', true)
        .single()

      if (businessError) {
        console.error('Error fetching business:', businessError)
        router.push('/marketplace')
        return
      }

      setBusiness(businessData)

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name')

      if (!servicesError) {
        console.log('Services data:', servicesData)
        setServices(servicesData || [])
      }

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, position, avatar_url')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('first_name')

      if (!employeesError) {
        setEmployees(employeesData || [])
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateTimeSlots = async () => {
    if (!selectedDate || !selectedEmployee || !selectedService) return

    const slots: TimeSlot[] = []
    const startHour = 9
    const endHour = 18
    const slotDuration = 30 // minutes

    // Format date for database query
    const formatDateForDB = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const selectedDateStr = formatDateForDB(selectedDate)

    try {
      // 1) Ask Postgres to compute availability with RPC
      const businessStart = `${String(startHour).padStart(2,'0')}:00:00`
      const businessEnd = `${String(endHour).padStart(2,'0')}:00:00`

      const { data: rpcSlots, error: rpcError } = await supabase.rpc('get_available_time_slots', {
        p_business_id: businessId,
        p_employee_id: selectedEmployee.id,
        p_date: selectedDateStr,
        p_business_start: businessStart,
        p_business_end: businessEnd,
        p_service_duration_minutes: selectedService.duration_minutes,
        p_slot_step_minutes: slotDuration
      })

      if (rpcError) {
        console.error('Error fetching available slots (RPC):', rpcError)
      }

      // 2) Optionally exclude overlaps with the client's own appointments for that date
      let clientAppointments: any[] = []
      if (authState.user) {
        const { data: clientAppts, error: clientError } = await supabase
          .from('appointments')
          .select('start_time, end_time, status')
          .eq('client_id', authState.user.id)
          .eq('appointment_date', selectedDateStr)
          .in('status', ['confirmed', 'pending', 'in_progress'])

        if (clientError) {
          console.error('Error fetching client appointments:', clientError)
        } else {
          clientAppointments = clientAppts || []
        }
      }

      const filtered = (rpcSlots || []).filter((row: any) => {
        const timeStr: string = row.slot_time ?? row.slot_time?.slot_time // support plain or nested
        if (!timeStr) return false

        const slotStart = new Date(`${selectedDateStr}T${timeStr}`)
        const slotEnd = new Date(slotStart.getTime() + selectedService.duration_minutes * 60000)

        const conflicts = clientAppointments.some(ap => {
          const apStart = new Date(`${selectedDateStr}T${ap.start_time}`)
          const apEnd = new Date(`${selectedDateStr}T${ap.end_time}`)
          return slotStart < apEnd && slotEnd > apStart
        })
        return !conflicts
      })

      const newSlots: TimeSlot[] = filtered.map((row: any) => {
        const t: string = (row.slot_time as string).substring(0,5)
        return { time: t, available: true }
      })

      setAvailableSlots(newSlots)

    } catch (error) {
      console.error('Error generating time slots:', error)
      // Fallback: show all slots as available
      const fallbackSlots: TimeSlot[] = []
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          // Check if service fits within business hours
          const slotStart = new Date(`${selectedDateStr}T${timeString}:00`)
          const slotEnd = new Date(slotStart.getTime() + selectedService.duration_minutes * 60000)
          const slotEndHour = slotEnd.getHours()
          const slotEndMinute = slotEnd.getMinutes()
          const wouldExtendBeyondHours = slotEndHour > endHour || (slotEndHour === endHour && slotEndMinute > 0)

          if (!wouldExtendBeyondHours) {
            fallbackSlots.push({
              time: timeString,
              available: true
            })
          }
        }
      }
      setAvailableSlots(fallbackSlots)
    }
  }

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    setCurrentStep('employee')
  }

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee)
    setCurrentStep('datetime')
  }

  const handleDateTimeConfirm = () => {
    if (selectedDate && selectedTime) {
      setCurrentStep('details')
    }
  }

  // Navigation functions
  const goBackToService = () => {
    setCurrentStep('service')
    setSelectedService(null)
    setSelectedEmployee(null)
    setSelectedDate(undefined)
    setSelectedTime('')
  }

  const goBackToEmployee = () => {
    setCurrentStep('employee')
    setSelectedEmployee(null)
    setSelectedDate(undefined)
    setSelectedTime('')
  }

  const goBackToDateTime = () => {
    setCurrentStep('datetime')
  }

  const handleBookingSubmit = async () => {
    if (!authState.user) {
      router.push('/auth/client/login')
      return
    }

    if (!selectedService || !selectedEmployee || !selectedDate || !selectedTime) {
      return
    }

    try {
      setSubmitting(true)

      // Calcular hora de fin basada en la duración del servicio
      const startTime = selectedTime
      const serviceDuration = selectedService.duration_minutes

      // Verificar que la duración sea válida
      if (!serviceDuration || isNaN(serviceDuration) || serviceDuration <= 0) {
        console.error('Invalid service duration:', serviceDuration, selectedService)
        alert('Error: Duración del servicio no válida. Por favor contacta al negocio.')
        return
      }

      const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
      const endMinutes = startMinutes + serviceDuration
      const endHours = Math.floor(endMinutes / 60)
      const endMins = endMinutes % 60
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`

      // Formatear fecha correctamente sin problemas de zona horaria
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const appointmentData = {
        business_id: businessId,
        client_id: authState.user.id,
        employee_id: selectedEmployee.id,
        appointment_date: formatDateForDB(selectedDate),
        start_time: startTime,
        end_time: endTime,
        total_price: selectedService.price,
        status: 'pending', // Cambiado a pending para evitar problemas con notificaciones
        client_notes: clientNotes || null
      }

      // Crear la cita
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single()

      if (appointmentError) {
        console.error('Error creating appointment:', appointmentError)
        alert('Error al crear la cita. Por favor intenta de nuevo.')
        return
      }

      // Crear la relación con el servicio en appointment_services
      const appointmentServiceData = {
        appointment_id: appointment.id,
        service_id: selectedService.id,
        price: selectedService.price
      }

      const { error: serviceError } = await supabase
        .from('appointment_services')
        .insert([appointmentServiceData])

      if (serviceError) {
        console.error('Error creating appointment service:', serviceError)
        // Si falla, eliminar la cita creada
        await supabase.from('appointments').delete().eq('id', appointment.id)
        alert('Error al crear la cita. Por favor intenta de nuevo.')
        return
      }

      // Intentar confirmar la cita (esto puede fallar por las notificaciones pero no es crítico)
      try {
        await supabase
          .from('appointments')
          .update({ status: 'confirmed' })
          .eq('id', appointment.id)
      } catch (confirmError) {
        console.warn('Warning: Could not auto-confirm appointment, but appointment was created successfully:', confirmError)
        // No es crítico si falla, la cita se creó exitosamente
      }

      // 🔥 ENVIAR EMAIL DE CONFIRMACIÓN DE CITA
      try {
        console.log('📧 Sending appointment confirmation email for appointment:', appointment.id)

        const emailResponse = await fetch('/api/send-appointment-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointmentId: appointment.id
          })
        })

        if (emailResponse.ok) {
          const emailResult = await emailResponse.json()
          console.log('✅ Appointment confirmation email sent:', emailResult)
        } else {
          const errorText = await emailResponse.text()
          console.warn('⚠️ Failed to send appointment confirmation email:', errorText)
          // No bloqueamos el flujo si el email falla
        }
      } catch (emailError) {
        console.warn('⚠️ Error sending appointment confirmation email:', emailError)
        // No bloqueamos el flujo si el email falla
      }

      setCurrentStep('confirmation')

    } catch (error) {
      console.error('Error creating appointment:', error)
      alert('Error al crear la cita. Por favor intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDuration = (minutes: number) => {
    // Verificar que minutes sea un número válido
    if (!minutes || isNaN(minutes) || minutes <= 0) {
      console.warn('Invalid duration:', minutes)
      return 'Duración no especificada'
    }

    if (minutes < 60) {
      return `${minutes} min`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando opciones de reserva...</p>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Negocio no encontrado</h1>
          <p className="text-gray-600 mb-4">No se pudo cargar la información del negocio.</p>
          <Link href="/marketplace">
            <Button>Volver al Marketplace</Button>
          </Link>
        </div>
      </div>
    )
  }

  const stepTitles = {
    service: 'Selecciona un servicio',
    employee: 'Elige tu profesional',
    datetime: 'Fecha y hora',
    details: 'Detalles de la cita',
    confirmation: '¡Reserva confirmada!'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href={`/business/${businessId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al perfil
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Reservar en {business.name}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              {(['service', 'employee', 'datetime', 'details'] as BookingStep[]).map((step, index) => {
                const isActive = currentStep === step
                const isCompleted = ['service', 'employee', 'datetime', 'details'].indexOf(currentStep) > index
                const stepNames = ['Servicio', 'Empleado', 'Fecha', 'Detalles']

                return (
                  <div key={step} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-200 ${
                        isActive
                          ? 'bg-green-600 text-white border-green-600 shadow-lg scale-110'
                          : isCompleted
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-white text-gray-400 border-gray-200'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className={`text-xs mt-2 font-medium ${
                        isActive
                          ? 'text-green-600'
                          : isCompleted
                          ? 'text-green-500'
                          : 'text-gray-400'
                      }`}>
                        {stepNames[index]}
                      </span>
                    </div>
                    {index < 3 && (
                      <div className="mx-4">
                        <ArrowLeft className={`w-4 h-4 rotate-180 ${
                          isCompleted
                            ? 'text-green-500'
                            : 'text-gray-300'
                        }`} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 text-center mt-6">
            {stepTitles[currentStep]}
          </h2>
          {currentStep !== 'service' && (
            <p className="text-gray-500 text-center mt-2 text-sm">
              Puedes volver atrás para cambiar tu selección
            </p>
          )}
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          {/* Service Selection */}
          {currentStep === 'service' && (
            <div className="space-y-6">
              <div className="space-y-4">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedService?.id === service.id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleServiceSelect(service)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-2">
                          {service.name}
                        </h3>
                        {service.description && (
                          <p className="text-gray-600 mb-3">{service.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDuration(service.duration_minutes)}
                            {/* Debug info - remover en producción */}
                            {process.env.NODE_ENV === 'development' && (
                              <span className="ml-2 text-xs text-red-500">
                                (raw: {service.duration_minutes})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatPrice(service.price)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>
          )}

          {/* Employee Selection */}
          {currentStep === 'employee' && (
            <div className="space-y-6">
              {/* Back Button */}
              <div className="flex justify-start">
                <Button
                  variant="ghost"
                  onClick={goBackToService}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 pl-2 pr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a Servicios
                </Button>
              </div>

              <div className="space-y-4">
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900">Servicio seleccionado:</h3>
                <p className="text-green-700">{selectedService?.name} - {formatPrice(selectedService?.price || 0)}</p>
              </div>

              {employees.map((employee) => (
                <Card
                  key={employee.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedEmployee?.id === employee.id ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => handleEmployeeSelect(employee)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                        {employee.avatar_url ? (
                          <img
                            src={employee.avatar_url}
                            alt={`${employee.first_name} ${employee.last_name}`}
                            className="w-full h-full rounded-full object-cover border-2 border-white shadow-md"
                          />
                        ) : (
                          <User className="w-8 h-8 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        {employee.position && (
                          <p className="text-green-600 font-medium">{employee.position}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>
          )}

          {/* Date and Time Selection */}
          {currentStep === 'datetime' && (
            <div className="space-y-6">
              {/* Back Button */}
              <div className="flex justify-start">
                <Button
                  variant="ghost"
                  onClick={goBackToEmployee}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 pl-2 pr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a Empleados
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-green-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-green-900">Servicio:</h4>
                  <p className="text-green-700">{selectedService?.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-green-900">Profesional:</h4>
                  <p className="text-green-700">
                    {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Selecciona una fecha</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      // More explicit approach - create clean date objects for comparison
                      const today = new Date()
                      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                      const checkingDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

                      // Block Sundays (day 0) and dates before today
                      return checkingDateOnly < todayDateOnly || date.getDay() === 0
                    }}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              {selectedDate && (
                <Card>
                  <CardHeader>
                    <CardTitle>Horarios disponibles - {formatDate(selectedDate)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? 'default' : 'outline'}
                          disabled={!slot.available}
                          onClick={() => setSelectedTime(slot.time)}
                          className="h-12"
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                    {availableSlots.length === 0 && (
                      <div className="mt-4 p-4 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-900">
                        <div className="font-medium">El profesional no tiene disponibilidad en esta fecha.</div>
                        <div className="text-sm mt-1">Por favor, intenta con otra fecha u otro profesional.</div>
                      </div>
                    )}
                    {selectedTime && (
                      <div className="mt-6 text-center">
                        <Button onClick={handleDateTimeConfirm} size="lg">
                          Continuar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Booking Details */}
          {currentStep === 'details' && (
            <div className="space-y-6">
              {/* Back Button */}
              <div className="flex justify-start">
                <Button
                  variant="ghost"
                  onClick={goBackToDateTime}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 pl-2 pr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a Fecha y Hora
                </Button>
              </div>
              {/* Booking Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de tu cita</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Servicio</Label>
                      <p className="font-medium">{selectedService?.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Precio</Label>
                      <p className="font-medium">{formatPrice(selectedService?.price || 0)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Profesional</Label>
                      <div className="flex items-center space-x-3 mt-1">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                          {selectedEmployee?.avatar_url ? (
                            <img
                              src={selectedEmployee.avatar_url}
                              alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <p className="font-medium">
                          {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Duración</Label>
                      <p className="font-medium">{formatDuration(selectedService?.duration_minutes || 0)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Fecha</Label>
                      <p className="font-medium">{selectedDate ? formatDate(selectedDate) : ''}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Hora</Label>
                      <p className="font-medium">{selectedTime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Notas adicionales (opcional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="¿Tienes alguna preferencia especial o algo que el profesional deba saber?"
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Confirm Booking */}
              <div className="text-center">
                <Button
                  onClick={handleBookingSubmit}
                  size="lg"
                  disabled={submitting}
                  className="w-full md:w-auto px-8"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar Reserva
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Confirmation */}
          {currentStep === 'confirmation' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  ¡Tu cita ha sido confirmada!
                </h3>
                <p className="text-gray-600 mb-6">
                  Recibirás un email de confirmación con todos los detalles.
                </p>
              </div>

              <Card className="text-left">
                <CardHeader>
                  <CardTitle>Detalles de tu cita</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Negocio:</span>
                    <span className="font-medium">{business.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Servicio:</span>
                    <span className="font-medium">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Profesional:</span>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                        {selectedEmployee?.avatar_url ? (
                          <img
                            src={selectedEmployee.avatar_url}
                            alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <span className="font-medium">
                        {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-medium">{selectedDate ? formatDate(selectedDate) : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hora:</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-green-600">{formatPrice(selectedService?.price || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/dashboard/client" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Ver mis citas
                  </Button>
                </Link>
                <Link href="/marketplace" className="flex-1">
                  <Button className="w-full">
                    Explorar más negocios
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}