'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { toDateString } from '@/lib/dateUtils'
import OverlappingAppointmentsDialog from './OverlappingAppointmentsDialog'
import AppointmentCard from './calendar/AppointmentCard'
import AppointmentTooltip from './calendar/AppointmentTooltip'

import type { Employee, Appointment } from '@/types/database'

// Lazy load AppointmentModal
const AppointmentModal = dynamic(() => import('./AppointmentModal'), {
  loading: () => <div className="text-center p-4">Cargando...</div>
})

// Simplificamos la interfaz solo para las propiedades que necesitamos en esta vista
type CalendarEmployee = Pick<Employee, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'is_active'>

// CalendarAppointment es ahora un alias de Appointment ya que tienen la misma estructura
type CalendarAppointment = Appointment

interface EmployeeAbsence {
  id: string
  employee_id: string
  absence_date: string
  reason: string
  is_full_day: boolean
  start_time?: string
  end_time?: string
  notes?: string
}

interface CalendarViewProps {
  selectedDate: Date
  appointments: CalendarAppointment[]
  employees: CalendarEmployee[]
  viewType: 'day' | 'week'
  businessId: string
  businessStartHour?: number // Default 7 AM
  businessEndHour?: number   // Default 21 PM (9 PM)
  onRefresh: () => void
  onCreateAppointment: (date?: Date, time?: string, employeeId?: string) => void
  onEditAppointment: (appointment: CalendarAppointment) => void
}

// Configuración del calendario
const HOUR_HEIGHT = 60 // px por hora
// START_HOUR y END_HOUR ahora son dinámicos, se pasan como props

// Helper functions - now accept startHour parameter
const getTimePosition = (time: string, startHour: number) => {
  const [hours, minutes] = time.split(':').map(Number)
  const totalMinutes = (hours - startHour) * 60 + minutes
  return (totalMinutes / 60) * HOUR_HEIGHT
}

const getAppointmentHeight = (startTime: string, endTime: string, startHour: number) => {
  const start = getTimePosition(startTime, startHour)
  const end = getTimePosition(endTime, startHour)
  return end - start
}

const getStatusColor = (status: string) => {
  const colors = {
    pending: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    confirmed: 'bg-green-100 border-green-400 text-green-800',
    in_progress: 'bg-blue-100 border-blue-400 text-blue-800',
    completed: 'bg-gray-100 border-gray-400 text-gray-600',
    cancelled: 'bg-red-100 border-red-400 text-red-800',
    no_show: 'bg-orange-100 border-orange-400 text-orange-800'
  }
  return colors[status as keyof typeof colors] || colors.pending
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

const formatDuration = (startTime: string, endTime: string) => {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  const totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}min`
  } else if (hours > 0) {
    return `${hours}h`
  } else {
    return `${minutes}min`
  }
}

// Helper para detectar si dos citas se superponen
const appointmentsOverlap = (apt1: Appointment, apt2: Appointment): boolean => {
  const start1 = apt1.start_time
  const end1 = apt1.end_time
  const start2 = apt2.start_time
  const end2 = apt2.end_time

  // Convertir a minutos desde medianoche para comparación
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const start1Min = toMinutes(start1)
  const end1Min = toMinutes(end1)
  const start2Min = toMinutes(start2)
  const end2Min = toMinutes(end2)

  // Overlap si: start1 < end2 AND start2 < end1
  return start1Min < end2Min && start2Min < end1Min
}

// Helper para agrupar citas superpuestas
const groupOverlappingAppointments = (appointments: Appointment[]): Appointment[][] => {
  if (appointments.length === 0) return []

  const sorted = [...appointments].sort((a, b) => {
    return a.start_time.localeCompare(b.start_time)
  })

  const groups: Appointment[][] = []
  const used = new Set<string>()

  sorted.forEach((apt) => {
    if (used.has(apt.id)) return

    // Buscar todas las citas que se superponen con esta
    const group = [apt]
    used.add(apt.id)

    sorted.forEach((otherApt) => {
      if (used.has(otherApt.id) || apt.id === otherApt.id) return

      // Verificar si se superpone con alguna cita del grupo
      const overlapsWithGroup = group.some(groupApt => appointmentsOverlap(groupApt, otherApt))

      if (overlapsWithGroup) {
        group.push(otherApt)
        used.add(otherApt.id)
      }
    })

    groups.push(group)
  })

  return groups
}

export default function CalendarView({
  selectedDate,
  appointments,
  employees,
  viewType,
  businessId,
  businessStartHour = 7,
  businessEndHour = 21,
  onRefresh,
  onCreateAppointment,
  onEditAppointment
}: CalendarViewProps) {
  // Calculate HOURS array dynamically based on business hours
  const HOURS = Array.from({ length: businessEndHour - businessStartHour + 1 }, (_, i) => businessStartHour + i)
  const START_HOUR = businessStartHour
  const END_HOUR = businessEndHour
  const [absences, setAbsences] = useState<EmployeeAbsence[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [draggingAppointment, setDraggingAppointment] = useState<CalendarAppointment | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    employeeId?: string
    date?: string
    time?: string
  } | null>(null)
  const [hoveredAppointment, setHoveredAppointment] = useState<{
    appointment: CalendarAppointment
    position: { x: number; y: number }
  } | null>(null)
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)
  const [overlappingDialogOpen, setOverlappingDialogOpen] = useState(false)
  const [overlappingAppointments, setOverlappingAppointments] = useState<CalendarAppointment[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const { toast } = useToast()

  // Calculate week range for week view - Memoized for performance
  const weekDates = useMemo(() => {
    if (viewType !== 'week') return []

    const dates: Date[] = []
    const current = new Date(selectedDate)
    // Get Monday of the week
    const day = current.getDay()
    const diff = current.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    const monday = new Date(current.setDate(diff))

    // Get all 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [selectedDate, viewType])

  useEffect(() => {
    fetchAbsences()
  }, [selectedDate, employees, viewType])

  useEffect(() => {
    // Scroll al horario actual o a las 8 AM
    if (scrollContainerRef.current) {
      const now = new Date()
      const currentHour = now.getHours()
      const scrollPosition = Math.max(0, (currentHour - START_HOUR) * HOUR_HEIGHT - 100)
      scrollContainerRef.current.scrollTop = scrollPosition
    }
  }, [])

  // Memoized fetchAbsences to avoid recreating on every render
  const fetchAbsences = useCallback(async () => {
    if (employees.length === 0) return

    try {
      if (viewType === 'week') {
        // Fetch absences for the entire week
        const startDate = toDateString(weekDates[0])
        const endDate = toDateString(weekDates[6])

        const { data, error } = await supabase
          .from('employee_absences')
          .select('*')
          .gte('absence_date', startDate)
          .lte('absence_date', endDate)
          .in('employee_id', employees.map(e => e.id))

        if (error) throw error
        setAbsences(data || [])
      } else {
        // Fetch absences for single day
        const dateStr = toDateString(selectedDate)

        const { data, error} = await supabase
          .from('employee_absences')
          .select('*')
          .eq('absence_date', dateStr)
          .in('employee_id', employees.map(e => e.id))

        if (error) throw error
        setAbsences(data || [])
      }
    } catch (error) {
      console.error('Error fetching absences:', error)
    }
  }, [employees, viewType, weekDates, selectedDate, supabase])

  // Helper functions that depend on appointment data AND NOW business hours
  const getClientName = useCallback((appointment: CalendarAppointment) => {
    // 1. Cliente registrado (con cuenta TuTurno)
    if (appointment.users) {
      return `${appointment.users.first_name} ${appointment.users.last_name}`
    }
    // 2. Cliente del negocio (guardado en business_clients)
    if (appointment.business_clients) {
      const lastName = appointment.business_clients.last_name || ''
      return `${appointment.business_clients.first_name} ${lastName}`.trim()
    }
    // 3. Walk-in (temporal)
    return appointment.walk_in_client_name || 'Cliente'
  }, [])

  // Memoized helper functions for positioning (now use dynamic hours)
  const getTimePositionMemo = useCallback((time: string) => getTimePosition(time, START_HOUR), [START_HOUR])
  const getAppointmentHeightMemo = useCallback((startTime: string, endTime: string) => 
    getAppointmentHeight(startTime, endTime, START_HOUR), [START_HOUR])

  const getClientPhone = useCallback((appointment: CalendarAppointment) => {
    return appointment.users?.phone || appointment.business_clients?.phone || appointment.walk_in_client_phone
  }, [])

  // Event handlers - memoized to prevent unnecessary re-renders
  const handleAppointmentHover = useCallback((e: React.MouseEvent, appointment: Appointment) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredAppointment({
      appointment,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top
      }
    })
  }, [])

  const handleAppointmentLeave = useCallback(() => {
    setHoveredAppointment(null)
  }, [])

  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setSelectedAppointment(null)
  }, [])

  const handleAppointmentUpdate = useCallback(() => {
    onRefresh()
    handleCloseModal()
  }, [onRefresh, handleCloseModal])

  const handleTimeSlotClick = useCallback((employeeId: string, clickY: number, containerTop: number) => {
    if (!onCreateAppointment) return

    // Calculate the time based on click position
    const relativeY = clickY - containerTop
    const totalMinutes = (relativeY / HOUR_HEIGHT) * 60
    const hours = Math.floor(totalMinutes / 60) + START_HOUR
    const minutes = Math.round((totalMinutes % 60) / 15) * 15 // Round to nearest 15 minutes

    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

    onCreateAppointment(selectedDate, timeString, employeeId)
  }, [selectedDate, onCreateAppointment])

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, appointment: Appointment) => {
    setDraggingAppointment(appointment)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML)
  }

  const handleDragEnd = () => {
    setDraggingAppointment(null)
    setDropTarget(null)
  }

  const handleDragOver = (e: React.DragEvent, employeeId?: string, date?: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    // Calculate time based on mouse position
    const rect = e.currentTarget.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const totalMinutes = (relativeY / HOUR_HEIGHT) * 60
    const hours = Math.floor(totalMinutes / 60) + START_HOUR
    const minutes = Math.round((totalMinutes % 60) / 15) * 15
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

    setDropTarget({ employeeId, date, time: timeString })
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = async (e: React.DragEvent, targetEmployeeId: string, targetDate?: string) => {
    e.preventDefault()

    if (!draggingAppointment) return

    // Capture OLD values for email notification
    const oldDate = draggingAppointment.appointment_date
    const oldTime = draggingAppointment.start_time
    const oldEndTime = draggingAppointment.end_time
    const oldEmployeeId = draggingAppointment.employee_id

    // Calculate new time
    const rect = e.currentTarget.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const totalMinutes = (relativeY / HOUR_HEIGHT) * 60
    const hours = Math.floor(totalMinutes / 60) + START_HOUR
    const minutes = Math.round((totalMinutes % 60) / 15) * 15
    const newStartTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`

    // Calculate end time based on duration
    const duration = draggingAppointment.appointment_services?.[0]?.services?.duration_minutes || 60
    const endHours = Math.floor((hours * 60 + minutes + duration) / 60)
    const endMinutes = (hours * 60 + minutes + duration) % 60
    const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`

    // Determine target date
    const newDate = targetDate || toDateString(selectedDate)

    try {
      // Update appointment
      const { error } = await supabase
        .from('appointments')
        .update({
          employee_id: targetEmployeeId,
          appointment_date: newDate,
          start_time: newStartTime,
          end_time: newEndTime
        })
        .eq('id', draggingAppointment.id)

      if (error) throw error

      // Send rescheduled email
      try {
        await fetch('/api/send-rescheduled-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: draggingAppointment.id,
            changes: {
              oldDate,
              oldTime,
              oldEndTime,
              oldEmployeeId
            }
          })
        })
      } catch (emailError) {
        console.warn('⚠️ Failed to send rescheduled email:', emailError)
        // Don't block the operation if email fails
      }

      toast({
        title: 'Cita reagendada',
        description: `La cita ha sido movida a ${newStartTime.substring(0, 5)} exitosamente.`,
      })

      onRefresh()
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast({
        variant: 'destructive',
        title: 'Error al reagendar',
        description: 'No se pudo mover la cita. Inténtalo de nuevo.',
      })
    } finally {
      setDraggingAppointment(null)
      setDropTarget(null)
    }
  }

  // Render tooltip using modular component
  const renderTooltip = () => {
    if (!hoveredAppointment) return null

    const { appointment, position } = hoveredAppointment
    const employee = employees.find(e => e.id === appointment.employee_id)

    return (
      <AppointmentTooltip
        appointment={appointment}
        position={position}
        clientName={getClientName(appointment)}
        employee={employee}
      />
    )
  }

  if (employees.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No hay empleados seleccionados</p>
          <p className="text-sm text-gray-400">Selecciona al menos un empleado para ver las citas</p>
        </div>
      </div>
    )
  }

  // Render week view
  if (viewType === 'week') {
    return (
      <>
        <div className="h-full flex flex-col">
          {/* Header de días de la semana */}
          <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
            {/* Columna de horas (placeholder) */}
            <div className="w-16 flex-shrink-0 border-r border-gray-200" />

            {/* Columnas de días */}
            {weekDates.map((date) => {
              const isToday = date.toDateString() === new Date().toDateString()
              const dayAppointments = appointments.filter(
                apt => apt.appointment_date === toDateString(date)
              )

              return (
                <div
                  key={date.toISOString()}
                  className={`flex-1 min-w-[140px] p-3 border-r border-gray-200 last:border-r-0 ${
                    isToday ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase">
                      {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                    </p>
                    <p className={`text-lg font-bold mt-1 ${
                      isToday ? 'text-orange-600' : 'text-gray-900'
                    }`}>
                      {date.getDate()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {dayAppointments.length} cita{dayAppointments.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Grid del calendario semanal */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-auto"
            style={{ scrollBehavior: 'smooth' }}
          >
            <div className="flex min-h-full">
              {/* Columna de horas */}
              <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="relative"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    <span className="absolute -top-2 right-2 text-xs text-gray-500">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Columnas de días con citas */}
              {weekDates.map((date) => {
                const dateStr = toDateString(date)
                const dayAppointments = appointments.filter(
                  apt => apt.appointment_date === dateStr
                )
                const dayAbsences = absences.filter(
                  abs => abs.absence_date === dateStr
                )
                const isToday = date.toDateString() === new Date().toDateString()
                const isDropTarget = dropTarget?.date === dateStr

                return (
                  <div
                    key={dateStr}
                    className={`flex-1 min-w-[140px] border-r border-gray-200 last:border-r-0 relative ${
                      isToday ? 'bg-orange-50/30' : 'bg-white'
                    } ${isDropTarget ? 'bg-blue-50/50' : ''} cursor-pointer hover:bg-gray-50/50 transition-colors`}
                    style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
                    onDragOver={(e) => handleDragOver(e, employees[0]?.id, dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, employees[0]?.id, dateStr)}
                    onClick={(e) => {
                      // For week view, we'll create appointments with the first employee by default
                      const rect = e.currentTarget.getBoundingClientRect()
                      const relativeY = e.clientY - rect.top
                      const totalMinutes = (relativeY / HOUR_HEIGHT) * 60
                      const hours = Math.floor(totalMinutes / 60) + START_HOUR
                      const minutes = Math.round((totalMinutes % 60) / 15) * 15
                      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

                      if (onCreateAppointment) {
                        onCreateAppointment(date, timeString, employees[0]?.id)
                      }
                    }}
                  >
                    {/* Líneas horizontales de horas */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute w-full border-b border-gray-100"
                        style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}
                      />
                    ))}

                    {/* Citas del día */}
                    {(() => {
                      // Agrupar citas superpuestas
                      const appointmentGroups = groupOverlappingAppointments(dayAppointments)

                      return appointmentGroups.map((group, groupIndex) => {
                        // Si solo hay una cita en el grupo, renderizar normalmente
                        if (group.length === 1) {
                          const appointment = group[0]
                          const top = getTimePositionMemo(appointment.start_time)
                          const height = getAppointmentHeightMemo(appointment.start_time, appointment.end_time)
                          const employee = employees.find(e => e.id === appointment.employee_id)
                          const isDragging = draggingAppointment?.id === appointment.id

                          return (
                            <AppointmentCard
                              key={appointment.id}
                              appointment={appointment}
                              top={top}
                              height={height}
                              clientName={getClientName(appointment)}
                              employeeName={employee ? `${employee.first_name} ${employee.last_name}` : undefined}
                              isDragging={isDragging}
                              onMouseEnter={(e) => handleAppointmentHover(e, appointment)}
                              onMouseLeave={handleAppointmentLeave}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAppointmentClick(appointment)
                              }}
                              onDragStart={(e) => handleDragStart(e, appointment)}
                              onDragEnd={handleDragEnd}
                            />
                          )
                        }

                        // Si hay múltiples citas superpuestas, renderizar con Popover
                        const firstAppointment = group[0]
                        const top = getTimePositionMemo(firstAppointment.start_time)
                        const height = getAppointmentHeightMemo(firstAppointment.start_time, firstAppointment.end_time)
                        const employee = employees.find(e => e.id === firstAppointment.employee_id)
                        const isDragging = draggingAppointment?.id === firstAppointment.id

                        return (
                          <div
                            key={`week-${dateStr}-${groupIndex}`}
                            className="absolute inset-x-0"
                            style={{
                              top: `${top}px`,
                              height: `${height}px`
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setOverlappingAppointments(group)
                              setOverlappingDialogOpen(true)
                            }}
                          >
                            <AppointmentCard
                              appointment={firstAppointment}
                              height={height}
                              clientName={getClientName(firstAppointment)}
                              employeeName={employee ? `${employee.first_name} ${employee.last_name}` : undefined}
                              isDragging={isDragging}
                              onDragStart={(e) => handleDragStart(e, firstAppointment)}
                              onDragEnd={handleDragEnd}
                              draggable={firstAppointment.status !== 'completed' && firstAppointment.status !== 'cancelled'}
                            />
                            
                            {/* Badge de citas adicionales */}
                            <div className="absolute top-1 right-1 bg-orange-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg border-2 border-white z-30">
                              +{group.length - 1}
                            </div>
                          </div>
                        )
                      })
                    })()}

                    {/* Drop preview indicator */}
                    {draggingAppointment && isDropTarget && dropTarget?.time && (
                      <div
                        className="absolute inset-x-1 rounded-lg border-2 border-dashed border-blue-400 bg-blue-100/30 z-10 pointer-events-none"
                        style={{
                          top: `${getTimePositionMemo(dropTarget.time)}px`,
                          height: `${(draggingAppointment.appointment_services?.[0]?.services?.duration_minutes || 60) * (HOUR_HEIGHT / 60)}px`
                        }}
                      >
                        <div className="flex items-center justify-center h-full">
                          <p className="text-xs font-semibold text-blue-600">
                            Soltar aquí
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Línea de hora actual (si es hoy) */}
                    {isToday && <CurrentTimeLine startHour={START_HOUR} endHour={END_HOUR} />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal de detalles */}
        {showModal && selectedAppointment && (
          <AppointmentModal
            appointment={selectedAppointment}
            onClose={handleCloseModal}
            onUpdate={handleAppointmentUpdate}
            onEdit={
              onEditAppointment
                ? () => {
                    handleCloseModal()
                    onEditAppointment(selectedAppointment)
                  }
                : undefined
            }
          />
        )}

        {/* Render Tooltip */}
        {renderTooltip()}

        {/* Dialog de citas superpuestas */}
        <OverlappingAppointmentsDialog
          isOpen={overlappingDialogOpen}
          onClose={() => setOverlappingDialogOpen(false)}
          appointments={overlappingAppointments}
          employees={employees}
          onAppointmentClick={handleAppointmentClick}
        />

        {/* Tooltip */}
        
      </>
    )
  }

  // Render day view
  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header de empleados - Oculto en móvil, visible en tablet+ */}
        <div className="hidden md:flex border-b border-gray-200 bg-white sticky top-0 z-10">
          {/* Columna de horas (placeholder) */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200" />

          {/* Columnas de empleados */}
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="flex-1 min-w-[200px] py-4 border-r border-gray-200 last:border-r-0"
            >
              <div className="flex flex-col items-center gap-2">
                <Avatar className="w-12 h-12 border-2 border-orange-500">
                  <AvatarImage src={employee.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-600 to-amber-600 text-white">
                    {getInitials(employee.first_name, employee.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900">
                    {employee.first_name} {employee.last_name}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Vista móvil - Lista de citas */}
        <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4">
          {employees.map((employee) => {
            const employeeAppointments = appointments.filter(
              (apt) => apt.employee_id === employee.id
            )
            const employeeAbsence = absences.find((abs) => abs.employee_id === employee.id)

            return (
              <div key={employee.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Header del empleado */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-orange-500">
                      <AvatarImage src={employee.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-600 to-amber-600 text-white text-sm">
                        {getInitials(employee.first_name, employee.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {employeeAppointments.length} cita{employeeAppointments.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ausencia */}
                {employeeAbsence && (
                  <div className="bg-gray-100 p-3 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-700">
                      {employeeAbsence.reason === 'enfermedad' && '🤒 Enfermedad'}
                      {employeeAbsence.reason === 'vacaciones' && '🏖️ Vacaciones'}
                      {employeeAbsence.reason === 'personal' && '📅 Personal'}
                      {employeeAbsence.reason === 'emergencia' && '🚨 Emergencia'}
                      {employeeAbsence.reason === 'otro' && '📝 Otro'}
                    </p>
                    {employeeAbsence.notes && (
                      <p className="text-xs text-gray-600 mt-1">{employeeAbsence.notes}</p>
                    )}
                  </div>
                )}

                {/* Lista de citas */}
                {employeeAppointments.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {employeeAppointments.map((appointment) => {
                      const serviceName = appointment.appointment_services?.[0]?.services?.name || 'Servicio'
                      return (
                        <div
                          key={appointment.id}
                          className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${getStatusColor(
                            appointment.status
                          ).replace('border-l-4', 'border-l-4')}`}
                          style={{ borderLeftWidth: '4px' }}
                          onClick={() => handleAppointmentClick(appointment)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {getClientName(appointment)}
                                {!appointment.client_id && (
                                  <span className="ml-1 text-xs font-normal text-orange-600">👤 Walk-in</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600 truncate mt-0.5">{serviceName}</p>
                              <p className="text-xs font-medium text-gray-700 mt-1">
                                {appointment.start_time.substring(0, 5)} - {appointment.end_time.substring(0, 5)}
                              </p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                ${appointment.total_price}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    Sin citas
                  </div>
                )}
              </div>
            )
          })}

          {appointments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay citas programadas para este día</p>
            </div>
          )}
        </div>

        {/* Grid del calendario - Desktop */}
        <div
          ref={scrollContainerRef}
          className="hidden md:block flex-1 overflow-y-auto overflow-x-auto"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="flex min-h-full">
            {/* Columna de horas */}
            <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="relative"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="absolute -top-2 right-2 text-xs text-gray-500">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Columnas de empleados con citas */}
            {employees.map((employee) => {
              const employeeAppointments = appointments.filter(
                (apt) => apt.employee_id === employee.id
              )
              const employeeAbsence = absences.find((abs) => abs.employee_id === employee.id)
              const isDropTarget = dropTarget?.employeeId === employee.id

              return (
                <div
                  key={employee.id}
                  className={`flex-1 min-w-[200px] border-r border-gray-200 last:border-r-0 relative bg-white cursor-pointer hover:bg-gray-50/50 transition-colors ${
                    isDropTarget ? 'bg-blue-50/50' : ''
                  }`}
                  style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
                  onDragOver={(e) => handleDragOver(e, employee.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, employee.id)}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    handleTimeSlotClick(employee.id, e.clientY, rect.top)
                  }}
                >
                  {/* Líneas horizontales de horas */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute w-full border-b border-gray-100"
                      style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Ausencia del empleado (si existe) */}
                  {employeeAbsence && (
                    <div
                      className="absolute inset-x-0 bg-gray-200/80 border-2 border-gray-400 border-dashed flex items-center justify-center z-10 cursor-not-allowed"
                      style={{
                        top: employeeAbsence.is_full_day
                          ? 0
                          : getTimePositionMemo(employeeAbsence.start_time || '08:00'),
                        height: employeeAbsence.is_full_day
                          ? '100%'
                          : getAppointmentHeightMemo(
                              employeeAbsence.start_time || '08:00',
                              employeeAbsence.end_time || '20:00'
                            )
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-center p-2">
                        <p className="text-sm font-semibold text-gray-700">
                          {employeeAbsence.reason === 'enfermedad' && '🤒 Enfermedad'}
                          {employeeAbsence.reason === 'vacaciones' && '🏖️ Vacaciones'}
                          {employeeAbsence.reason === 'personal' && '📅 Personal'}
                          {employeeAbsence.reason === 'emergencia' && '🚨 Emergencia'}
                          {employeeAbsence.reason === 'otro' && '📝 Otro'}
                        </p>
                        {employeeAbsence.notes && (
                          <p className="text-xs text-gray-600 mt-1">{employeeAbsence.notes}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Citas del empleado */}
                  {(() => {
                    // Agrupar citas superpuestas
                    const appointmentGroups = groupOverlappingAppointments(employeeAppointments)

                    return appointmentGroups.map((group, groupIndex) => {
                      // Si solo hay una cita en el grupo, renderizar normalmente
                      if (group.length === 1) {
                        const appointment = group[0]
                        const top = getTimePositionMemo(appointment.start_time)
                        const height = getAppointmentHeightMemo(appointment.start_time, appointment.end_time)
                        const serviceName = appointment.appointment_services?.[0]?.services?.name || 'Servicio'
                        const isDragging = draggingAppointment?.id === appointment.id

                        return (
                          <AppointmentCard
                            key={appointment.id}
                            appointment={appointment}
                            top={top}
                            height={height}
                            clientName={getClientName(appointment)}
                            isDragging={isDragging}
                            onMouseEnter={(e) => handleAppointmentHover(e, appointment)}
                            onMouseLeave={handleAppointmentLeave}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAppointmentClick(appointment)
                            }}
                            onDragStart={(e) => handleDragStart(e, appointment)}
                            onDragEnd={handleDragEnd}
                          />
                        )
                      }

                      // Si hay múltiples citas superpuestas, renderizar con Popover
                      const firstAppointment = group[0]
                      const top = getTimePositionMemo(firstAppointment.start_time)
                      const height = getAppointmentHeightMemo(firstAppointment.start_time, firstAppointment.end_time)
                      const employee = employees.find(e => e.id === firstAppointment.employee_id)
                      const isDragging = draggingAppointment?.id === firstAppointment.id

                      return (
                        <div
                          key={`day-${employee?.id}-${groupIndex}`}
                          className="absolute inset-x-0"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setOverlappingAppointments(group)
                            setOverlappingDialogOpen(true)
                          }}
                        >
                          <AppointmentCard
                            appointment={firstAppointment}
                            height={height}
                            clientName={getClientName(firstAppointment)}
                            employeeName={employee ? `${employee.first_name} ${employee.last_name}` : undefined}
                            isDragging={isDragging}
                            onDragStart={(e) => handleDragStart(e, firstAppointment)}
                            onDragEnd={handleDragEnd}
                            draggable={firstAppointment.status !== 'completed' && firstAppointment.status !== 'cancelled'}
                          />
                          
                          {/* Badge de citas adicionales */}
                          <div className="absolute top-1 right-1 bg-orange-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white z-30">
                            +{group.length - 1}
                          </div>
                        </div>
                      )
                    })
                  })()}

                  {/* Drop preview indicator */}
                  {draggingAppointment && isDropTarget && dropTarget?.time && (
                    <div
                      className="absolute inset-x-1 rounded-lg border-2 border-dashed border-blue-400 bg-blue-100/30 z-10 pointer-events-none"
                      style={{
                        top: `${getTimePositionMemo(dropTarget.time)}px`,
                        height: `${(draggingAppointment.appointment_services?.[0]?.services?.duration_minutes || 60) * (HOUR_HEIGHT / 60)}px`
                      }}
                    >
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xs font-semibold text-blue-600">
                          Soltar aquí
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Línea de hora actual (si es hoy) */}
                  {selectedDate.toDateString() === new Date().toDateString() && (
                    <CurrentTimeLine startHour={START_HOUR} endHour={END_HOUR} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal de detalles */}
      {showModal && selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={handleCloseModal}
          onUpdate={handleAppointmentUpdate}
          onEdit={
            onEditAppointment
              ? () => {
                  handleCloseModal()
                  onEditAppointment(selectedAppointment)
                }
              : undefined
          }
        />
      )}

      {/* Render Tooltip */}
      {renderTooltip()}

      {/* Dialog de citas superpuestas */}
      <OverlappingAppointmentsDialog
        isOpen={overlappingDialogOpen}
        onClose={() => setOverlappingDialogOpen(false)}
        appointments={overlappingAppointments}
        employees={employees}
        onAppointmentClick={handleAppointmentClick}
      />

      {/* Tooltip */}
     
    </>
  )
}

// Componente para la línea de hora actual
function CurrentTimeLine({ startHour, endHour }: { startHour: number; endHour: number }) {
  const [position, setPosition] = useState(0)

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()

      if (hours >= startHour && hours <= endHour) {
        const totalMinutes = (hours - startHour) * 60 + minutes
        const pos = (totalMinutes / 60) * HOUR_HEIGHT
        setPosition(pos)
      }
    }

    updatePosition()
    const interval = setInterval(updatePosition, 60000) // Actualizar cada minuto

    return () => clearInterval(interval)
  }, [startHour, endHour])

  if (position === 0) return null

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${position}px` }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
        <div className="flex-1 h-0.5 bg-red-500" />
      </div>
    </div>
  )


}


