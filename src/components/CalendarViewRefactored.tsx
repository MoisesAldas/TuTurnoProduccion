'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { parseDateString, toDateString } from '@/lib/dateUtils'

// Importar componentes refactorizados
import AppointmentTooltip from './calendar/AppointmentTooltip'
import WeekView from './calendar/WeekView'
import DayView from './calendar/DayView'
import MonthView from './calendar/MonthView'

// Importar utilidades
import { 
  CALENDAR_CONFIG, 
  getTimePosition, 
  getAppointmentHeight, 
  type EmployeeAbsence 
} from './calendar/calendarUtils'

// Importar tipos
import type { Employee, Appointment } from '@/types/database'

// Lazy load AppointmentModal
const AppointmentModal = dynamic(() => import('./AppointmentModal'), {
  loading: () => <div className="text-center p-4">Cargando...</div>
})

// Tipos simplificados
type CalendarEmployee = Pick<Employee, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'is_active'>
type CalendarAppointment = Appointment

interface CalendarViewProps {
  selectedDate: Date
  appointments: CalendarAppointment[]
  employees: CalendarEmployee[]
  viewType: 'day' | 'week' | 'month'
  businessId: string
  onRefresh: () => void
  onCreateAppointment: (date?: Date, time?: string, employeeId?: string) => void
  onEditAppointment: (appointment: CalendarAppointment) => void
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

  // Fetch absences con memoización
  const fetchAbsences = useCallback(async () => {
    if (employees.length === 0) return

    try {
      if (viewType === 'month') {
        // Para vista mensual, obtener ausencias del mes completo
        const year = selectedDate.getFullYear()
        const month = selectedDate.getMonth()
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0)

        const { data, error } = await supabase
          .from('employee_absences')
          .select('*')
          .gte('absence_date', toDateString(startDate))
          .lte('absence_date', toDateString(endDate))
          .in('employee_id', employees.map(e => e.id))

        if (error) throw error
        setAbsences(data || [])
      } else if (viewType === 'week') {
        // Fetch absences for entire week
        const getWeekDates = (date: Date) => {
          const dates: Date[] = []
          const current = new Date(date)
          
          // Get Monday of week
          const day = current.getDay()
          const diff = current.getDate() - day + (day === 0 ? -6 : 1)
          const monday = new Date(current.setDate(diff))

          // Get all 7 days
          for (let i = 0; i < 7; i++) {
            const weekDate = new Date(monday)
            weekDate.setDate(monday.getDate() + i)
            dates.push(weekDate)
          }
          return dates
        }

        const weekDates = getWeekDates(selectedDate)
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

        const { data, error } = await supabase
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
  }, [employees, viewType, selectedDate, supabase])

  useEffect(() => {
    fetchAbsences()
  }, [fetchAbsences])

  useEffect(() => {
    // Scroll al horario actual o a las 8 AM (solo para vista diaria)
    if (viewType === 'day' && scrollContainerRef.current) {
      const now = new Date()
      const currentHour = now.getHours()
      const scrollPosition = Math.max(0, (currentHour - CALENDAR_CONFIG.START_HOUR) * CALENDAR_CONFIG.HOUR_HEIGHT - 100)
      scrollContainerRef.current.scrollTop = scrollPosition
    }
  }, [viewType])

  // Event handlers - memoizados para evitar re-renders innecesarios
  const handleAppointmentHover = useCallback((e: React.MouseEvent, appointment: CalendarAppointment) => {
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

  const handleAppointmentClick = useCallback((appointment: CalendarAppointment) => {
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

  const handleTimeSlotClick = useCallback((date?: Date, time?: string, employeeId?: string, clickY?: number, containerTop?: number) => {
    if (!onCreateAppointment) return

    // Para vista mensual, date viene del componente MonthView
    // Para vistas día/semana, usamos selectedDate
    const targetDate = date || selectedDate
    
    if (viewType === 'month') {
      // En vista mensual, crear cita para el día completo (hora por defecto 09:00)
      onCreateAppointment(targetDate, '09:00', employees[0]?.id)
    } else {
      // En vistas día/semana, usar la lógica existente
      if (!time || !employeeId) return
      onCreateAppointment(targetDate, time, employeeId)
    }
  }, [viewType, selectedDate, employees, onCreateAppointment])

  // Navegación de meses (solo para vista mensual)
  const handlePreviousMonth = useCallback(() => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() - 1)
    onCreateAppointment(newDate)
  }, [selectedDate, onCreateAppointment])

  const handleNextMonth = useCallback(() => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + 1)
    onCreateAppointment(newDate)
  }, [selectedDate, onCreateAppointment])

  // Drag & Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, appointment: CalendarAppointment) => {
    setDraggingAppointment(appointment)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingAppointment(null)
    setDropTarget(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, employeeId?: string, date?: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    if (viewType === 'month') {
      // En vista mensual, solo necesitamos la fecha
      setDropTarget({ employeeId, date })
      return
    }

    // Calcular tiempo basado en posición del mouse (para día/semana)
    const rect = e.currentTarget.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const totalMinutes = (relativeY / CALENDAR_CONFIG.HOUR_HEIGHT) * 60
    const hours = Math.floor(totalMinutes / 60) + CALENDAR_CONFIG.START_HOUR
    const minutes = Math.round((totalMinutes % 60) / 15) * 15
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

    setDropTarget({ employeeId, date, time: timeString })
  }, [viewType])

  const handleDragLeave = useCallback(() => {
    setDropTarget(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetEmployeeId: string, targetDate?: string) => {
    e.preventDefault()

    if (!draggingAppointment) return

    // Capturar valores antiguos para notificación por email
    const oldDate = draggingAppointment.appointment_date
    const oldTime = draggingAppointment.start_time
    const oldEndTime = draggingAppointment.end_time
    const oldEmployeeId = draggingAppointment.employee_id

    let newDateStr: string
    let newStartTime: string
    let newEndTime: string

    if (viewType === 'month') {
      // En vista mensual, mantener misma hora pero cambiar fecha
      newDateStr = targetDate || toDateString(selectedDate)
      newStartTime = draggingAppointment.start_time
      newEndTime = draggingAppointment.end_time
    } else {
      // En vistas día/semana, calcular nueva hora
      const rect = e.currentTarget.getBoundingClientRect()
      const relativeY = e.clientY - rect.top
      const totalMinutes = (relativeY / CALENDAR_CONFIG.HOUR_HEIGHT) * 60
      const hours = Math.floor(totalMinutes / 60) + CALENDAR_CONFIG.START_HOUR
      const minutes = Math.round((totalMinutes % 60) / 15) * 15
      newStartTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`

      // Calcular hora de fin basado en duración
      const duration = draggingAppointment.appointment_services?.[0]?.services?.duration_minutes || 60
      const endHours = Math.floor((hours * 60 + minutes + duration) / 60)
      const endMinutes = (hours * 60 + minutes + duration) % 60
      newEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`

      newDateStr = targetDate || toDateString(selectedDate)
    }

    try {
      // Update appointment
      const { error } = await supabase
        .from('appointments')
        .update({
          employee_id: targetEmployeeId,
          appointment_date: newDateStr,
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
        // Don't block operation if email fails
      }

      toast({
        title: 'Cita reagendada',
        description: `La cita ha sido movida exitosamente.`,
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
  }, [draggingAppointment, viewType, selectedDate, onRefresh, supabase, toast])

  // Renderizar vista apropiada
  const renderCalendarView = () => {
    switch (viewType) {
      case 'month':
        return (
          <MonthView
            selectedDate={selectedDate}
            appointments={appointments}
            employees={employees}
            onDateSelect={(date) => onCreateAppointment(date)}
            onAppointmentClick={handleAppointmentClick}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
          />
        )
      case 'week':
        return (
          <WeekView
            selectedDate={selectedDate}
            appointments={appointments}
            employees={employees}
            businessId={businessId}
            absences={absences}
            onTimeSlotClick={(date: Date, time: string, employeeId: string) => 
              handleTimeSlotClick(date, time, employeeId)}
            onAppointmentClick={handleAppointmentClick}
            onAppointmentHover={handleAppointmentHover}
            onAppointmentLeave={handleAppointmentLeave}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            draggingAppointment={draggingAppointment}
            dropTarget={dropTarget}
          />
        )
      case 'day':
        return (
          <DayView
            selectedDate={selectedDate}
            appointments={appointments}
            employees={employees}
            absences={absences}
            onTimeSlotClick={(employeeId: string, clickY: number, containerTop: number) => 
              handleTimeSlotClick(undefined, undefined, employeeId, clickY, containerTop)}
            onAppointmentClick={handleAppointmentClick}
            onAppointmentHover={handleAppointmentHover}
            onAppointmentLeave={handleAppointmentLeave}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            draggingAppointment={draggingAppointment}
            dropTarget={dropTarget}
          />
        )
      default:
        return (
          <DayView
            selectedDate={selectedDate}
            appointments={appointments}
            employees={employees}
            absences={absences}
            onTimeSlotClick={(employeeId: string, clickY: number, containerTop: number) => 
              handleTimeSlotClick(undefined, undefined, employeeId, clickY, containerTop)}
            onAppointmentClick={handleAppointmentClick}
            onAppointmentHover={handleAppointmentHover}
            onAppointmentLeave={handleAppointmentLeave}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            draggingAppointment={draggingAppointment}
            dropTarget={dropTarget}
          />
        )
    }
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

  return (
    <>
      {renderCalendarView()}

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
      <AppointmentTooltip hoveredAppointment={hoveredAppointment} />
    </>
  )
}