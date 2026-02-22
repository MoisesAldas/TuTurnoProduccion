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

const stepTitles = {
  service: 'Selecciona un servicio',
  employee: 'Elige tu profesional',
  datetime: 'Fecha y hora',
  details: 'Detalles de la cita',
  confirmation: '¡Reserva confirmada!'
}

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

  const [isOpenToday, setIsOpenToday] = useState<boolean>(false)
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
      }

      // ✅ Check if business is open TODAY
      const dayOfWeek = now.getDay()
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      const todayStr = formatDateForDB(now)

      // Check special hours first
      const { data: specialToday } = await supabase
        .from('business_special_hours')
        .select('is_closed')
        .eq('business_id', businessId)
        .eq('special_date', todayStr)
        .maybeSingle()

      if (specialToday?.is_closed) {
        setIsOpenToday(false)
      } else {
        // Check regular hours
        const { data: regularToday } = await supabase
          .from('business_hours')
          .select('is_closed')
          .eq('business_id', businessId)
          .eq('day_of_week', dayOfWeek)
          .maybeSingle()
        
        setIsOpenToday(regularToday ? !regularToday.is_closed : false)
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

  // Adaptive font size based on text length
  const getAdaptiveFontSize = (text: string, type: 'title' | 'small' = 'title') => {
    const len = text.length
    if (type === 'title') {
      if (len > 30) return 'text-xl sm:text-2xl lg:text-3xl'
      if (len > 20) return 'text-2xl sm:text-3xl lg:text-4xl'
      return 'text-2xl sm:text-3xl lg:text-4xl'
    }
    // For smaller elements
    if (len > 50) return 'text-[10px] sm:text-xs'
    if (len > 30) return 'text-xs sm:text-sm'
    return 'text-sm'
  }

  const stepTitleFontSize = getAdaptiveFontSize(stepTitles[currentStep] || '', 'title')

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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Cargando opciones de reserva</h3>
          <p className="text-sm text-slate-500">Preparando servicios y horarios...</p>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-950 mb-2 tracking-tight">Negocio no encontrado</h1>
          <p className="text-slate-500 mb-6">No se pudo cargar la información del negocio.</p>
          <Link href="/marketplace">
            <Button className="bg-slate-950 hover:bg-slate-900 text-white rounded-xl px-8 h-12 font-bold transition-all">
              Volver al Marketplace
            </Button>
          </Link>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Glassmorphism Premium (Consistent with Business Profile) */}
      <header className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200/40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 lg:py-2.5">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href={`/business/${businessId}`}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 -ml-2 h-9 sm:h-10 px-2 sm:px-3 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Perfil del negocio</span>
                </Button>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-slate-200/60"></div>
              <Logo color="slate" size="sm" className="sm:hidden" />
              <Logo color="slate" size="md" className="hidden sm:block" />
            </div>
          </div>
        </div>
        
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Title and Progress */}
        <div className="mb-10 lg:mb-7">
          <div className="flex flex-col gap-1.5 lg:pl-6 relative">
            {/* Accent Bar */}
            <div className="hidden lg:block absolute left-0 top-0 w-1.5 h-full bg-gradient-to-b from-slate-800 to-slate-950 rounded-full shadow-[0_0_12px_rgba(2,6,23,0.12)]" />
            
            <span className="text-[10px] items-center uppercase tracking-[0.3em] font-black text-slate-400">
              Paso {(['service', 'employee', 'datetime', 'details', 'confirmation'].indexOf(currentStep) + 1)} de 4
            </span>
            <h4 className={`${stepTitleFontSize} font-black mt-2 tracking-tighter text-slate-950 leading-[1.1] py-1 break-words`}>
              {stepTitles[currentStep]}
            </h4>
            {currentStep !== 'service' && currentStep !== 'confirmation' && (
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">
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
          <div className="flex items-center justify-center min-h-[70vh] px-4">
            <div className="text-center w-full max-w-xl mx-auto space-y-8 animate-in fade-in zoom-in duration-1000">
              {/* Success Icon with Animation */}
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-slate-950/5 rounded-full animate-ping duration-[3s]" />
                <div className="relative w-24 h-24 bg-slate-950 rounded-full flex items-center justify-center shadow-2xl animate-in zoom-in duration-500 delay-300">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* Title and Description */}
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
                <h3 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-950 leading-tight">
                  ¡Reserva Confirmada!
                </h3>
                <p className="text-slate-500 font-medium text-base sm:text-lg max-w-md mx-auto leading-relaxed">
                  Tu cita ha sido agendada con éxito. Te enviamos los detalles a tu correo electrónico.
                </p>
              </div>

              {/* Details Card */}
              <Card className="border-none shadow-[0_8px_30px_rgba(0,0,0,0.06)] bg-white overflow-hidden text-left animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Detalles de la Cita</h4>
                  <div className="px-2.5 py-1 bg-white rounded-full text-[10px] font-black text-slate-950 shadow-sm border border-slate-100">
                    ID: #{Math.random().toString(36).substr(2, 6).toUpperCase()}
                  </div>
                </div>
                <CardContent className="p-6 space-y-6">
                  {/* Services Summary */}
                  <div className="space-y-3">
                    {selectedServices.map((service) => (
                      <div key={service.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50 group hover:bg-slate-100/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-black text-slate-950 text-sm leading-tight">{service.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{formatDuration(service.duration_minutes)}</p>
                          </div>
                        </div>
                        <p className="font-black text-slate-950">{formatPrice(service.price)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Professional & Time Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Atendido por</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
                          {selectedEmployee?.avatar_url ? (
                            <img src={selectedEmployee.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100">
                              <User className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <p className="font-black text-slate-950 text-sm">{selectedEmployee?.first_name} {selectedEmployee?.last_name}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Fecha y Hora</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                          <CalendarIcon className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-black text-slate-950 text-sm">{selectedDate ? formatDate(selectedDate) : ''}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{selectedTime}hs</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Container */}
                  <div className="p-4 bg-slate-950 text-white rounded-2xl flex justify-between items-center shadow-lg">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Pagado / A pagar</p>
                      <p className="text-xs font-medium text-slate-500">Incluye impuestos</p>
                    </div>
                    <p className="text-2xl font-black tracking-tighter">{formatPrice(totalPrice)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000">
                <Link href="/dashboard/client" className="flex-1">
                <Button
  variant="outline"
  className="w-full h-14 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 font-black tracking-tight transition-all"
>
  Ver mis citas
</Button>
                </Link>
                <Link href="/marketplace" className="flex-1">
                  <Button className="w-full h-14 bg-slate-950 hover:bg-slate-900 text-white shadow-xl hover:shadow-2xl transition-all rounded-2xl font-black tracking-tight">
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
            <div className="space-y-6 pb-20 lg:pb-0">
              {/* Continue Button - Floating at bottom on mobile */}
              {selectedServices.length > 0 && (
                <div className="lg:hidden fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-10 pointer-events-none">
                  <Button
                    onClick={handleContinueToEmployee}
                    disabled={bookingStatus?.is_blocked}
                    className="pointer-events-auto bg-slate-950 hover:bg-slate-900 text-white shadow-[0_15px_30px_rgba(2,6,23,0.35)] h-14 px-8 rounded-full font-black text-sm transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>Continuar</span>
                    <ArrowLeft className="w-4 h-4 rotate-180" />
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
                      className={`group cursor-pointer border-none transition-all duration-300 h-full flex flex-col ${
                        isSelected 
                          ? 'ring-2 ring-slate-950 bg-white shadow-xl -translate-y-1' 
                          : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1'
                      } ${bookingStatus?.is_blocked ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                      onClick={() => !bookingStatus?.is_blocked && handleServiceSelect(service)}
                    >
                      <CardContent className="p-5 lg:p-6 flex-1 flex flex-col">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Premium Checkbox */}
                          <div className="flex items-center pt-1 flex-shrink-0">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                              isSelected
                                ? 'bg-slate-950 border-slate-950 shadow-md scale-110'
                                : 'border-slate-200 group-hover:border-slate-300'
                            }`}>
                              {isSelected && (
                                <CheckCircle className="w-4 h-4 text-white" />
                              )}
                            </div>
                          </div>

                          {/* Service Info */}
                          <div className="flex-1 flex flex-col min-h-[120px]">
                            <h3 className="font-black text-lg text-slate-950 mb-1 lg:mb-2 tracking-tight group-hover:text-slate-800 transition-colors">
                              {service.name}
                            </h3>
                            <div className="flex-1">
                              {service.description && (
                                <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-4">{service.description}</p>
                              )}
                            </div>
                            
                            {/* Meta Info Badges */}
                            <div className="flex flex-wrap items-center gap-2 mt-auto pt-4 border-t border-slate-50">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-bold ring-1 ring-slate-200/50">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDuration(service.duration_minutes)}
                              </div>
                              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-black transition-colors ${
                                isSelected ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-950'
                              }`}>
                                {formatPrice(service.price)}
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
            <div className="space-y-6 pb-20 lg:pb-0">
              {/* Back Button */}
              <div className="flex justify-start">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBackToService}
                  className="gap-2 h-10 px-4 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Volver a Servicios</span>
                </Button>
              </div>

              <div className="space-y-4">
               <div className="lg:hidden mb-8 p-6 bg-slate-950 text-white rounded-[2rem] shadow-xl overflow-hidden relative">
                  {/* Decorative background accent */}
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
                  
                  <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-4">
                    Servicios seleccionados ({selectedServices.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedServices.map(service => (
                      <div key={service.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                        <span className="text-sm font-bold text-slate-100">{service.name}</span>
                        <span className="text-sm font-black text-white">{formatPrice(service.price)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="font-black text-xs uppercase tracking-widest text-slate-400">Total</span>
                    <span className="text-xl font-black text-white">
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
                <div className="grid grid-cols-1 gap-4">
                  {employees.map((employee) => {
                    const isSelected = selectedEmployee?.id === employee.id
                    return (
                      <Card
                        key={employee.id}
                        className={`group cursor-pointer border-none transition-all duration-300 ${
                          isSelected 
                            ? 'ring-2 ring-slate-950 bg-white shadow-xl -translate-y-1' 
                            : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1'
                        }`}
                        onClick={() => handleEmployeeSelect(employee)}
                      >
                        <CardContent className="p-5 lg:p-6">
                          <div className="flex items-center gap-6">
                            {/* Avatar with dynamic border */}
                            <div className={`relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                              isSelected ? 'p-1 bg-gradient-to-tr from-slate-800 to-slate-950 rounded-full' : ''
                            }`}>
                              <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
                                {employee.avatar_url ? (
                                  <img
                                    src={employee.avatar_url}
                                    alt={`${employee.first_name} ${employee.last_name}`}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <User className="w-8 h-8 text-slate-400" />
                                )}
                              </div>
                              {/* Selected indicator badge */}
                              {isSelected && (
                                <div className="absolute -right-1 -bottom-1 w-6 h-6 bg-slate-950 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-in zoom-in">
                                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1">
                              <h3 className="font-black text-xl text-slate-950 tracking-tight group-hover:text-slate-800 transition-colors">
                                {employee.first_name} {employee.last_name}
                              </h3>
                              {employee.position && (
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
                                  {employee.position}
                                </p>
                              )}
                              {/* Pulse availability marker (Visual flavor) */}
                              {isOpenToday ? (
                                <div className="flex items-center gap-2 mt-3 animate-in fade-in duration-500">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                  <span className="text-[10px] items-center uppercase tracking-widest font-black text-slate-400">
                                    Disponible hoy
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-3 animate-in fade-in duration-500">
                                  <div className="w-2 h-2 bg-slate-200 rounded-full shadow-sm" />
                                  <span className="text-[10px] items-center uppercase tracking-widest font-black text-slate-400 italic">
                                    Cerrado hoy
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
              )}
            </div>
            </div>
          )}
            

          


          {/* Date and Time Selection */}
          {currentStep === 'datetime' && (
            <div className="space-y-6 pb-20 lg:pb-0">
              {/* Back Button */}
              <div className="flex justify-start">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBackToEmployee}
                  className="gap-2 h-10 px-4 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Volver a Empleados</span>
                </Button>
              </div>

              {/* Continue Button - Floating at bottom on mobile */}
              {selectedDate && selectedTime && (
                <div className="lg:hidden fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-10 pointer-events-none">
                  <Button
                    onClick={handleDateTimeConfirm}
                    className="pointer-events-auto bg-slate-950 hover:bg-slate-900 text-white shadow-[0_15px_30px_rgba(2,6,23,0.35)] h-14 px-8 rounded-full font-black text-sm transition-all duration-300 active:scale-95 flex items-center gap-2"
                  >
                    <span>Siguiente</span>
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </Button>
                </div>
              )}

              {/* Calendar and Time Slots - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendar Card */}
                <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
                  <CardHeader className="hidden lg:block border-b border-slate-50">
                    <CardTitle className="text-lg font-black tracking-tight text-slate-950">Selecciona una fecha</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center p-6 sm:p-8">
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
                       className=""
                     captionLayout="buttons"
                    />
                  </CardContent>
                </Card>

                {/* Time Slots Card */}
                <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
                  <CardHeader className="border-b border-slate-50">
                    <CardTitle className="text-lg font-black tracking-tight text-slate-950 flex flex-col gap-1">
                      {selectedDate ? (
                        <>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{formatDate(selectedDate)}</span>
                          <span>Horarios Disponibles</span>
                        </>
                      ) : (
                        'Horarios'
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {!selectedDate ? (
                      <div className="text-center py-4 px-4 group">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
                          <CalendarIcon className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Selecciona una fecha primero</p>
                      </div>
                    ) : (
                      <>
                        {/* Special Hours Alerts */}
                        {specialHourForDate && specialHourForDate.is_closed && (
                          <Alert className="bg-red-50/50 border-red-100 mb-6 rounded-2xl p-4">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <div className="ml-3">
                              <AlertTitle className="text-red-950 font-black text-xs uppercase tracking-widest mb-1">Negocio cerrado</AlertTitle>
                              <AlertDescription className="text-red-800 text-sm font-medium leading-relaxed">
                                {specialHourForDate.description || `El negocio estará cerrado este día.`}
                              </AlertDescription>
                            </div>
                          </Alert>
                        )}

                        {specialHourForDate && !specialHourForDate.is_closed && specialHourForDate.open_time && specialHourForDate.close_time && (
                          <Alert className="bg-blue-50/50 border-blue-100 mb-6 rounded-2xl p-4">
                            <Info className="h-5 w-5 text-blue-500" />
                            <div className="ml-3">
                              <AlertTitle className="text-blue-950 font-black text-xs uppercase tracking-widest mb-1">Horario especial</AlertTitle>
                              <AlertDescription className="text-blue-800 text-sm font-medium leading-relaxed">
                                {specialHourForDate.description}
                                <div className="mt-2 text-[10px] font-black uppercase text-blue-600 bg-blue-100/50 w-fit px-2 py-0.5 rounded-full">
                                  Atención: {specialHourForDate.open_time.substring(0, 5)} - {specialHourForDate.close_time.substring(0, 5)}
                                </div>
                              </AlertDescription>
                            </div>
                          </Alert>
                        )}

                        {/* Time Slots Grid or Empty State */}
                        {!specialHourForDate?.is_closed && availableSlots.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {availableSlots.map((slot) => {
                              const isSelected = selectedTime === slot.time
                              return (
                                <Button
                                  key={slot.time}
                                  variant="ghost"
                                  disabled={!slot.available}
                                  onClick={() => setSelectedTime(slot.time)}
                                  className={`h-12 rounded-xl transition-all duration-300 font-black tracking-tight ${
                                    isSelected 
                                      ? 'bg-slate-950 text-white shadow-lg scale-105 hover:bg-slate-900 border-none' 
                                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950 ring-1 ring-slate-200/50 border-none'
                                  } disabled:opacity-30`}
                                >
                                  {slot.time}
                                </Button>
                              )
                            })}
                          </div>
                        ) : !specialHourForDate?.is_closed && (
                          <Alert className="bg-amber-50/50 border-amber-100 rounded-2xl p-4">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            <div className="ml-3">
                              <AlertTitle className="text-amber-950 font-black text-xs uppercase tracking-widest mb-1">Sin horarios disponibles</AlertTitle>
                              <AlertDescription className="text-amber-800 text-sm font-medium leading-relaxed">
                                El profesional no tiene disponibilidad en esta fecha. Intenta con otro día.
                              </AlertDescription>
                            </div>
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
            <div className="space-y-6 pb-20 lg:pb-0">
              {/* Back Button */}
              <div className="flex justify-start">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBackToDateTime}
                  className="gap-2 h-10 px-4 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Volver a Fecha y Hora</span>
                </Button>
              </div>

              {/* Cancellation Policy Card - Mobile Only */}
              {business?.cancellation_policy_text && (
                <Card className="bg-slate-950 text-white border-none shadow-xl rounded-[2rem] overflow-hidden lg:hidden relative">
                   <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
                  <CardHeader>
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Política de cancelación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium text-slate-100 leading-relaxed">{business.cancellation_policy_text}</p>
                  </CardContent>
                </Card>
              )}

              {/* Booking Summary Card */}
              <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-50">
                  <CardTitle className="text-lg font-black tracking-tight text-slate-950">Resumen de tu cita</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Services */}
                  <div className="space-y-3">
                    {selectedServices.map((service) => (
                      <div key={service.id} className="flex justify-between items-start pb-3 border-b border-slate-50 last:border-none last:pb-0">
                        <div className="flex-1">
                          <p className="font-black text-slate-950 text-base tracking-tight">{service.name}</p>
                          <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(service.duration_minutes)}
                          </div>
                        </div>
                        <p className="font-black text-slate-950 text-base">{formatPrice(service.price)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Professional and Time - Premium Style */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-100">
                    <div className="space-y-1">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profesional</span>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200">
                          {selectedEmployee?.avatar_url ? (
                            <img src={selectedEmployee.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                         <p className="font-black text-slate-950 text-base tracking-tight truncate">
                          {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Horario</span>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                          <Clock className="w-4 h-4" />
                        </div>
                         <p className="font-black text-slate-950 text-base tracking-tight">{selectedTime}</p>
                      </div>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex justify-between items-center py-4 border-t border-slate-100">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha</span>
                    <div className="flex items-center gap-2 text-slate-950">
                      <CalendarIcon className="w-4 h-4 text-slate-400" />
                       <p className="font-black text-base tracking-tight">{selectedDate ? formatDate(selectedDate) : ''}</p>
                    </div>
                  </div>

                  {/* Total Container */}
                  <div className="p-5 bg-slate-950 text-white rounded-2xl flex justify-between items-center shadow-lg relative overflow-hidden group">
                    <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                    <div>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total a pagar</p>
                      <p className="text-xs font-medium text-slate-400">Duración estimada: {formatDuration(totalDuration)}</p>
                    </div>
                    <p className="text-2xl font-black tracking-tighter">{formatPrice(totalPrice)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Notes Card */}
              <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-50">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Notas adicionales (opcional)</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <Textarea
                    placeholder="¿Tienes alguna preferencia especial o algo que el profesional deba saber?"
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    rows={4}
                    className="resize-none rounded-xl border-slate-200 focus:border-slate-950 focus:ring-slate-950/10 placeholder:text-slate-300 text-sm font-medium transition-all"
                  />
                </CardContent>
              </Card>

              {/* Confirm Booking Button - Standard for Desktop, Floating for Mobile */}
              <div className="text-center pt-4">
                {/* Mobile Floating Confirm Button */}
                <div className="lg:hidden fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-10 pointer-events-none">
                  <Button
                    onClick={handleBookingSubmit}
                    disabled={submitting || bookingStatus?.is_blocked}
                    className="pointer-events-auto bg-slate-950 hover:bg-slate-900 text-white shadow-[0_15px_30px_rgba(2,6,23,0.35)] h-14 px-8 rounded-full font-black text-sm transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>Confirmar</span>
                  </Button>
                </div>

                <Button
                  onClick={handleBookingSubmit}
                  size="lg"
                  disabled={submitting || bookingStatus?.is_blocked}
                  className="w-full md:w-auto px-12 h-14 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl font-black tracking-tight text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none hidden lg:inline-flex"
                >
                  {submitting ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Confirmando Reserva...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5" />
                      <span>Confirmar Reserva</span>
                    </div>
                  )}
                </Button>
                
                {/* Desktop Text Only */}
                <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:block">
                  Al confirmar, aceptas nuestras políticas de reserva
                </p>
                
                {/* Mobile non-floating button for when they reach the bottom, but the floating one is primary */}
                <div className="lg:hidden mt-4">
                   <Button
                    onClick={handleBookingSubmit}
                    disabled={submitting || bookingStatus?.is_blocked}
                    className="w-full h-14 bg-slate-950/10 text-slate-400 rounded-2xl font-bold"
                  >
                    {submitting ? 'Confirmando...' : 'Finalizar al fondo'}
                  </Button>
                </div>
              </div>
            </div>
          )}
            </div>
          
          </div>
          
        
        
        

                    {/* Sidebar - Summary (Desktop Only) */}
                    <div className="hidden lg:block lg:col-span-4">
                        <div className="sticky top-10">
                          <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
                            <CardHeader className="border-b border-slate-50">
                              <CardTitle className="text-lg font-black tracking-tight text-slate-950">Resumen de Reserva</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                              {/* Services */}
                              {selectedServices.length > 0 && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                    <div className="w-4 h-px bg-slate-200" />
                                    Servicios ({selectedServices.length})
                                  </h4>
                                  <div className="space-y-3">
                                    {selectedServices.map(service => (
                                      <div key={service.id} className="flex justify-between items-start group">
                                        <div className="flex-1">
                                          <p className="text-sm font-bold text-slate-950 group-hover:text-slate-700 transition-colors line-clamp-1">{service.name}</p>
                                          <p className="text-[10px] font-medium text-slate-400">{formatDuration(service.duration_minutes)}</p>
                                        </div>
                                        <span className="text-sm font-black text-slate-950">{formatPrice(service.price)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Employee */}
                              {selectedEmployee && (
                                <div className="pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                    <div className="w-4 h-px bg-slate-200" />
                                    Profesional
                                  </h4>
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200">
                                      {selectedEmployee.avatar_url ? (
                                        <img src={selectedEmployee.avatar_url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <User className="w-4 h-4 text-slate-400" />
                                      )}
                                    </div>
                                    <p className="text-sm font-black text-slate-950 tracking-tight">
                                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Date & Time */}
                              {selectedDate && selectedTime && (
                                <div className="pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                    <div className="w-4 h-px bg-slate-200" />
                                    Fecha y Hora
                                  </h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-950">
                                      <CalendarIcon className="w-4 h-4 text-slate-400" />
                                      <p className="text-sm font-black tracking-tight capitalize">
                                        {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-950">
                                      <Clock className="w-4 h-4 text-slate-400" />
                                      <p className="text-sm font-black tracking-tight">{selectedTime}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Total - Premium Black Card */}
                              {selectedServices.length > 0 && (
                                <div className="pt-6">
                                  <div className="p-5 bg-slate-950 text-white rounded-2xl shadow-xl relative overflow-hidden group animate-in zoom-in duration-500">
                                     <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                                    <div className="flex justify-between items-center relative z-10">
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                                        <p className="text-[10px] font-medium text-slate-500">{formatDuration(totalDuration)} est.</p>
                                      </div>
                                      <span className="text-2xl font-black text-white tracking-tighter">{formatPrice(totalPrice)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Continue Button for Steps */}
                              {(currentStep === 'service' || currentStep === 'datetime') && selectedServices.length > 0 && (
                                <div className="pt-2">
                                  <Button
                                    onClick={() => {
                                      if (currentStep === 'service') handleContinueToEmployee()
                                      else if (currentStep === 'datetime') handleDateTimeConfirm()
                                    }}
                                    disabled={currentStep === 'datetime' && (!selectedDate || !selectedTime)}
                                    className="w-full bg-slate-950 hover:bg-slate-900 text-white shadow-lg hover:shadow-xl h-14 rounded-2xl font-black tracking-widest uppercase text-xs transition-all duration-300 disabled:opacity-30 group"
                                  >
                                    Continuar Paso
                                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
                                  </Button>
                                </div>
                              )}

                              {/* Booking Policies */}
                              {business && (business.min_booking_hours > 0 || business.max_booking_days < 365) && (
                                <div className="pt-6 border-t border-slate-100">
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-slate-400" />
                                    Políticas
                                  </h4>
                                  <div className="space-y-3">
                                    {business.min_booking_hours > 0 && (
                                      <p className="text-[10px] font-bold text-slate-600 leading-relaxed">
                                        • Requiere <strong className="text-slate-950">{business.min_booking_hours}h</strong> de anticipación
                                      </p>
                                    )}
                                    {business.max_booking_days < 365 && (
                                      <p className="text-[10px] font-bold text-slate-600 leading-relaxed">
                                        • Reservas de hasta <strong className="text-slate-950">{business.max_booking_days} días</strong> a futuro
                                      </p>
                                    )}
                                    {business.cancellation_policy_text && (
                                      <p className="text-[10px] font-bold text-slate-600 leading-relaxed">
                                        • {business.cancellation_policy_text}
                                      </p>
                                    )}
                                  </div>
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
