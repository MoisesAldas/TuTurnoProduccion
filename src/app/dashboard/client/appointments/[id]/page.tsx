'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowLeft, Calendar, Clock, MapPin, Phone, User,
  CheckCircle, AlertCircle, Edit, CalendarIcon, Trash2, Info, Ban
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  total_price: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  client_notes?: string
  business: {
    id: string
    name: string
    address?: string
    phone?: string
    allow_client_cancellation: boolean
    allow_client_reschedule: boolean
    cancellation_policy_hours: number
    cancellation_policy_text?: string
  }
  appointment_services: {
    service: {
      id: string
      name: string
      description?: string
    }
    price: number
  }[]
  employee: {
    id: string
    first_name: string
    last_name: string
    position?: string
    avatar_url?: string
  }
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

export default function ManageAppointmentPage() {
  const params = useParams()
  const router = useRouter()
  const { authState } = useAuth()
  const { toast } = useToast()
  const appointmentId = params.id as string
  const supabase = createClient()

  // State
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Form state
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [step, setStep] = useState<'options' | 'employee' | 'datetime'>('options')

  useEffect(() => {
    if (appointmentId && authState.user) {
      fetchAppointment()
    }
  }, [appointmentId, authState.user])

  useEffect(() => {
    if (selectedDate && selectedEmployee && appointment) {
      generateTimeSlots()
    }
  }, [selectedDate, selectedEmployee, appointment])

  const fetchAppointment = async () => {
    if (!authState.user || !appointmentId) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          business:businesses(
            id,
            name,
            address,
            phone,
            allow_client_cancellation,
            allow_client_reschedule,
            cancellation_policy_hours,
            cancellation_policy_text
          ),
          employee:employees(id, first_name, last_name, position, avatar_url),
          appointment_services(
            service:services(id, name, description),
            price
          )
        `)
        .eq('id', appointmentId)
        .eq('client_id', authState.user.id)
        .single()

      if (error) {
        console.error('Error fetching appointment:', error)
        router.push('/dashboard/client')
        return
      }

      setAppointment(data)
      setSelectedEmployee(data.employee.id)
      setSelectedDate(new Date(data.appointment_date))
      setSelectedTime(data.start_time.slice(0, 5))

    } catch (error) {
      console.error('Error fetching appointment:', error)
      router.push('/dashboard/client')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableEmployees = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, position, avatar_url')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('first_name')

      if (error) {
        console.error('Error fetching employees:', error)
        return
      }

      setAvailableEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const generateTimeSlots = async () => {
    if (!selectedDate || !selectedEmployee || !appointment) return

    const slots: TimeSlot[] = []
    const startHour = 9
    const endHour = 18
    const slotDuration = 30 // minutes

    const formatDateForDB = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const selectedDateStr = formatDateForDB(selectedDate)

    try {
      // Get service duration from the appointment
      let serviceDuration = 60 // Default fallback
      if (appointment.appointment_services && appointment.appointment_services.length > 0) {
        // Try to get duration from service data
        const { data: serviceData } = await supabase
          .from('services')
          .select('duration_minutes')
          .eq('id', appointment.appointment_services[0].service.id)
          .single()

        if (serviceData && serviceData.duration_minutes && serviceData.duration_minutes > 0) {
          serviceDuration = serviceData.duration_minutes
        }
      }

      ('Using service duration:', serviceDuration, 'minutes')

      // Fetch employee schedule for the selected day
      const dayOfWeek = selectedDate.getDay()
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('employee_schedules')
        .select('start_time, end_time, is_available')
        .eq('employee_id', selectedEmployee)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true)
        .single()

      if (scheduleError && scheduleError.code !== 'PGRST116') {
        console.error('Error fetching employee schedule:', scheduleError)
      }

      // If employee doesn't work on this day, return empty slots
      if (!scheduleData) {
        ('Employee does not work on this day')
        setAvailableSlots([])
        return
      }

      // Use employee's working hours instead of fixed hours
      const employeeStartHour = parseInt(scheduleData.start_time.split(':')[0])
      const employeeStartMinute = parseInt(scheduleData.start_time.split(':')[1])
      const employeeEndHour = parseInt(scheduleData.end_time.split(':')[0])
      const employeeEndMinute = parseInt(scheduleData.end_time.split(':')[1])

      (`Employee working hours: ${scheduleData.start_time} - ${scheduleData.end_time}`)

      // Fetch employee absences for the selected date
      const { data: absenceData, error: absenceError } = await supabase
        .from('employee_absences')
        .select('is_full_day, start_time, end_time')
        .eq('employee_id', selectedEmployee)
        .eq('absence_date', selectedDateStr)

      if (absenceError) {
        console.error('Error fetching employee absences:', absenceError)
      }

      // If employee has a full day absence, return empty slots
      const hasFullDayAbsence = absenceData?.some(absence => absence.is_full_day)
      if (hasFullDayAbsence) {
        ('Employee has full day absence')
        setAvailableSlots([])
        return
      }

      // Fetch existing appointments for the employee (excluding current appointment)
      const { data: employeeAppointments, error: employeeError } = await supabase
        .from('appointments')
        .select('start_time, end_time, status')
        .eq('employee_id', selectedEmployee)
        .eq('appointment_date', selectedDateStr)
        .neq('id', appointment.id)
        .in('status', ['confirmed', 'pending'])

      if (employeeError) {
        console.error('Error fetching employee appointments:', employeeError)
      }

      // Fetch existing appointments for the client (excluding current appointment)
      let clientAppointments: any[] = []
      if (authState.user) {
        const { data: clientAppts, error: clientError } = await supabase
          .from('appointments')
          .select('start_time, end_time, status')
          .eq('client_id', authState.user.id)
          .eq('appointment_date', selectedDateStr)
          .neq('id', appointment.id)
          .in('status', ['confirmed', 'pending'])

        if (clientError) {
          console.error('Error fetching client appointments:', clientError)
        } else {
          clientAppointments = clientAppts || []
        }
      }

      // Combine all conflicting appointments
      const allConflictingAppointments = [
        ...(employeeAppointments || []),
        ...clientAppointments
      ]

      ('=== DEBUGGING APPOINTMENT MANAGEMENT ===')
      ('Selected employee ID:', selectedEmployee)
      ('Selected date string:', selectedDateStr)
      ('Day of week:', dayOfWeek)
      ('Employee schedule:', scheduleData)
      ('Employee absences:', absenceData)
      ('Current user ID:', authState.user?.id)
      ('Current appointment ID (excluded):', appointment.id)
      ('Employee appointments:', employeeAppointments)
      ('Client appointments:', clientAppointments)
      ('Total conflicting appointments:', allConflictingAppointments)
      ('Service duration:', serviceDuration, 'minutes')
      ('=== END DEBUGGING ===')

      // Generate time slots within employee's working hours
      const totalEmployeeStartMinutes = employeeStartHour * 60 + employeeStartMinute
      const totalEmployeeEndMinutes = employeeEndHour * 60 + employeeEndMinute

      for (let totalMinutes = totalEmployeeStartMinutes; totalMinutes < totalEmployeeEndMinutes; totalMinutes += slotDuration) {
        const hour = Math.floor(totalMinutes / 60)
        const minute = totalMinutes % 60
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

        // Calculate slot start and end times
        const slotStart = new Date(`${selectedDateStr}T${timeString}:00`)
        const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000)

        // Check if service would extend beyond employee working hours
        const slotEndTotalMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes()
        if (slotEndTotalMinutes > totalEmployeeEndMinutes) {
          continue // Skip this slot
        }

        // Check for partial absences
        const hasPartialAbsenceConflict = absenceData?.some(absence => {
          if (absence.is_full_day || !absence.start_time || !absence.end_time) return false

          const absenceStart = new Date(`${selectedDateStr}T${absence.start_time}`)
          const absenceEnd = new Date(`${selectedDateStr}T${absence.end_time}`)

          return (slotStart < absenceEnd && slotEnd > absenceStart)
        })

        if (hasPartialAbsenceConflict) {
          continue // Skip this slot
        }

        // Check if this slot conflicts with existing appointments (employee or client)
        const hasConflict = allConflictingAppointments.some(appt => {
          const appointmentStart = new Date(`${selectedDateStr}T${appt.start_time}`)
          const appointmentEnd = new Date(`${selectedDateStr}T${appt.end_time}`)

          // Check for overlap
          const overlap = (slotStart < appointmentEnd && slotEnd > appointmentStart)

          // Debug specific conflict
          if (overlap) {
            (`CONFLICT DETECTED:`)
            (`  Slot: ${timeString} (${slotStart.toISOString()} - ${slotEnd.toISOString()})`)
            (`  Appointment: ${appt.start_time} - ${appt.end_time} (${appointmentStart.toISOString()} - ${appointmentEnd.toISOString()})`)
          }

          return overlap
        })

        // Only add slots that are available (no conflicts and within working hours)
        if (!hasConflict) {
          slots.push({
            time: timeString,
            available: true
          })
        }
      }

      ('Generated available slots:', slots.length)
      setAvailableSlots(slots)

    } catch (error) {
      console.error('Error generating time slots:', error)
      // Fallback: show all slots as available
      const fallbackSlots: TimeSlot[] = []
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          // Check if service fits within business hours
          const slotStart = new Date(`${selectedDateStr}T${timeString}:00`)
          const slotEnd = new Date(slotStart.getTime() + 60 * 60000) // Use fallback duration
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

  // ✅ VALIDATION: Check if client can cancel based on policies
  const canCancelAppointment = () => {
    if (!appointment) return false

    // Check if business allows client cancellations
    if (!appointment.business.allow_client_cancellation) {
      return false
    }

    // Calculate hours until appointment
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    const now = new Date()
    const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Check if meets cancellation policy hours
    return hoursUntil >= appointment.business.cancellation_policy_hours
  }

  // ✅ VALIDATION: Check if client can reschedule
  const canRescheduleAppointment = () => {
    if (!appointment) return false

    // Check if business allows client rescheduling
    if (!appointment.business.allow_client_reschedule) {
      return false
    }

    // Calculate hours until appointment
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    const now = new Date()
    const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Use same policy hours as cancellation
    return hoursUntil >= appointment.business.cancellation_policy_hours
  }

  // Get hours remaining until appointment
  const getHoursUntilAppointment = () => {
    if (!appointment) return 0
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    const now = new Date()
    return Math.max(0, (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60))
  }

  const handleCancelAppointment = async () => {
    if (!appointment) return

    // Validate cancellation policy
    if (!canCancelAppointment()) {
      const hoursUntil = getHoursUntilAppointment()
      toast({
        variant: 'destructive',
        title: 'No se puede cancelar',
        description: `Debes cancelar con al menos ${appointment.business.cancellation_policy_hours} horas de anticipación. Solo quedan ${Math.floor(hoursUntil)} horas.`,
      })
      return
    }

    try {
      setCancelling(true)

      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment.id)

      if (error) {
        console.error('Error cancelling appointment:', error)
        toast({
          variant: 'destructive',
          title: 'Error al cancelar',
          description: 'No se pudo cancelar la cita. Por favor intenta nuevamente.',
        })
        return
      }

      toast({
        title: 'Cita cancelada',
        description: 'Tu cita ha sido cancelada exitosamente.',
      })

      setTimeout(() => {
        router.push('/dashboard/client')
      }, 1000)
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast({
        variant: 'destructive',
        title: 'Error al cancelar',
        description: 'No se pudo cancelar la cita. Por favor intenta nuevamente.',
      })
    } finally {
      setCancelling(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!appointment || !selectedEmployee || !selectedDate || !selectedTime) return

    try {
      setSaving(true)

      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      // Get service duration dynamically
      let serviceDuration = 60 // Default fallback
      if (appointment.appointment_services && appointment.appointment_services.length > 0) {
        const { data: serviceData } = await supabase
          .from('services')
          .select('duration_minutes')
          .eq('id', appointment.appointment_services[0].service.id)
          .single()

        if (serviceData && serviceData.duration_minutes && serviceData.duration_minutes > 0) {
          serviceDuration = serviceData.duration_minutes
        }
      }

      // Calculate end time based on actual service duration
      const startTime = selectedTime
      const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
      const endMinutes = startMinutes + serviceDuration
      const endHours = Math.floor(endMinutes / 60)
      const endMins = endMinutes % 60
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`

      const { error } = await supabase
        .from('appointments')
        .update({
          employee_id: selectedEmployee,
          appointment_date: formatDateForDB(selectedDate),
          start_time: `${startTime}:00`,
          end_time: endTime
        })
        .eq('id', appointment.id)

      if (error) {
        console.error('Error updating appointment:', error)
        alert('Error al actualizar la cita')
        return
      }

      router.push('/dashboard/client')
    } catch (error) {
      console.error('Error updating appointment:', error)
      alert('Error al actualizar la cita')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handleStartModification = () => {
    setStep('employee')
    fetchAvailableEmployees(appointment!.business.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando cita...</p>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cita no encontrada</h1>
          <p className="text-gray-600 mb-4">No se pudo cargar la información de la cita.</p>
          <Link href="/dashboard/client">
            <Button>Volver al Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard/client">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Gestionar Cita
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Appointment Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Información de la Cita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Negocio</p>
                  <p className="text-lg font-semibold">{appointment.business.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Servicio</p>
                  <p className="text-base">{appointment.appointment_services[0]?.service.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Empleado</p>
                  <p className="text-base">{appointment.employee.first_name} {appointment.employee.last_name}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Fecha</p>
                  <p className="text-base">{formatDate(appointment.appointment_date)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Hora</p>
                  <p className="text-base">{appointment.start_time} - {appointment.end_time}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Precio</p>
                  <p className="text-lg font-semibold text-green-600">{formatPrice(appointment.total_price)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Policy Alert */}
        {step === 'options' && appointment.business.cancellation_policy_text && (
          <Alert className="bg-amber-50 border-amber-200 mb-6">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 font-semibold">Política de cancelación</AlertTitle>
            <AlertDescription className="text-amber-700 text-sm">
              {appointment.business.cancellation_policy_text}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        {step === 'options' && (
          <>
            {/* Info Alert - Hours Until Appointment */}
            <Alert className="bg-blue-50 border-blue-200 mb-6">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900 font-semibold">Tiempo restante</AlertTitle>
              <AlertDescription className="text-blue-700 text-sm">
                Tu cita es en <strong>{Math.floor(getHoursUntilAppointment())} horas</strong>.
                {appointment.business.cancellation_policy_hours > 0 && (
                  <> Puedes cancelar o reagendar con al menos <strong>{appointment.business.cancellation_policy_hours} horas</strong> de anticipación.</>
                )}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reschedule Card */}
              {appointment.business.allow_client_reschedule ? (
                canRescheduleAppointment() ? (
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleStartModification}>
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Edit className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Modificar Cita</h3>
                      <p className="text-gray-600">Cambiar empleado, fecha o hora de la cita</p>
                    </CardContent>
                  </Card>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card className="opacity-50 cursor-not-allowed">
                          <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Ban className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Modificar Cita</h3>
                            <p className="text-gray-600">No disponible</p>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 text-white p-3 max-w-xs">
                        <p className="text-sm">
                          No puedes modificar esta cita porque faltan menos de {appointment.business.cancellation_policy_hours} horas.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="opacity-50 cursor-not-allowed">
                        <CardContent className="p-8 text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Ban className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Modificar Cita</h3>
                          <p className="text-gray-600">No permitido</p>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900 text-white p-3 max-w-xs">
                      <p className="text-sm">
                        El negocio no permite que los clientes modifiquen citas. Contacta directamente al negocio.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Cancel Card */}
              {appointment.business.allow_client_cancellation ? (
                canCancelAppointment() ? (
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleCancelAppointment}>
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar Cita</h3>
                      <p className="text-gray-600">Cancelar esta cita permanentemente</p>
                      {cancelling && (
                        <p className="text-sm text-red-600 mt-2">Cancelando...</p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card className="opacity-50 cursor-not-allowed">
                          <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Ban className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar Cita</h3>
                            <p className="text-gray-600">No disponible</p>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 text-white p-3 max-w-xs">
                        <p className="text-sm">
                          No puedes cancelar esta cita porque faltan menos de {appointment.business.cancellation_policy_hours} horas.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="opacity-50 cursor-not-allowed">
                        <CardContent className="p-8 text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Ban className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar Cita</h3>
                          <p className="text-gray-600">No permitido</p>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-900 text-white p-3 max-w-xs">
                      <p className="text-sm">
                        El negocio no permite que los clientes cancelen citas. Contacta directamente al negocio.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </>
        )}

        {/* Employee Selection Step */}
        {step === 'employee' && (
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Empleado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                {availableEmployees.map((employee) => (
                  <Card
                    key={employee.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedEmployee === employee.id ? 'ring-2 ring-green-500 bg-green-50' : ''
                    }`}
                    onClick={() => setSelectedEmployee(employee.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          {employee.avatar_url ? (
                            <img
                              src={employee.avatar_url}
                              alt={`${employee.first_name} ${employee.last_name}`}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </h4>
                          {employee.position && (
                            <p className="text-green-600 text-sm font-medium">{employee.position}</p>
                          )}
                        </div>
                        {selectedEmployee === employee.id && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('options')}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => setStep('datetime')}
                  disabled={!selectedEmployee}
                >
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date and Time Selection Step */}
        {step === 'datetime' && (
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Fecha y Hora</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Seleccionar Nueva Fecha
                </label>

                {/* Calendar Popover with shadcn Calendar */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-12"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        selectedDate.toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      ) : (
                        <span className="text-gray-500">Selecciona una fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
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
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {/* Current vs New Date Comparison */}
                {appointment && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Fecha Actual</p>
                        <p className="text-sm font-medium text-gray-700">{formatDate(appointment.appointment_date)}</p>
                      </div>
                      {selectedDate && (
                        <div>
                          <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Nueva Fecha</p>
                          <p className="text-sm font-medium text-green-700">
                            {selectedDate.toLocaleDateString('es-EC', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Success Confirmation */}
                {selectedDate && selectedDate.toISOString().split('T')[0] !== appointment?.appointment_date && (
                  <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-900">¡Fecha actualizada!</p>
                      <p className="text-xs text-green-700 mt-1">
                        Tu cita se moverá al {selectedDate.toLocaleDateString('es-EC', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">
                    Seleccionar Hora
                  </label>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-3">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? "default" : "outline"}
                          onClick={() => setSelectedTime(slot.time)}
                          className={selectedTime === slot.time ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">Generando horarios disponibles...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {selectedEmployee && selectedDate && selectedTime && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">Resumen de cambios:</h4>
                  <div className="space-y-1 text-sm text-green-800">
                    <div>
                      <strong>Empleado:</strong> {availableEmployees.find(emp => emp.id === selectedEmployee)?.first_name} {availableEmployees.find(emp => emp.id === selectedEmployee)?.last_name}
                    </div>
                    <div>
                      <strong>Fecha:</strong> {selectedDate.toLocaleDateString('es-EC', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div>
                      <strong>Hora:</strong> {selectedTime}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('employee')}>
                  Atrás
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={saving || !selectedEmployee || !selectedDate || !selectedTime}
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}