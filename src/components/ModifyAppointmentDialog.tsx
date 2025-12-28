'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, User, CheckCircle, Loader2 } from 'lucide-react'
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
    const isOriginalService = appointment.appointment_services.some(
      as => as.service.id === service.id
    )

    if (isOriginalService) {
      toast({
        variant: 'destructive',
        title: 'No se puede quitar',
        description: 'No puedes quitar servicios que ya tienes reservados. Solo puedes agregar nuevos servicios.',
      })
      return
    }

    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id)
      if (isSelected) {
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
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Modificar Cita</DialogTitle>
          <DialogDescription>Paso {currentStep} de 3</DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex gap-2 my-4">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                currentStep >= step ? 'bg-slate-900' : 'bg-slate-200'
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
                  <h3 className="text-lg font-bold text-gray-900">Selecciona servicios</h3>

                  {/* Current Services */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Servicios actuales</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {appointment.appointment_services.map((appService, index) => (
                        <div key={index} className="inline-flex items-center gap-2 bg-slate-100 border border-slate-300 px-3 py-2 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-slate-600" />
                          <span className="text-sm font-medium text-slate-700">{appService.service.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Available Services */}
                  <div className="space-y-2">
                    {availableServices.map((service) => {
                      const isOriginal = appointment.appointment_services.some(as => as.service.id === service.id)
                      const isSelected = selectedServices.some(s => s.id === service.id)
                      const isNewlyAdded = isSelected && !isOriginal

                      return (
                        <div
                          key={service.id}
                          className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                            isOriginal
                              ? 'opacity-50 cursor-not-allowed border-slate-300 bg-slate-50'
                              : isNewlyAdded
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                          onClick={() => !isOriginal && handleServiceToggle(service)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="pt-1">
                              {isOriginal ? (
                                <CheckCircle className="w-6 h-6 text-slate-400" />
                              ) : (
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                                  isNewlyAdded ? 'bg-slate-900 border-slate-900' : 'border-slate-300'
                                }`}>
                                  {isNewlyAdded && <CheckCircle className="w-5 h-5 text-white" />}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900">{service.name}</h4>
                              {service.description && <p className="text-sm text-gray-600 mt-1">{service.description}</p>}
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  <span>{service.duration_minutes} min</span>
                                </div>
                                <div className="font-bold text-slate-900">{formatPrice(service.price)}</div>
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
                  <h3 className="text-lg font-bold text-gray-900">Selecciona profesional</h3>
                  <div className="space-y-2">
                    {availableEmployees.map((employee) => (
                      <div
                        key={employee.id}
                        className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                          selectedEmployee === employee.id
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                        onClick={() => setSelectedEmployee(employee.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                            {employee.avatar_url ? (
                              <img src={employee.avatar_url} alt={employee.first_name} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-slate-700" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{employee.first_name} {employee.last_name}</h4>
                            {employee.position && <p className="text-sm text-slate-600">{employee.position}</p>}
                          </div>
                          {selectedEmployee === employee.id && <CheckCircle className="w-6 h-6 text-slate-900" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Date & Time */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Selecciona fecha y hora</h3>

                  {/* Calendar - First (Top) */}
                  <div className="border-2 border-slate-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Fecha</h4>
                    <div className="flex justify-center">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        defaultMonth={selectedDate || new Date()}
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
                          const today = new Date()
                          const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                          const checkingDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                          return checkingDateOnly < todayDateOnly
                        }}
                        fromYear={new Date().getFullYear()}
                        toYear={new Date().getFullYear() + 1}
                        className="rounded-md"
                        captionLayout="dropdown"
                      />
                    </div>
                  </div>

                  {/* Special Hours Alert */}
                  {specialHourForDate && selectedDate && (
                    <div className={`p-4 rounded-lg border-2 ${
                      specialHourForDate.is_closed
                        ? 'bg-red-50 border-red-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          specialHourForDate.is_closed
                            ? 'bg-red-100'
                            : 'bg-blue-100'
                        }`}>
                          <span className="text-sm">⚠️</span>
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold text-sm ${
                            specialHourForDate.is_closed
                              ? 'text-red-900'
                              : 'text-blue-900'
                          }`}>
                            {specialHourForDate.is_closed ? 'Negocio cerrado' : 'Horario especial'}
                          </p>
                          <p className={`text-sm mt-1 ${
                            specialHourForDate.is_closed
                              ? 'text-red-700'
                              : 'text-blue-700'
                          }`}>
                            {specialHourForDate.is_closed
                              ? `El negocio estará cerrado este día (${specialHourForDate.reason || 'Día especial'}). Por favor selecciona otra fecha.`
                              : `El negocio tendrá horario especial: ${specialHourForDate.open_time?.slice(0, 5)} - ${specialHourForDate.close_time?.slice(0, 5)} (${specialHourForDate.reason || 'Horario especial'})`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Time Slots - Second (Bottom) */}
                  <div className="border-2 border-slate-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {selectedDate ? `Horarios disponibles` : 'Primero selecciona una fecha'}
                    </h4>
                    {!selectedDate ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center text-gray-400">
                          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Selecciona una fecha primero</p>
                        </div>
                      </div>
                    ) : !specialHourForDate?.is_closed && availableSlots.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={selectedTime === slot.time ? "default" : "outline"}
                            onClick={() => setSelectedTime(slot.time)}
                            className={selectedTime === slot.time ? 'bg-slate-900 hover:bg-slate-800' : 'border-2 hover:border-slate-900'}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center text-gray-400">
                          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">
                            {specialHourForDate?.is_closed 
                              ? 'El negocio está cerrado este día'
                              : 'No hay horarios disponibles'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || saving}>
            Atrás
          </Button>
          <Button onClick={handleNext} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : currentStep === 3 ? (
              'Guardar Cambios'
            ) : (
              'Continuar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
