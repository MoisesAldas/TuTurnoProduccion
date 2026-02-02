'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ArrowLeft, Clock, Calendar as CalendarIcon, User,
  CheckCircle, Loader2, AlertCircle, Info
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import Logo from '@/components/logo'
import { useEmployeeFiltering } from '@/hooks/useEmployeeFiltering'
import NoEmployeesAvailableAlert from '@/components/booking/NoEmployeesAvailableAlert'
// Client blocking check
import { useClientBookingStatus } from '@/hooks/useClientBookingStatus'
import { BlockedBookingMessage } from '@/components/BlockedBookingMessage'

interface Business {
  id: string
  name: string
  address?: string
  phone?: string
  min_booking_hours: number
  max_booking_days: number
  cancellation_policy_text?: string
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

interface SpecialHour {
  special_date: string
  is_closed: boolean
  open_time: string | null
  close_time: string | null
  reason: string
  description: string | null
}

type BookingStep = 'service' | 'employee' | 'datetime' | 'details' | 'confirmation'

export default function BookingPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]) // Todos los empleados del negocio
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Booking state
  const [currentStep, setCurrentStep] = useState<BookingStep>('service')
  const [selectedServices, setSelectedServices] = useState<Service[]>([]) // Changed to array for multi-selection
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [clientNotes, setClientNotes] = useState('')

  // Booking restrictions (from business settings)
  const [minDate, setMinDate] = useState<Date>(new Date())
  const [maxDate, setMaxDate] = useState<Date>(new Date())

  // Special hours state
  const [specialHourForDate, setSpecialHourForDate] = useState<SpecialHour | null>(null)
  const [checkingSpecialHours, setCheckingSpecialHours] = useState(false)

  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { authState } = useAuth()
  const { toast } = useToast()
  const businessId = params.id as string
  const preSelectedServiceId = searchParams.get('service')
  const supabase = createClient()

  // Check if client is blocked from booking
  const { status: bookingStatus, loading: checkingBlockStatus } = useClientBookingStatus(
    authState?.user?.id || null,
    businessId
  )

  useEffect(() => {
    if (businessId) {
      fetchData()
    }
  }, [businessId])

  useEffect(() => {
    if (preSelectedServiceId && services.length > 0) {
      const service = services.find(s => s.id === preSelectedServiceId)
      if (service) {
        setSelectedServices([service]) // Pre-select as array
        setCurrentStep('employee')
      }
    }
  }, [preSelectedServiceId, services])

  useEffect(() => {
    if (selectedDate) {
      checkSpecialHours(selectedDate)
    } else {
      setSpecialHourForDate(null)
      setAvailableSlots([])
    }
  }, [selectedDate])

  // Memoize total duration calculation (used in multiple places)
  const totalDuration = useMemo(() => {
    return selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0)
  }, [selectedServices])

  // Memoize total price calculation (used in multiple places)
  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, service) => sum + service.price, 0)
  }, [selectedServices])

  useEffect(() => {
    if (selectedDate && selectedEmployee && selectedServices.length > 0) {
      generateTimeSlots()
    }
  }, [selectedDate, selectedEmployee, selectedServices, specialHourForDate])

  // Usar hook de filtrado de empleados
  const {
    filteredEmployees: employees,
    isLoading: loadingEmployees,
    hasNoEmployees
  } = useEmployeeFiltering(selectedServices, allEmployees)

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch business with booking restrictions
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, address, phone, min_booking_hours, max_booking_days, cancellation_policy_text')
        .eq('id', businessId)
        .eq('is_active', true)
        .single()

      if (businessError) {
        console.error('Error fetching business:', businessError)
        router.push('/marketplace')
        return
      }

      setBusiness(businessData)

      // Calculate min and max booking dates based on business settings
      const now = new Date()
      const minBookingHours = businessData.min_booking_hours || 1
      const maxBookingDays = businessData.max_booking_days || 90

      // Minimum date: current time + min_booking_hours
      const calculatedMinDate = new Date()
      calculatedMinDate.setHours(calculatedMinDate.getHours() + minBookingHours)
      setMinDate(calculatedMinDate)

      // Maximum date: today + max_booking_days
      const calculatedMaxDate = new Date()
      calculatedMaxDate.setDate(calculatedMaxDate.getDate() + maxBookingDays)
      setMaxDate(calculatedMaxDate)

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name')

      if (!servicesError) {
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
        setAllEmployees(employeesData || [])
        // No establecer employees aquí - se filtrará por servicios seleccionados
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkSpecialHours = async (date: Date) => {
    if (!businessId) return

    try {
      setCheckingSpecialHours(true)

      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const dateStr = formatDateForDB(date)

      const { data, error } = await supabase
        .from('business_special_hours')
        .select('*')
        .eq('business_id', businessId)
        .eq('special_date', dateStr)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking special hours:', error)
        return
      }

      console.log('✅ [checkSpecialHours] Found special hours:', data)
      setSpecialHourForDate(data)

    } catch (error) {
      console.error('Error checking special hours:', error)
    } finally {
      setCheckingSpecialHours(false)
    }
  }

  const generateTimeSlots = useCallback(async () => {
    if (!selectedDate || !selectedEmployee || selectedServices.length === 0) return

    // Check if business is closed on this date (special hours)
    console.log('🔍 [generateTimeSlots] specialHourForDate:', specialHourForDate)
    if (specialHourForDate?.is_closed) {
      console.log('🚫 [generateTimeSlots] Business is CLOSED, clearing slots')
      setAvailableSlots([])
      return
    }

    // Format date for database query
    const formatDateForDB = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const selectedDateStr = formatDateForDB(selectedDate)

    // ✅ CHECK: Verify if business is closed on this day of week (regular hours)
    const dayOfWeek = selectedDate.getDay() // 0 = Sunday, 1 = Monday, etc.

    let regularHours: { open_time: string; close_time: string } | null = null

    try {
      const { data: businessHours, error: hoursError } = await supabase
        .from('business_hours')
        .select('is_closed, open_time, close_time')
        .eq('business_id', businessId)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle()

      if (hoursError) {
        console.error('Error fetching business hours:', hoursError)
      }

      // If business is closed on this day of week, show no slots
      if (businessHours?.is_closed) {
        setAvailableSlots([])
        return
      }

      // ✅ SAVE: Store regular business hours for later use
      if (businessHours?.open_time && businessHours?.close_time) {
        regularHours = {
          open_time: businessHours.open_time,
          close_time: businessHours.close_time
        }
      }
    } catch (error) {
      console.error('Error checking business hours:', error)
    }

    const slots: TimeSlot[] = []

    // ✅ PRIORITY: 1) Special hours, 2) Regular hours, 3) Default fallback
    let startHour = 9
    let endHour = 18

    if (specialHourForDate && !specialHourForDate.is_closed && specialHourForDate.open_time && specialHourForDate.close_time) {
      // Priority 1: Use special hours if available for this date
      const openTime = specialHourForDate.open_time.split(':')
      const closeTime = specialHourForDate.close_time.split(':')
      startHour = parseInt(openTime[0])
      endHour = parseInt(closeTime[0])
    } else if (regularHours) {
      // Priority 2: Use regular business hours from business_hours table
      const openTime = regularHours.open_time.split(':')
      const closeTime = regularHours.close_time.split(':')
      startHour = parseInt(openTime[0])
      endHour = parseInt(closeTime[0])
    }
    // Priority 3: Default fallback (9 AM - 6 PM) already set above

    const slotDuration = 30 // minutes

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
        p_service_duration_minutes: totalDuration, // Use total duration of all services
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
        const slotEnd = new Date(slotStart.getTime() + totalDuration * 60000)

        // ✅ FILTER: Remove slots that have already passed (respecting min_booking_hours)
        const now = new Date()
        if (slotStart <= now) {
          return false // Slot is in the past
        }

        // Check if slot is before minDate (which includes min_booking_hours buffer)
        if (slotStart < minDate) {
          return false // Too soon to book (violates min_booking_hours)
        }

        // Check for conflicts with client's own appointments
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
      // ⚠️ CRITICAL: If business is closed, don't show fallback slots
      if (specialHourForDate?.is_closed) {
        setAvailableSlots([])
        return
      }
      // Fallback: show all slots as available
      const fallbackSlots: TimeSlot[] = []
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          // Check if service fits within business hours
          const slotStart = new Date(`${selectedDateStr}T${timeString}:00`)
          const slotEnd = new Date(slotStart.getTime() + totalDuration * 60000)
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
  }, [selectedDate, selectedEmployee, selectedServices, specialHourForDate, totalDuration, authState.user, businessId, minDate])

  const handleServiceSelect = (service: Service) => {
    // Toggle service selection
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id)
      if (isSelected) {
        // Remove service
        return prev.filter(s => s.id !== service.id)
      } else {
        // Add service
        return [...prev, service]
      }
    })
  }

  const handleContinueToEmployee = () => {
    if (selectedServices.length > 0) {
      setCurrentStep('employee')
    }
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
    setSelectedServices([])
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

    if (selectedServices.length === 0 || !selectedEmployee || !selectedDate || !selectedTime || !business) {
      return
    }

    // ✅ VALIDATION: Check booking restrictions
    const now = new Date()
    const appointmentDateTime = new Date(selectedDate)
    const [hours, minutes] = selectedTime.split(':').map(Number)
    appointmentDateTime.setHours(hours, minutes, 0, 0)

    // Check min_booking_hours
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntilAppointment < business.min_booking_hours) {
      toast({
        variant: 'destructive',
        title: 'No se puede reservar',
        description: `Debes reservar con al menos ${business.min_booking_hours} hora${business.min_booking_hours !== 1 ? 's' : ''} de anticipación.`,
      })
      return
    }

    // Check max_booking_days
    const daysUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntilAppointment > business.max_booking_days) {
      toast({
        variant: 'destructive',
        title: 'No se puede reservar',
        description: `Solo puedes reservar hasta ${business.max_booking_days} día${business.max_booking_days !== 1 ? 's' : ''} en el futuro.`,
      })
      return
    }
    
    try {
      setSubmitting(true)

      // Use memoized totalDuration and totalPrice
      const startTime = selectedTime

      // Validate total duration
      if (!totalDuration || isNaN(totalDuration) || totalDuration <= 0) {
        console.error('Invalid total service duration:', totalDuration, selectedServices)
        alert('Error: Duración total de servicios no válida. Por favor contacta al negocio.')
        return
      }

      const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
      const endMinutes = startMinutes + totalDuration
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
        total_price: totalPrice, // Total price of all selected services
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

      // Create multiple appointment_services records (one for each selected service)
      const appointmentServicesData = selectedServices.map(service => ({
        appointment_id: appointment.id,
        service_id: service.id,
        price: service.price
      }))

      const { error: servicesError } = await supabase
        .from('appointment_services')
        .insert(appointmentServicesData)

      if (servicesError) {
        console.error('Error creating appointment services:', servicesError)
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
        const emailResponse = await fetch('/api/send-appointment-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointmentId: appointment.id
          })
        })

        if (!emailResponse.ok) {
          console.warn('Failed to send appointment confirmation email')
          // No bloqueamos el flujo si el email falla
        }
      } catch (emailError) {
        console.warn('Error sending appointment confirmation email:', emailError)
        // No bloqueamos el flujo si el email falla
      }

      setCurrentStep('confirmation')

    } catch (error) {
      console.error('Unexpected error in booking process:', error)
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cargando opciones de reserva</h3>
          <p className="text-sm text-gray-600">Preparando servicios y horarios...</p>
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
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Link href={`/business/${businessId}`}>
                <Button variant="ghost" size="sm" className="hover:bg-slate-100 hover:text-slate-900 transition-all duration-200">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al perfil
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-200"></div>
              <Logo color="slate" size="md" />
            </div>
            <div>
            
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Title and Progress */}
        <div className="mb-6">
          {/* Desktop: Only Title */}
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-gray-900">
              {stepTitles[currentStep]}
            </h2>
            {currentStep !== 'service' && (
              <p className="text-gray-500 text-sm mt-1">
                Puedes volver atrás para cambiar tu selección
              </p>
            )}
          </div>

          {/* Mobile: Progress + Title */}
          <div className="lg:hidden">
            <div className="flex items-center justify-center mb-4">
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
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-110'
                            : isCompleted
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
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
                            ? 'text-blue-600'
                            : isCompleted
                            ? 'text-blue-500'
                            : 'text-gray-400'
                        }`}>
                          {stepNames[index]}
                        </span>
                      </div>
                      {index < 3 && (
                        <div className="mx-4">
                          <ArrowLeft className={`w-4 h-4 rotate-180 ${
                            isCompleted
                              ? 'text-blue-500'
                              : 'text-gray-300'
                          }`} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              {stepTitles[currentStep]}
            </h2>
            {currentStep !== 'service' && (
              <p className="text-gray-500 text-center mt-2 text-sm">
                Puedes volver atrás para cambiar tu selección
              </p>
            )}
          </div>
        </div>

        {/* Blocked Booking Message - Show if client is blocked */}
        {bookingStatus?.is_blocked && authState?.user && (
          <div className="mb-6">
            <BlockedBookingMessage
              businessName={business?.name || 'este negocio'}
              businessPhone={business?.phone}
              cancellationsThisMonth={bookingStatus.cancellations_this_month}
              maxAllowed={bookingStatus.max_allowed}
            />
          </div>
        )}

        {/* Step Content - 2 Column Layout on Desktop (except confirmation) */}
        {currentStep === 'confirmation' ? (
          /* Confirmation - Full Width Centered */
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-6 max-w-2xl mx-auto animate-in fade-in zoom-in duration-700">
              {/* Success Icon with Animation */}
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-500 delay-150">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>

              {/* Title and Description */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <h3 className="text-3xl font-bold text-gray-900 mb-3">
                  ¡Tu cita ha sido confirmada!
                </h3>
                <p className="text-gray-600 text-lg">
                  Recibirás un email de confirmación con todos los detalles.
                </p>
              </div>

              {/* Details Card */}
              <Card className="text-left animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                <CardHeader>
                  <CardTitle>Detalles de tu cita</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-gray-600 text-sm font-medium">Negocio:</span>
                    <p className="font-medium text-gray-900 mt-1">{business.name}</p>
                  </div>

                  {/* Services List */}
                  <div>
                    <span className="text-gray-600 text-sm font-medium">
                      Servicios ({selectedServices.length}):
                    </span>
                    <div className="space-y-2 mt-2">
                      {selectedServices.map((service) => (
                        <div key={service.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{service.name}</p>
                            <p className="text-sm text-gray-500">{formatDuration(service.duration_minutes)}</p>
                          </div>
                          <p className="font-semibold text-green-600">{formatPrice(service.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600 text-sm">Fecha:</span>
                      <p className="font-medium text-gray-900 mt-1">
                        {selectedDate ? formatDate(selectedDate) : ''}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Hora:</span>
                      <p className="font-medium text-gray-900 mt-1">{selectedTime}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-lg font-semibold pt-4 border-t">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-green-600">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
                <Link href="/dashboard/client" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Ver mis citas
                  </Button>
                </Link>
                <Link href="/marketplace" className="flex-1">
                  <Button className="w-full bg-slate-900 hover:bg-slate-800">
                    Explorar más negocios
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Main Content - 8/12 width */}
          <div className="lg:col-span-8">
            <div className="max-w-4xl mx-auto lg:mx-0">
              {/* Service Selection */}
          {currentStep === 'service' && (
            <div className="space-y-6">
              {/* Continue Button - Floating at bottom on mobile, fixed position on desktop */}
              {selectedServices.length > 0 && (
                <div className="lg:hidden sticky bottom-4 z-10">
                  <Button
                    onClick={handleContinueToEmployee}
                    disabled={bookingStatus?.is_blocked}
                    className="w-full bg-black hover:bg-neutral-800 text-white shadow-lg hover:shadow-xl h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuar con {selectedServices.length} servicio{selectedServices.length > 1 ? 's' : ''}
                  </Button>
                </div>
              )}

              {/* Service List with Checkboxes - 2 Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {services.map((service) => {
                const isSelected = selectedServices.some(s => s.id === service.id)
                return (
                  <Card
                    key={service.id}
                    className={`cursor-pointer transition-all hover:shadow-md h-full flex flex-col ${
                      isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''
                    } ${bookingStatus?.is_blocked ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                    onClick={() => !bookingStatus?.is_blocked && handleServiceSelect(service)}
                  >
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Checkbox */}
                        <div className="flex items-center pt-1 flex-shrink-0">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>

                        {/* Service Info */}
                        <div className="flex-1 flex flex-col min-h-[120px]">
                          <h3 className="font-semibold text-lg text-gray-900 mb-2">
                            {service.name}
                          </h3>
                          <div className="flex-1">
                            {service.description && (
                              <p className="text-gray-600 text-sm line-clamp-2 mb-3">{service.description}</p>
                            )}
                          </div>
                          
                          {/* Time and Price - Always at bottom - 50% each */}
                          <div className="grid grid-cols-2 gap-3 mt-auto">
                            {/* Duration Badge */}
                            <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 rounded-lg">
                              <Clock className="w-4 h-4 text-slate-600 flex-shrink-0" />
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-slate-500">Duración</span>
                                <span className="text-sm font-medium text-slate-900">
                                  {formatDuration(service.duration_minutes)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Price Badge */}
                            <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 rounded-lg">
                              <div className="flex flex-col items-center flex-1">
                                <span className="text-xs text-slate-400">Precio</span>
                                <span className="text-lg font-bold text-white">
                                  {formatPrice(service.price)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
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
              <div className="lg:hidden mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <h3 className="font-medium text-indigo-900 mb-3">
                  Servicios seleccionados ({selectedServices.length})
                </h3>
                <div className="space-y-2">
                  {selectedServices.map(service => (
                    <div key={service.id} className="flex justify-between items-center">
                      <span className="text-indigo-700">{service.name}</span>
                      <span className="text-indigo-900 font-medium">{formatPrice(service.price)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-indigo-200 flex justify-between font-semibold">
                  <span className="text-indigo-900">Total:</span>
                  <span className="text-indigo-900">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Loading state */}
              {loadingEmployees && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Filtrando empleados disponibles...</p>
                  </div>
                </div>
              )}

              {/* No employees available */}
            {/* No employees available */}
{hasNoEmployees && (
  <NoEmployeesAvailableAlert
    selectedServices={selectedServices}
    onGoBack={goBackToService}
  />
)}
              {/* Employees list */}
              {!loadingEmployees && employees.length > 0 && (
                <div className="space-y-4">
              {employees.map((employee) => (
                <Card
                  key={employee.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedEmployee?.id === employee.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleEmployeeSelect(employee)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                        {employee.avatar_url ? (
                          <img
                            src={employee.avatar_url}
                            alt={`${employee.first_name} ${employee.last_name}`}
                            className="w-full h-full rounded-full object-cover border-2 border-white shadow-md"
                          />
                        ) : (
                          <User className="w-8 h-8 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        {employee.position && (
                          <p className="text-slate-600 font-medium">{employee.position}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
              )}
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

              {/* Continue Button - Floating at bottom on mobile */}
              {selectedDate && selectedTime && (
                <div className="lg:hidden sticky bottom-4 z-10">
                  <Button
                    onClick={handleDateTimeConfirm}
                    className="w-full bg-black hover:bg-neutral-800 text-white shadow-lg hover:shadow-xl h-12"
                  >
                    Continuar
                  </Button>
                </div>
              )}

              {/* Calendar and Time Slots - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendar */}
                <Card>
                  <CardHeader className="hidden lg:block">
                    <CardTitle>Selecciona una fecha</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      defaultMonth={new Date()}
                      locale={{
                        localize: {
                          month: (n: number) => ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][n],
                          day: (n: number) => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][n],
                        },
                        formatLong: {
                          date: () => 'dd/MM/yyyy',
                        },
                      } as any}
                      disabled={(date) => {
                        // Create clean date objects for comparison (date-only, no time)
                        const today = new Date()
                        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                        const checkingDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                        const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
                        const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())

                        // Block dates before minDate (respects min_booking_hours)
                        if (checkingDateOnly < minDateOnly) return true

                        // Block dates after maxDate (respects max_booking_days)
                        if (checkingDateOnly > maxDateOnly) return true

                        return false
                      }}
                      fromYear={new Date().getFullYear()}
                      toYear={new Date().getFullYear() + 5}
                      className="rounded-md border shadow-sm mx-auto"
                      captionLayout="dropdown"
                    />
                  </CardContent>
                </Card>

                {/* Time Slots */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedDate ? `Horarios - ${formatDate(selectedDate)}` : 'Selecciona una fecha primero'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!selectedDate ? (
                      <div className="text-center py-12 text-gray-500">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>Selecciona una fecha para ver los horarios disponibles</p>
                      </div>
                    ) : (
                      <>
                        {/* Special Hours Alerts */}
                        {specialHourForDate && specialHourForDate.is_closed && (
                          <Alert className="bg-red-50 border-red-200 mb-4">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertTitle className="text-red-900 font-semibold">Negocio cerrado</AlertTitle>
                            <AlertDescription className="text-red-700 text-sm">
                              {specialHourForDate.description || `El negocio estará cerrado este día (${
                                specialHourForDate.reason === 'holiday' ? 'Feriado' :
                                specialHourForDate.reason === 'special_event' ? 'Evento Especial' :
                                specialHourForDate.reason === 'maintenance' ? 'Mantenimiento' :
                                'Día especial'
                              }).`}
                              <br />
                              <span className="font-medium">Por favor selecciona otra fecha.</span>
                            </AlertDescription>
                          </Alert>
                        )}

                        {specialHourForDate && !specialHourForDate.is_closed && specialHourForDate.open_time && specialHourForDate.close_time && (
                          <Alert className="bg-blue-50 border-blue-200 mb-4">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-blue-900 font-semibold">Horario especial</AlertTitle>
                            <AlertDescription className="text-blue-700 text-sm">
                              {specialHourForDate.description && (
                                <>
                                  {specialHourForDate.description}
                                  <br />
                                </>
                              )}
                              <span className="font-medium">
                                Horario de atención: {specialHourForDate.open_time.substring(0, 5)} - {specialHourForDate.close_time.substring(0, 5)}
                              </span>
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Time Slots Grid or Empty State */}
                        {!specialHourForDate?.is_closed && availableSlots.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-2">
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
                        ) : !specialHourForDate?.is_closed && (
                          <Alert className="bg-yellow-50 border-yellow-200">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertTitle className="text-yellow-900 font-semibold">Sin horarios disponibles</AlertTitle>
                            <AlertDescription className="text-yellow-700 text-sm">
                              El profesional no tiene disponibilidad en esta fecha.
                              <br />
                              <span className="font-medium">Por favor, intenta con otra fecha.</span>
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
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

              {/* Cancellation Policy Card - Mobile Only */}
              {business?.cancellation_policy_text && (
                <Card className="bg-blue-50 border-blue-200 lg:hidden">
                  <CardHeader>
                    <CardTitle className="text-base text-blue-900">Política de cancelación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-blue-700">{business.cancellation_policy_text}</p>
                  </CardContent>
                </Card>
              )}

              {/* Booking Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de tu cita</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Services */}
                  {selectedServices.map((service) => (
                    <div key={service.id} className="flex justify-between items-start pb-3 border-b">
                      <div className="flex-1">
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-gray-500">({formatDuration(service.duration_minutes)})</p>
                      </div>
                      <p className="font-semibold">{formatPrice(service.price)}</p>
                    </div>
                  ))}

                  {/* Professional and Time */}
                  <div className="flex justify-between items-center pb-3 border-b">
                    <div className="flex-1">
                      <p className="font-medium uppercase text-sm">
                        {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                      </p>
                    </div>
                    <p className="font-medium">{selectedTime}</p>
                  </div>

                  {/* Date */}
                  <div className="flex justify-between items-center pb-3 border-b">
                    <p className="font-medium">{selectedDate ? formatDate(selectedDate) : ''}</p>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2">
                    <p className="font-semibold">Total ({formatDuration(totalDuration)})</p>
                    <p className="text-xl font-bold">{formatPrice(totalPrice)}</p>
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
                  disabled={submitting || bookingStatus?.is_blocked}
                  className="w-full md:w-auto px-8 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
          
          </div>
          
        
        
        

          {/* Sidebar - Summary (Desktop Only) - 4/12 width */}
          <div className="hidden lg:block lg:col-span-4">
              <div className="sticky top-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumen de Reserva</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* Services */}
                    {selectedServices.length > 0 && (
                      <div >
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          Servicios ({selectedServices.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedServices.map(service => (
                            <div key={service.id} className="flex justify-between text-sm">
                              <span className="text-gray-700">{service.name}</span>
                              <span className="font-medium text-gray-900">{formatPrice(service.price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Employee */}
                    {selectedEmployee && (
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          Profesional
                        </h4>
                        <p className="text-sm text-gray-700">
                          {selectedEmployee.first_name} {selectedEmployee.last_name}
                        </p>
                      </div>
                    )}

                    {/* Date & Time */}
                    {selectedDate && selectedTime && (
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          Fecha y Hora
                        </h4>
                        <p className="text-sm text-gray-700">
                          {selectedDate.toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedTime}</p>
                      </div>
                    )}

                    {/* Total */}
                    {selectedServices.length > 0 && (
                      <div className="pt-4 border-t-2 border-slate-200">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900">Total</span>
                          <span className="text-2xl font-bold text-slate-900">{formatPrice(totalPrice)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Duración: {formatDuration(totalDuration)}
                        </p>
                      </div>
                    )}

                    {/* Booking Policies */}
                    {business && (business.min_booking_hours > 0 || business.max_booking_days < 365) && (
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Info className="w-4 h-4 text-blue-600" />
                          Políticas de Reserva
                        </h4>
                        <div className="space-y-2 text-xs text-gray-600">
                          {business.min_booking_hours > 0 && (
                            <p className="flex items-start gap-2">
                              <span className="text-blue-600 mt-0.5">•</span>
                              <span>Reserva con al menos <strong className="text-gray-900">{business.min_booking_hours}h</strong> de anticipación</span>
                            </p>
                          )}
                          {business.max_booking_days < 365 && (
                            <p className="flex items-start gap-2">
                              <span className="text-blue-600 mt-0.5">•</span>
                              <span>Hasta <strong className="text-gray-900">{business.max_booking_days} días</strong> en el futuro</span>
                            </p>
                          )}
                          {business.cancellation_policy_text && (
                            <p className="flex items-start gap-2">
                              <span className="text-blue-600 mt-0.5">•</span>
                              <span>{business.cancellation_policy_text}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Continue Button - Only show on service/datetime steps */}
                    {(currentStep === 'service' || currentStep === 'datetime') && selectedServices.length > 0 && (
                      <div className="pt-4 border-t-2 border-slate-200">
                        <Button
                          onClick={() => {
                            if (currentStep === 'service') handleContinueToEmployee()
                            else if (currentStep === 'datetime') handleDateTimeConfirm()
                          }}
                          disabled={currentStep === 'datetime' && (!selectedDate || !selectedTime)}
                          className="w-full bg-black hover:bg-neutral-800 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed h-12"
                        >
                          Continuar →
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
            </div>
          </div>
        </div>


                  )}
                  
    </div>
    
    </div>

    
  )}
