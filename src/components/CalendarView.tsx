'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { parseDateString, toDateString } from '@/lib/dateUtils'

import type { Employee, Appointment, AppointmentStatus } from '@/types/database'

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
  onRefresh: () => void
  onCreateAppointment: (date?: Date, time?: string, employeeId?: string) => void
  onEditAppointment: (appointment: CalendarAppointment) => void
}

// Configuración del calendario
const HOUR_HEIGHT = 60 // px por hora
const START_HOUR = 8 // 8:00 AM
const END_HOUR = 20 // 8:00 PM
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

// Helper functions moved outside component for better performance (pure functions)
const getTimePosition = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  const totalMinutes = (hours - START_HOUR) * 60 + minutes
  return (totalMinutes / 60) * HOUR_HEIGHT
}

const getAppointmentHeight = (startTime: string, endTime: string) => {
  const start = getTimePosition(startTime)
  const end = getTimePosition(endTime)
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

export default function CalendarView({
  selectedDate,
  appointments,
  employees,
  viewType,
  businessId,
  onRefresh,
  onCreateAppointment,
  onEditAppointment
}: CalendarViewProps) {
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

  // Helper functions that depend on appointment data
  const getClientName = useCallback((appointment: CalendarAppointment) => {
    if (appointment.users) {
      return `${appointment.users.first_name} ${appointment.users.last_name}`
    }
    return appointment.walk_in_client_name || 'Cliente'
  }, [])

  const getClientPhone = useCallback((appointment: CalendarAppointment) => {
    return appointment.users?.phone || appointment.walk_in_client_phone
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
  }

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

  // Tooltip component
  const AppointmentTooltip = () => {
    if (!hoveredAppointment) return null

    const { appointment, position } = hoveredAppointment
    const employee = employees.find(e => e.id === appointment.employee_id)
    const serviceName = appointment.appointment_services?.[0]?.services?.name || 'Servicio'
    const statusLabels = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      in_progress: 'En Progreso',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show: 'No Asistió'
    }

    return (
      <div
        className="fixed z-50 pointer-events-none animate-tooltip"
        style={{
          left: `${position.x}px`,
          top: `${position.y - 10}px`,
          transform: 'translate(-50%, -100%)',
          animation: 'tooltipFadeIn 0.2s ease-out'
        }}
      >
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-w-xs">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 px-4 py-2">
            <div className="flex items-center justify-between text-white">
              <span className="text-sm font-semibold">
                {appointment.start_time.substring(0, 5)} - {appointment.end_time.substring(0, 5)}
              </span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {formatDuration(appointment.start_time, appointment.end_time)}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-3 space-y-2 text-sm">
            {/* Cliente */}
            <div className="flex items-start gap-2">
              <span className="text-gray-400 text-xs">👤</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Cliente</p>
                <p className="font-medium text-gray-900 truncate">{getClientName(appointment)}</p>
              </div>
            </div>

            {/* Empleado */}
            {employee && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 text-xs">👨‍💼</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Empleado</p>
                  <p className="font-medium text-gray-900 truncate">
                    {employee.first_name} {employee.last_name}
                  </p>
                </div>
              </div>
            )}

            {/* Servicio */}
            <div className="flex items-start gap-2">
              <span className="text-gray-400 text-xs">📋</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Servicio</p>
                <p className="font-medium text-gray-900 truncate">{serviceName}</p>
              </div>
            </div>

            {/* Estado y Precio */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  appointment.status === 'confirmed' ? 'bg-green-500' :
                  appointment.status === 'pending' ? 'bg-yellow-500' :
                  appointment.status === 'in_progress' ? 'bg-blue-500' :
                  appointment.status === 'completed' ? 'bg-gray-500' :
                  appointment.status === 'cancelled' ? 'bg-red-500' :
                  'bg-orange-500'
                }`} />
                <span className="text-xs text-gray-600">
                  {statusLabels[appointment.status as keyof typeof statusLabels]}
                </span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                ${appointment.total_price}
              </span>
            </div>
          </div>
        </div>
        {/* Arrow */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"
               style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
        </div>
      </div>
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
                    {dayAppointments.map((appointment) => {
                      const top = getTimePosition(appointment.start_time)
                      const height = getAppointmentHeight(appointment.start_time, appointment.end_time)
                      const serviceName = appointment.appointment_services?.[0]?.services?.name || 'Servicio'
                      const employee = employees.find(e => e.id === appointment.employee_id)
                      const isDragging = draggingAppointment?.id === appointment.id

                      return (
                        <div
                          key={appointment.id}
                          draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                          onDragStart={(e) => handleDragStart(e, appointment)}
                          onDragEnd={handleDragEnd}
                          onMouseEnter={(e) => handleAppointmentHover(e, appointment)}
                          onMouseLeave={handleAppointmentLeave}
                          className={`absolute inset-x-1 rounded-lg border-l-4 shadow-sm cursor-move hover:shadow-md transition-all z-20 overflow-hidden ${getStatusColor(
                            appointment.status
                          )} ${isDragging ? 'opacity-50 scale-95' : ''}`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAppointmentClick(appointment)
                          }}
                        >
                          <div className="p-2 h-full overflow-hidden">
                            <p className="text-xs font-semibold truncate">
                              🕐 {appointment.start_time.substring(0, 5)}
                            </p>
                            <p className="text-xs truncate mt-0.5">
                              <span className="font-medium">👤</span> {getClientName(appointment)}
                              {!appointment.client_id && (
                                <span className="ml-1 text-orange-600 font-semibold">W</span>
                              )}
                            </p>
                            {employee && (
                              <p className="text-xs font-medium truncate mt-0.5 border-t border-gray-300/50 pt-0.5">
                                👨‍💼 {employee.first_name} {employee.last_name}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Drop preview indicator */}
                    {draggingAppointment && isDropTarget && dropTarget?.time && (
                      <div
                        className="absolute inset-x-1 rounded-lg border-2 border-dashed border-blue-400 bg-blue-100/30 z-10 pointer-events-none"
                        style={{
                          top: `${getTimePosition(dropTarget.time)}px`,
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
                    {isToday && <CurrentTimeLine />}
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

        {/* Tooltip */}
        <AppointmentTooltip />
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
              className="flex-1 min-w-[200px] p-4 border-r border-gray-200 last:border-r-0"
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
                          : getTimePosition(employeeAbsence.start_time || '08:00'),
                        height: employeeAbsence.is_full_day
                          ? '100%'
                          : getAppointmentHeight(
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
                  {employeeAppointments.map((appointment) => {
                    const top = getTimePosition(appointment.start_time)
                    const height = getAppointmentHeight(appointment.start_time, appointment.end_time)
                    const serviceName = appointment.appointment_services?.[0]?.services?.name || 'Servicio'
                    const isDragging = draggingAppointment?.id === appointment.id

                    return (
                      <div
                        key={appointment.id}
                        draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                        onDragStart={(e) => handleDragStart(e, appointment)}
                        onDragEnd={handleDragEnd}
                        onMouseEnter={(e) => handleAppointmentHover(e, appointment)}
                        onMouseLeave={handleAppointmentLeave}
                        className={`absolute inset-x-1 rounded-lg border-l-4 shadow-sm cursor-move hover:shadow-md transition-all z-20 overflow-hidden ${getStatusColor(
                          appointment.status
                        )} ${isDragging ? 'opacity-50 scale-95' : ''}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAppointmentClick(appointment)
                        }}
                      >
                        <div className="p-2 h-full overflow-hidden">
                          <p className="text-xs font-semibold truncate">
                            {getClientName(appointment)}
                            {!appointment.client_id && (
                              <span className="ml-1 text-xs font-normal">👤</span>
                            )}
                          </p>
                          <p className="text-xs truncate mt-0.5">{serviceName}</p>
                          <p className="text-xs font-medium mt-1">
                            {appointment.start_time.substring(0, 5)} - {appointment.end_time.substring(0, 5)}
                          </p>
                          {getClientPhone(appointment) && (
                            <p className="text-xs text-gray-600 truncate mt-0.5">
                              {getClientPhone(appointment)}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Drop preview indicator */}
                  {draggingAppointment && isDropTarget && dropTarget?.time && (
                    <div
                      className="absolute inset-x-1 rounded-lg border-2 border-dashed border-blue-400 bg-blue-100/30 z-10 pointer-events-none"
                      style={{
                        top: `${getTimePosition(dropTarget.time)}px`,
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
                    <CurrentTimeLine />
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

      {/* Tooltip */}
      <AppointmentTooltip />
    </>
  )
}

// Componente para la línea de hora actual
function CurrentTimeLine() {
  const [position, setPosition] = useState(0)

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()

      if (hours >= START_HOUR && hours <= END_HOUR) {
        const totalMinutes = (hours - START_HOUR) * 60 + minutes
        const pos = (totalMinutes / 60) * HOUR_HEIGHT
        setPosition(pos)
      }
    }

    updatePosition()
    const interval = setInterval(updatePosition, 60000) // Actualizar cada minuto

    return () => clearInterval(interval)
  }, [])

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
