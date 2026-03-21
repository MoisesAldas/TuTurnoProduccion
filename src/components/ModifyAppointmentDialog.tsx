'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, User, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { parseDateString } from '@/lib/dateUtils'

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

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  pending_reason?: 'business_edited' | 'business_closed'
  business: {
    id: string
  }
  appointment_services: {
    service: {
      id: string
      name: string
    }
    price: number
  }[]
  employee: {
    id: string
  }
}

interface ModifyAppointmentDialogProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment
  onSuccess: () => void
}

export default function ModifyAppointmentDialog({
  isOpen,
  onClose,
  appointment,
  onSuccess
}: ModifyAppointmentDialogProps) {
  const supabase = createClient()
  const { toast } = useToast()

  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState(1)

  // Form state
  const [availableServices, setAvailableServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [saving, setSaving] = useState(false)
  const [specialHourForDate, setSpecialHourForDate] = useState<any>(null)
  const [checkingSpecialHours, setCheckingSpecialHours] = useState(false)

  // Initialize form when dialog opens
  useEffect(() => {
    if (isOpen && appointment) {
      initializeForm()
    }
  }, [isOpen, appointment])

  useEffect(() => {
    if (selectedDate) {
      checkSpecialHours(selectedDate)
    } else {
      setSpecialHourForDate(null)
      setAvailableSlots([])
    }
  }, [selectedDate])

  // Generate time slots when dependencies change
  useEffect(() => {
    if (selectedDate && selectedEmployee && selectedServices.length > 0) {
      generateTimeSlots()
    }
  }, [selectedDate, selectedEmployee, selectedServices, specialHourForDate])

  const initializeForm = async () => {
    // Reset to step 1
    setCurrentStep(1)

    // Set current employee
    setSelectedEmployee(appointment.employee.id)

    // Set current date
    setSelectedDate(parseDateString(appointment.appointment_date))

    // Set current time
    setSelectedTime(appointment.start_time.slice(0, 5))

    // Fetch available services
    await fetchAvailableServices()

    // Fetch available employees
    await fetchAvailableEmployees()

    // Initialize selected services with current appointment services
    const serviceIds = appointment.appointment_services.map(as => as.service.id)
    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name, description, price, duration_minutes')
      .in('id', serviceIds)

    if (servicesData) {
      setSelectedServices(servicesData)
    }
  }

  const fetchAvailableServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description, price, duration_minutes')
        .eq('business_id', appointment.business.id)
        .eq('is_active', true)
        .order('name')

      if (!error && data) {
        setAvailableServices(data)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const fetchAvailableEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, position, avatar_url')
        .eq('business_id', appointment.business.id)
        .eq('is_active', true)
        .order('first_name')

      if (!error && data) {
        setAvailableEmployees(data)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleServiceToggle = (service: Service) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id)
      
      if (isSelected) {
        // ✅ Validar que al menos 1 servicio esté seleccionado
        if (prev.length === 1) {
          toast({
            variant: 'destructive',
            title: 'Servicio requerido',
            description: 'Debes tener al menos un servicio seleccionado para tu cita.',
          })
          return prev
        }
        return prev.filter(s => s.id !== service.id)
      } else {
        return [...prev, service]
      }
    })
  }

  const checkSpecialHours = async (date: Date) => {
    if (!appointment.business.id) return

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
        .eq('business_id', appointment.business.id)
        .eq('special_date', dateStr)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking special hours:', error)
        return
      }

      console.log('✅ [ModifyDialog - checkSpecialHours] Found special hours:', data)
      setSpecialHourForDate(data)

    } catch (error) {
      console.error('Error checking special hours:', error)
    } finally {
      setCheckingSpecialHours(false)
    }
  }

  const generateTimeSlots = async () => {
    if (!selectedDate || !selectedEmployee || selectedServices.length === 0) return

    // Check if business is closed on this date (special hours)
    console.log('🔍 [ModifyDialog - generateTimeSlots] specialHourForDate:', specialHourForDate)
    if (specialHourForDate?.is_closed) {
      console.log('🚫 [ModifyDialog - generateTimeSlots] Business is CLOSED, clearing slots')
      setAvailableSlots([])
      return
    }

    const formatDateForDB = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const selectedDateStr = formatDateForDB(selectedDate)
    const dayOfWeek = selectedDate.getDay()
    const serviceDuration = selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0)

    try {
      // 1) Get business hours for this day of week
      const { data: businessHours, error: hoursError } = await supabase
        .from('business_hours')
        .select('is_closed, open_time, close_time')
        .eq('business_id', appointment.business.id)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle()

      if (hoursError) {
        console.error('Error fetching business hours:', hoursError)
      }

      // If business is closed on this day, show no slots
      if (businessHours?.is_closed) {
        setAvailableSlots([])
        return
      }

      // Default hours (9 AM - 6 PM)
      let startHour = 9
      let endHour = 18

      // Use business hours if available
      if (businessHours?.open_time && businessHours?.close_time) {
        const openTime = businessHours.open_time.split(':')
        const closeTime = businessHours.close_time.split(':')
        startHour = parseInt(openTime[0])
        endHour = parseInt(closeTime[0])
      }

      const businessStart = `${String(startHour).padStart(2, '0')}:00:00`
      const businessEnd = `${String(endHour).padStart(2, '0')}:00:00`
      const slotDuration = 30 // minutes

      // 2) Use RPC function to get available slots (same as booking flow)
      const { data: rpcSlots, error: rpcError } = await supabase.rpc('get_available_time_slots', {
        p_business_id: appointment.business.id,
        p_employee_id: selectedEmployee,
        p_date: selectedDateStr,
        p_business_start: businessStart,
        p_business_end: businessEnd,
        p_service_duration_minutes: serviceDuration,
        p_slot_step_minutes: slotDuration
      })

      if (rpcError) {
        console.error('Error fetching available slots (RPC):', rpcError)
        setAvailableSlots([])
        return
      }

      // 3) Filter out slots that conflict with the current appointment being edited
      const filtered = (rpcSlots || []).filter((row: any) => {
        const timeStr: string = row.slot_time ?? row.slot_time?.slot_time
        if (!timeStr) return false

        const slotStart = new Date(`${selectedDateStr}T${timeStr}`)
        const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000)

        // Check if this is the current appointment time (allow it to be selected)
        const currentAppointmentStart = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
        const currentAppointmentEnd = new Date(`${appointment.appointment_date}T${appointment.end_time}`)

        // If this slot matches the current appointment, include it
        if (selectedDateStr === appointment.appointment_date &&
            slotStart.getTime() === currentAppointmentStart.getTime()) {
          return true
        }

        return true
      })

      const newSlots: TimeSlot[] = filtered.map((row: any) => {
        const t: string = (row.slot_time as string).substring(0, 5)
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
      setAvailableSlots([])
    }
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setDirection(1)
      setCurrentStep(currentStep + 1)
    } else {
      handleSaveChanges()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1)
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveChanges = async () => {
    if (!selectedEmployee || !selectedDate || !selectedTime || selectedServices.length === 0) return

    try {
      setSaving(true)

      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const serviceDuration = selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0)
      const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0)

      const startTime = selectedTime
      const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
      const endMinutes = startMinutes + serviceDuration
      const endHours = Math.floor(endMinutes / 60)
      const endMins = endMinutes % 60
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`

      const selectedDateStr = formatDateForDB(selectedDate)

      // Guardar datos ANTIGUOS antes de actualizar (para el email)
      const oldData = {
        oldDate: appointment.appointment_date,
        oldTime: appointment.start_time,
        oldEndTime: appointment.end_time,
        oldEmployeeId: appointment.employee.id,
        // NUEVO: Servicios originales para comparar
        oldServices: appointment.appointment_services.map(as => ({
          service_id: as.service.id,
          service_name: as.service.name,
          price: as.price,
          duration: 0 // No tenemos la duración aquí, se calculará en el backend
        }))
      }

      // Update appointment
      // Si la cita está pending (por business_closed o business_edited), al reprogramar se confirma automáticamente
      const updateData: any = {
        employee_id: selectedEmployee,
        appointment_date: selectedDateStr,
        start_time: `${startTime}:00`,
        end_time: endTime,
        total_price: totalPrice
      }

      // Si está pending, confirmarla automáticamente al reprogramar
      if (appointment.status === 'pending') {
        updateData.status = 'confirmed'
        updateData.pending_reason = null
      }

      const { error: appointmentError } = await supabase
        .from('appointments')
        .update(updateData)
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

      // Check if services changed
      const originalServiceIds = appointment.appointment_services.map(as => as.service.id).sort()
      const newServiceIds = selectedServices.map(s => s.id).sort()
      const servicesChanged = JSON.stringify(originalServiceIds) !== JSON.stringify(newServiceIds)

      if (servicesChanged) {
        // Delete old services
        await supabase
          .from('appointment_services')
          .delete()
          .eq('appointment_id', appointment.id)

        // Insert new services
        const appointmentServicesData = selectedServices.map(service => ({
          appointment_id: appointment.id,
          service_id: service.id,
          price: service.price
        }))

        await supabase
          .from('appointment_services')
          .insert(appointmentServicesData)
      }

      // Enviar notificaciones de modificación al cliente y al negocio
      try {
        await fetch('/api/send-rescheduled-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: appointment.id,
            changes: oldData
          })
        })
        console.log('✅ Rescheduled emails sent')
      } catch (emailError) {
        console.error('⚠️ Error sending rescheduled emails:', emailError)
        // No bloqueamos el flujo si falla el envío de correos
      }

      toast({
        title: 'Cita actualizada',
        description: 'Los cambios se han guardado exitosamente.',
      })

      onSuccess()
      onClose()
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 20 : -20,
      opacity: 0
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-gray-900 border-none shadow-2xl rounded-[2rem] overflow-hidden p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white italic">
            {appointment.status === 'pending' && appointment.pending_reason === 'business_closed' 
              ? '🔄 Reprogramar Cita Requerida' 
              : 'Modificar Cita'}
          </DialogTitle>
          <DialogDescription className="font-medium text-gray-500 dark:text-gray-400">
            {appointment.status === 'pending' && appointment.pending_reason === 'business_closed'
              ? 'El negocio estará cerrado - Elige una nueva fecha'
              : `Paso ${currentStep} de 3`}
          </DialogDescription>
        </DialogHeader>

        {/* Alert para business_closed */}
        {appointment.status === 'pending' && appointment.pending_reason === 'business_closed' && (
          <Alert className="border-2 border-orange-400 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20 mx-6 mt-4">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
            <AlertDescription className="text-sm text-orange-900 dark:text-orange-200">
              <p className="font-bold">El negocio estará cerrado el día de tu cita original.</p>
              <p className="mt-1 font-medium opacity-90">Por favor, selecciona una nueva fecha y hora disponible. Los servicios y profesional ya están pre-seleccionados.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Indicator */}
        <div className="flex gap-2 px-6 my-6">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                currentStep >= step ? 'bg-primary shadow-[0_0_8px_rgba(249,115,22,0.3)]' : 'bg-gray-100 dark:bg-gray-800'
              }`}
            />
          ))}
        </div>

        {/* Content with AnimatePresence */}
        <div className="flex-1 overflow-y-auto overflow-x-visible">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              {/* Step 1: Services */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="px-6">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Selecciona servicios</h3>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                      Puedes agregar nuevos servicios o quitar los existentes. Debe haber al menos un servicio seleccionado.
                    </p>
                  </div>

                  {/* Available Services */}
                  <div className="space-y-3 px-6 pb-6">
                    {availableServices.map((service) => {
                      const isOriginal = appointment.appointment_services.some(as => as.service.id === service.id)
                      const isSelected = selectedServices.some(s => s.id === service.id)
                      const isNewlyAdded = isSelected && !isOriginal
                      const willBeRemoved = isOriginal && !isSelected

                      return (
                        <div
                          key={service.id}
                          className={`group cursor-pointer border-2 rounded-2xl p-4 transition-all duration-300 ${
                            isSelected
                              ? 'border-primary bg-orange-50/30 dark:bg-orange-950/10 shadow-lg shadow-orange-500/5'
                              : willBeRemoved
                              ? 'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/10'
                              : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700'
                          }`}
                          onClick={() => handleServiceToggle(service)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="pt-1">
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'bg-primary border-primary rotate-0' : 'border-gray-200 dark:border-gray-700 rotate-90'
                              }`}>
                                {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-black text-gray-900 dark:text-white tracking-tight">{service.name}</h4>
                                {isOriginal && isSelected && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                    Original
                                  </span>
                                )}
                                {isNewlyAdded && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                     Nuevo
                                  </span>
                                )}
                                {willBeRemoved && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                                    ❌ Se quitará
                                  </span>
                                )}
                              </div>
                              {service.description && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 line-clamp-1">{service.description}</p>}
                              <div className="flex items-center gap-4 mt-3">
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{service.duration_minutes} min</span>
                                </div>
                                <div className="font-black text-gray-900 dark:text-white text-sm decoration-primary/30 underline underline-offset-4">{formatPrice(service.price)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Employee */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="px-6">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Selecciona profesional</h3>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Elige quién realizará el servicio</p>
                  </div>
                  
                  <div className="space-y-3 px-6 pb-6">
                    {availableEmployees.map((employee) => (
                      <div
                        key={employee.id}
                        className={`group cursor-pointer border-2 rounded-[2rem] p-4 transition-all duration-300 hover:shadow-lg ${
                          selectedEmployee === employee.id
                            ? 'border-primary bg-orange-50/30 dark:bg-orange-950/10 shadow-orange-500/5'
                            : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                        onClick={() => setSelectedEmployee(employee.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className="w-14 h-14 border-2 border-white dark:border-gray-700 shadow-xl transition-transform group-hover:scale-110">
                              <AvatarImage src={employee.avatar_url} />
                              <AvatarFallback className="bg-primary text-white font-black text-xs">
                                {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full shadow-sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-[0.2em] block mb-0.5">Profesional</span>
                            <h4 className="font-black text-gray-900 dark:text-white tracking-tight">{employee.first_name} {employee.last_name}</h4>
                            {employee.position && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{employee.position}</p>}
                          </div>
                          {selectedEmployee === employee.id && (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                              <CheckCircle className="w-6 h-6 text-primary" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Date & Time */}
              {currentStep === 3 && (
                <div className="space-y-6 px-6 pb-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Calendar - Left */}
                    <div className="flex-1 bg-white dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm">
                      <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Fecha de la Cita
                      </h4>
                      <div className="flex justify-center">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          defaultMonth={selectedDate || new Date()}
                          locale={es}
                          disabled={(date) => {
                            const today = new Date()
                            const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                            const checkingDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                            return checkingDateOnly < todayDateOnly
                          }}
                          fromYear={new Date().getFullYear()}
                          toYear={new Date().getFullYear() + 1}
                          className="rounded-md border-none dark:bg-transparent"
                        />
                      </div>
                    </div>

                    {/* Time Slots - Right */}
                    <div className="flex-1 bg-white dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm flex flex-col">
                      <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Horarios Disponibles
                      </h4>
                      
                      {!selectedDate ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center opacity-40">
                          <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <Clock className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest text-gray-500">Selecciona una fecha</p>
                        </div>
                      ) : !specialHourForDate?.is_closed && availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto pr-2 scrollbar-thin dark:scrollbar-thumb-gray-700 max-h-[300px]">
                          {availableSlots.map((slot) => (
                            <Button
                              key={slot.time}
                              variant={selectedTime === slot.time ? "default" : "outline"}
                              onClick={() => setSelectedTime(slot.time)}
                              className={`
                                h-11 rounded-xl text-xs font-black tracking-tight transition-all duration-300
                                ${selectedTime === slot.time 
                                  ? 'bg-primary text-white border-primary shadow-lg shadow-orange-500/20 scale-105' 
                                  : 'border-gray-100 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:text-primary dark:hover:text-primary bg-gray-50/50 dark:bg-gray-900/50'
                                }
                              `}
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest text-red-500">
                            {specialHourForDate?.is_closed 
                              ? 'Negocio cerrado'
                              : 'Sin disponibilidad'
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Special Hours Alert - Adaptive Bottom */}
                  {specialHourForDate && selectedDate && !specialHourForDate.is_closed && (
                    <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 flex items-start gap-4 animate-in slide-in-from-bottom-2 duration-500">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm flex-shrink-0">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-950 dark:text-blue-200 uppercase tracking-widest">Atención Especial</p>
                        <p className="text-xs font-medium text-blue-800/80 dark:text-blue-300/80 leading-relaxed mt-0.5">
                          Este día el negocio tiene un horario modificado: {specialHourForDate.open_time?.slice(0, 5)} - {specialHourForDate.close_time?.slice(0, 5)} por {specialHourForDate.reason || 'Día especial'}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 backdrop-blur-md">
          <div className="flex items-center justify-between w-full gap-4">
            <Button 
              variant="ghost" 
              onClick={handleBack} 
              disabled={currentStep === 1 || saving}
              className="rounded-xl h-12 px-6 text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              Atrás
            </Button>
            
            <Button 
              onClick={handleNext} 
              disabled={saving} 
              className={`
                rounded-xl h-12 px-10 text-[11px] font-black uppercase tracking-widest transition-all duration-300 shadow-xl active:scale-95
                ${currentStep === 3 
                  ? 'bg-primary text-white hover:bg-orange-600 shadow-orange-500/20' 
                  : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100 shadow-gray-900/20 dark:shadow-white/5'
                }
              `}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  <span>Guardando</span>
                </div>
              ) : currentStep === 3 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Cambios
                </>
              ) : (
                <>
                  Continuar
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
