'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  CheckCircle, AlertCircle, Edit, CalendarIcon, Trash2, Ban, Loader2, XCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { parseDateString, formatSpanishDate } from '@/lib/dateUtils'
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

interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
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
  const [availableServices, setAvailableServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [step, setStep] = useState<'options' | 'services' | 'employee' | 'datetime'>('options')

  useEffect(() => {
    if (appointmentId && authState.user) {
      fetchAppointment()
    }
  }, [appointmentId, authState.user])

  useEffect(() => {
    if (selectedDate && selectedEmployee && appointment && selectedServices.length > 0) {
      generateTimeSlots()
    }
  }, [selectedDate, selectedEmployee, appointment, selectedServices])

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
      setSelectedDate(parseDateString(data.appointment_date)) // Fix timezone issue
      setSelectedTime(data.start_time.slice(0, 5))

      // Initialize selected services with current appointment services
      // Fetch full service data (with duration_minutes)
      const serviceIds = data.appointment_services.map((as: { service: { id: string } }) => as.service.id)
      const { data: servicesData } = await supabase
        .from('services')
        .select('id, name, description, price, duration_minutes')
        .in('id', serviceIds)

      if (servicesData) {
        setSelectedServices(servicesData)
      }

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

  const fetchAvailableServices = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description, price, duration_minutes')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching services:', error)
        return
      }

      setAvailableServices(data || [])
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const handleServiceToggle = (service: Service) => {
    // Check if service is already in the original appointment
    const isOriginalService = appointment?.appointment_services.some(
      as => as.service.id === service.id
    )

    // If it's an original service, don't allow removal
    if (isOriginalService) {
      toast({
        variant: 'destructive',
        title: 'No se puede quitar',
        description: 'No puedes quitar servicios que ya tienes reservados. Solo puedes agregar nuevos servicios.',
      })
      return
    }

    // Toggle service (only for new services)
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id)
      if (isSelected) {
        return prev.filter(s => s.id !== service.id) // Remove
      } else {
        return [...prev, service] // Add
      }
    })
  }

  const generateTimeSlots = async () => {
    if (!selectedDate || !selectedEmployee || !appointment || selectedServices.length === 0) return

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
      // Calculate total duration from selected services
      const serviceDuration = selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0)

      if (!serviceDuration || serviceDuration <= 0) {
        console.error('Invalid service duration:', serviceDuration)
        return
      }

      console.log('Using total service duration:', serviceDuration, 'minutes from', selectedServices.length, 'services')

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
        console.log('Employee does not work on this day')
        setAvailableSlots([])
        return
      }

      // Use employee's working hours instead of fixed hours
      const employeeStartHour = parseInt(scheduleData.start_time.split(':')[0])
      const employeeStartMinute = parseInt(scheduleData.start_time.split(':')[1])
      const employeeEndHour = parseInt(scheduleData.end_time.split(':')[0])
      const employeeEndMinute = parseInt(scheduleData.end_time.split(':')[1])

      console.log(`Employee working hours: ${scheduleData.start_time} - ${scheduleData.end_time}`)

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
        console.log('Employee has full day absence')
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

      console.log('=== DEBUGGING APPOINTMENT MANAGEMENT ===')
      console.log('Selected employee ID:', selectedEmployee)
      console.log('Selected date string:', selectedDateStr)
      console.log('Day of week:', dayOfWeek)
      console.log('Employee schedule:', scheduleData)
      console.log('Employee absences:', absenceData)
      console.log('Current user ID:', authState.user?.id)
      console.log('Current appointment ID (excluded):', appointment.id)
      console.log('Employee appointments:', employeeAppointments)
      console.log('Client appointments:', clientAppointments)
      console.log('Total conflicting appointments:', allConflictingAppointments)
      console.log('Service duration:', serviceDuration, 'minutes')
      console.log('=== END DEBUGGING ===')

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
            console.log('CONFLICT DETECTED:')
            console.log(`  Slot: ${timeString} (${slotStart.toISOString()} - ${slotEnd.toISOString()})`)
            console.log(`  Appointment: ${appt.start_time} - ${appt.end_time} (${appointmentStart.toISOString()} - ${appointmentEnd.toISOString()})`)
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

      console.log('Generated available slots:', slots.length)
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

      // Send cancellation notifications (client + business)
      try {
        await fetch('/api/send-cancellation-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: appointment.id,
            cancellationReason: ''
          })
        })
      } catch (emailError) {
        console.error('Error sending cancellation emails:', emailError)
        // Don't block the operation if email fails
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
    if (!appointment || !selectedEmployee || !selectedDate || !selectedTime || selectedServices.length === 0) return

    try {
      setSaving(true)

      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      // Calculate total duration and price from all selected services
      const serviceDuration = selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0)
      const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0)

      // Calculate end time based on total service duration
      const startTime = selectedTime
      const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
      const endMinutes = startMinutes + serviceDuration
      const endHours = Math.floor(endMinutes / 60)
      const endMins = endMinutes % 60
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`

      // ✅ VALIDATION: Check if new duration fits in the selected slot
      // We need to check against business hours or employee schedule
      const selectedDateStr = formatDateForDB(selectedDate)
      const dayOfWeek = selectedDate.getDay()

      // Fetch employee schedule to check if end time exceeds working hours
      const { data: scheduleData } = await supabase
        .from('employee_schedules')
        .select('end_time')
        .eq('employee_id', selectedEmployee)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true)
        .single()

      if (scheduleData) {
        const employeeEndHour = parseInt(scheduleData.end_time.split(':')[0])
        const employeeEndMinute = parseInt(scheduleData.end_time.split(':')[1])
        const employeeEndTotalMinutes = employeeEndHour * 60 + employeeEndMinute

        if (endMinutes > employeeEndTotalMinutes) {
          toast({
            variant: 'destructive',
            title: 'Duración excedida',
            description: `La duración total de los servicios (${serviceDuration} min) excede el horario de cierre del empleado. Por favor selecciona otra hora o reduce los servicios.`,
          })
          setSaving(false)
          return
        }
      }

      // Capture old data BEFORE updating (for email notifications)
      const oldData = {
        oldDate: appointment.appointment_date,
        oldTime: appointment.start_time,
        oldEndTime: appointment.end_time,
        oldEmployeeId: appointment.employee.id
      }

      // Update appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          employee_id: selectedEmployee,
          appointment_date: selectedDateStr,
          start_time: `${startTime}:00`,
          end_time: endTime,
          total_price: totalPrice
        })
        .eq('id', appointment.id)

      if (appointmentError) {
        console.error('Error updating appointment:', appointmentError)
        toast({
          variant: 'destructive',
          title: 'Error al actualizar',
          description: 'No se pudo actualizar la cita. Por favor intenta nuevamente.',
        })
        return
      }

      // Check if services have changed
      const originalServiceIds = appointment.appointment_services.map(as => as.service.id).sort()
      const newServiceIds = selectedServices.map(s => s.id).sort()
      const servicesChanged = JSON.stringify(originalServiceIds) !== JSON.stringify(newServiceIds)

      if (servicesChanged) {
        // Delete old appointment_services
        const { error: deleteError } = await supabase
          .from('appointment_services')
          .delete()
          .eq('appointment_id', appointment.id)

        if (deleteError) {
          console.error('Error deleting old services:', deleteError)
          toast({
            variant: 'destructive',
            title: 'Error al actualizar servicios',
            description: 'No se pudieron actualizar los servicios. Por favor intenta nuevamente.',
          })
          return
        }

        // Insert new appointment_services
        const appointmentServicesData = selectedServices.map(service => ({
          appointment_id: appointment.id,
          service_id: service.id,
          price: service.price
        }))

        const { error: insertError } = await supabase
          .from('appointment_services')
          .insert(appointmentServicesData)

        if (insertError) {
          console.error('Error inserting new services:', insertError)
          toast({
            variant: 'destructive',
            title: 'Error al actualizar servicios',
            description: 'No se pudieron agregar los nuevos servicios. Por favor intenta nuevamente.',
          })
          return
        }
      }

      // Send rescheduled notifications (client + business)
      try {
        await fetch('/api/send-rescheduled-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: appointment.id,
            changes: oldData
          })
        })
      } catch (emailError) {
        console.error('Error sending rescheduled emails:', emailError)
        // Don't block the operation if email fails
      }

      toast({
        title: 'Cita actualizada',
        description: 'Los cambios se han guardado exitosamente.',
      })

      setTimeout(() => {
        router.push('/dashboard/client')
      }, 1000)
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast({
        variant: 'destructive',
        title: 'Error inesperado',
        description: 'Ocurrió un error al actualizar la cita. Por favor intenta nuevamente.',
      })
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return formatSpanishDate(dateString, {
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
    setStep('services')
    fetchAvailableServices(appointment!.business.id)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/20">
      {/* Header Mejorado */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-10 shadow-sm backdrop-blur-sm bg-white/95">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/client">
                <Button variant="ghost" size="sm" className="hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 -ml-2">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Volver
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-200"></div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  Detalle de Cita
                </h1>
                <p className="text-xs text-gray-500 leading-tight">{appointment.business.name}</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                appointment.status === 'confirmed'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold px-3 py-1'
                  : appointment.status === 'pending'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-300 font-semibold px-3 py-1'
                  : 'bg-gray-100 text-gray-700 border-gray-300 font-semibold px-3 py-1'
              }
            >
              {appointment.status === 'confirmed' ? '✓ Confirmada' :
               appointment.status === 'pending' ? '⏳ Pendiente' : appointment.status}
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Hero Card - Información Principal */}
        <Card className="overflow-hidden shadow-lg border-0">
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-4 py-4 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">{appointment.business.name}</h2>
                <div className="flex flex-wrap gap-1.5">
                  {appointment.appointment_services.map((appService, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-emerald-700/30 text-white border-emerald-400/40 hover:bg-emerald-700/40 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium"
                    >
                      {appService.service.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="text-xs text-emerald-100 font-medium mb-0.5">Total</p>
                <p className="text-3xl font-bold tracking-tight">{formatPrice(appointment.total_price)}</p>
              </div>
            </div>
          </div>

          <CardContent className="p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Fecha */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200/60 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-blue-700 font-semibold uppercase tracking-wide mb-0.5">Fecha</p>
                    <p className="text-xs font-bold text-gray-900 leading-tight truncate">{formatDate(appointment.appointment_date).split(',')[0]}</p>
                  </div>
                </div>
              </div>

              {/* Hora */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-3 border border-purple-200/60 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-purple-700 font-semibold uppercase tracking-wide mb-0.5">Hora</p>
                    <p className="text-xs font-bold text-gray-900 leading-tight">{appointment.start_time.slice(0,5)} - {appointment.end_time.slice(0,5)}</p>
                  </div>
                </div>
              </div>

              {/* Profesional */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg p-3 border border-emerald-200/60 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wide mb-0.5">Profesional</p>
                    <p className="text-xs font-bold text-gray-900 leading-tight truncate">{appointment.employee.first_name} {appointment.employee.last_name}</p>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              {appointment.business.address && (
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-3 border border-orange-200/60 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-orange-700 font-semibold uppercase tracking-wide mb-0.5">Ubicación</p>
                      <p className="text-xs font-bold text-gray-900 leading-tight truncate" title={appointment.business.address}>{appointment.business.address}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contacto del Negocio */}
            {appointment.business.phone && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 block text-[10px] uppercase tracking-wide">Contacto</span>
                      <span className="text-gray-700 font-medium text-xs">{appointment.business.phone}</span>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 transition-all shadow-sm h-8 text-xs"
                  >
                    <a href={`tel:${appointment.business.phone}`}>
                      <Phone className="w-3.5 h-3.5 mr-1.5" />
                      Llamar
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alert Inteligente - Muestra el estado más relevante */}
        {step === 'options' && (
          <>
            {/* Alerta principal - Depende si puede o no cancelar/modificar */}
            {!canCancelAppointment() || !canRescheduleAppointment() ? (
              <Alert className="bg-white border-2 border-red-300 shadow-lg rounded-lg overflow-hidden">
                <div className="flex items-start gap-3 p-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <AlertTitle className="text-red-900 font-bold text-sm mb-1.5 leading-tight">Ventana de modificación cerrada</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p className="text-xs text-gray-800 leading-relaxed">
                        Tu cita es en <span className="font-bold text-red-600">{Math.floor(getHoursUntilAppointment())} horas</span>, pero necesitas al menos <span className="font-bold text-red-600">{appointment.business.cancellation_policy_hours} horas</span> de anticipación para cancelar o modificar.
                      </p>
                      <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-600" />
                        <p className="text-xs text-gray-700 leading-relaxed">
                          Si necesitas hacer cambios, contacta directamente al negocio al <a href={`tel:${appointment.business.phone}`} className="font-semibold text-red-600 hover:text-red-700 hover:underline">{appointment.business.phone || 'teléfono del negocio'}</a>.
                        </p>
                      </div>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ) : (
              <Alert className="bg-white border-2 border-emerald-300 shadow-lg rounded-lg overflow-hidden">
                <div className="flex items-start gap-3 p-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <AlertTitle className="text-emerald-900 font-bold text-sm mb-1.5 leading-tight">Puedes gestionar tu cita</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p className="text-xs text-gray-800 leading-relaxed">
                        Tu cita es en <span className="font-bold text-emerald-600">{Math.floor(getHoursUntilAppointment())} horas</span>. Aún puedes cancelar o modificar con al menos <span className="font-bold text-emerald-600">{appointment.business.cancellation_policy_hours} horas</span> de anticipación.
                      </p>
                      {appointment.business.cancellation_policy_text && (
                        <div className="flex items-start gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                          <p className="text-xs text-gray-700 leading-relaxed">
                            <span className="font-semibold text-emerald-900">Política:</span> {appointment.business.cancellation_policy_text}
                          </p>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}
          </>
        )}

        {/* Actions - Rediseñadas */}
        {step === 'options' && (
          <>
            <Card className="shadow-md">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-lg font-bold text-gray-900">¿Qué deseas hacer?</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                {/* Modificar Card */}
                {appointment.business.allow_client_reschedule ? (
                  canRescheduleAppointment() ? (
                    <button
                      type="button"
                      onClick={handleStartModification}
                      className="group relative overflow-hidden rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-teal-50 p-4 text-left transition-all duration-300 hover:border-emerald-400 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                          <Edit className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">Modificar Cita</h3>
                          <p className="text-xs text-gray-600 leading-snug mb-2">Cambia empleado, fecha u hora</p>
                          <div className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Disponible</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative overflow-hidden rounded-xl border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 opacity-70 cursor-not-allowed">
                            <div className="flex items-start gap-3">
                              <div className="w-11 h-11 bg-gray-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                                <Ban className="w-5 h-5 text-gray-100" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-base font-bold text-gray-600 mb-1">Modificar Cita</h3>
                                <p className="text-xs text-gray-500 leading-snug mb-2">No disponible</p>
                                <div className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Tiempo insuficiente</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 text-white p-2.5 max-w-xs rounded-lg shadow-xl">
                          <p className="text-xs leading-relaxed">
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
                        <div className="relative overflow-hidden rounded-xl border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 opacity-70 cursor-not-allowed">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 bg-gray-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                              <Ban className="w-5 h-5 text-gray-100" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-base font-bold text-gray-600 mb-1">Modificar Cita</h3>
                              <p className="text-xs text-gray-500 leading-snug mb-2">No permitido por el negocio</p>
                              <div className="inline-flex items-center gap-1 text-xs text-gray-600 font-semibold">
                                <Phone className="w-3.5 h-3.5" />
                                <span>Contacta al negocio</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 text-white p-2.5 max-w-xs rounded-lg shadow-xl">
                        <p className="text-xs leading-relaxed">
                          El negocio no permite que los clientes modifiquen citas. Contacta directamente al negocio.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Cancelar Card */}
                {appointment.business.allow_client_cancellation ? (
                  canCancelAppointment() ? (
                    <button
                      type="button"
                      onClick={handleCancelAppointment}
                      disabled={cancelling}
                      className="group relative overflow-hidden rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 via-red-50/80 to-rose-50 p-4 text-left transition-all duration-300 hover:border-red-400 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-red-500 via-red-500 to-rose-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                          <Trash2 className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-red-700 transition-colors">Cancelar Cita</h3>
                          <p className="text-xs text-gray-600 leading-snug mb-2">Cancelar permanentemente</p>
                          {cancelling ? (
                            <div className="inline-flex items-center gap-1 text-xs text-red-700 font-semibold">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Cancelando...</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-xs text-red-700 font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Disponible</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative overflow-hidden rounded-xl border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 opacity-70 cursor-not-allowed">
                            <div className="flex items-start gap-3">
                              <div className="w-11 h-11 bg-gray-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                                <Ban className="w-5 h-5 text-gray-100" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-base font-bold text-gray-600 mb-1">Cancelar Cita</h3>
                                <p className="text-xs text-gray-500 leading-snug mb-2">No disponible</p>
                                <div className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Tiempo insuficiente</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 text-white p-2.5 max-w-xs rounded-lg shadow-xl">
                          <p className="text-xs leading-relaxed">
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
                        <div className="relative overflow-hidden rounded-xl border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 opacity-70 cursor-not-allowed">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 bg-gray-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                              <Ban className="w-5 h-5 text-gray-100" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-base font-bold text-gray-600 mb-1">Cancelar Cita</h3>
                              <p className="text-xs text-gray-500 leading-snug mb-2">No permitido por el negocio</p>
                              <div className="inline-flex items-center gap-1 text-xs text-gray-600 font-semibold">
                                <Phone className="w-3.5 h-3.5" />
                                <span>Contacta al negocio</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 text-white p-2.5 max-w-xs rounded-lg shadow-xl">
                        <p className="text-xs leading-relaxed">
                          El negocio no permite que los clientes cancelen citas. Contacta directamente al negocio.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Services Selection Step */}
        {step === 'services' && (
          <Card>
            <CardHeader>
              <CardTitle>Agregar Servicios</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Puedes agregar más servicios a tu cita. Los servicios originales no se pueden quitar.
              </p>
            </CardHeader>
            <CardContent>
              {/* Current Services (cannot be removed) */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Servicios actuales (no se pueden quitar):
                </h3>
                <div className="flex flex-wrap gap-2">
                  {appointment?.appointment_services.map((appService, index) => (
                    <Badge
                      key={index}
                      className="bg-gray-200 text-gray-700 cursor-not-allowed"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {appService.service.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Available Services to Add */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Servicios disponibles para agregar:
                </h3>
                <div className="space-y-3">
                  {availableServices.map((service) => {
                    const isOriginal = appointment?.appointment_services.some(
                      as => as.service.id === service.id
                    )
                    const isSelected = selectedServices.some(s => s.id === service.id)
                    const isNewlyAdded = isSelected && !isOriginal

                    return (
                      <Card
                        key={service.id}
                        className={`cursor-pointer transition-all ${
                          isOriginal
                            ? 'opacity-50 cursor-not-allowed bg-gray-50'
                            : isNewlyAdded
                            ? 'ring-2 ring-green-500 bg-green-50'
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => !isOriginal && handleServiceToggle(service)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <div className="pt-1">
                              {isOriginal ? (
                                <CheckCircle className="w-5 h-5 text-gray-400" />
                              ) : (
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                    isNewlyAdded
                                      ? 'bg-green-600 border-green-600'
                                      : 'border-gray-300'
                                  }`}
                                >
                                  {isNewlyAdded && (
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Service Info */}
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{service.name}</h4>
                              {service.description && (
                                <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {service.duration_minutes} min
                                </div>
                                <div className="font-semibold text-green-600">
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

              {/* Summary */}
              {selectedServices.length > appointment.appointment_services.length && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">
                    Total de servicios: {selectedServices.length}
                  </h4>
                  <div className="text-sm text-green-800">
                    <div>
                      <strong>Duración total:</strong>{' '}
                      {selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)} minutos
                    </div>
                    <div>
                      <strong>Precio total:</strong>{' '}
                      {formatPrice(selectedServices.reduce((sum, s) => sum + s.price, 0))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep('options')}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    setStep('employee')
                    fetchAvailableEmployees(appointment!.business.id)
                  }}
                  disabled={selectedServices.length === 0}
                >
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
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
                <Button variant="outline" onClick={() => setStep('services')}>
                  Atrás
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
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}