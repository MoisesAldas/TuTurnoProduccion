'use client'

import { useState, useEffect, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { toDateString } from '@/lib/dateUtils'
import { CALENDAR_CONFIG, getTimePosition, getAppointmentHeight, getStatusColor, getInitials, type EmployeeAbsence } from './calendarUtils'
import type { Employee, Appointment } from '@/types/database'

interface WeekViewProps {
  selectedDate: Date
  appointments: Appointment[]
  employees: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'is_active'>[]
  businessId: string
  absences: EmployeeAbsence[]
  onTimeSlotClick: (date: Date, time: string, employeeId: string) => void
  onAppointmentClick: (appointment: Appointment) => void
  onAppointmentHover: (e: React.MouseEvent, appointment: Appointment) => void
  onAppointmentLeave: () => void
  onDragStart: (e: React.DragEvent, appointment: Appointment) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, employeeId?: string, date?: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, targetEmployeeId: string, targetDate?: string) => void
  draggingAppointment: Appointment | null
  dropTarget: { employeeId?: string; date?: string; time?: string } | null
}

// Componente para la línea de hora actual
function CurrentTimeLine() {
  const [position, setPosition] = useState(0)

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()

      if (hours >= CALENDAR_CONFIG.START_HOUR && hours <= CALENDAR_CONFIG.END_HOUR) {
        const totalMinutes = (hours - CALENDAR_CONFIG.START_HOUR) * 60 + minutes
        const pos = (totalMinutes / 60) * CALENDAR_CONFIG.HOUR_HEIGHT
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

export default function WeekView({
  selectedDate,
  appointments,
  employees,
  businessId,
  absences,
  onTimeSlotClick,
  onAppointmentClick,
  onAppointmentHover,
  onAppointmentLeave,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  draggingAppointment,
  dropTarget
}: WeekViewProps) {
  // Calculate week range - Memoized for performance
  const weekDates = useMemo(() => {
    const dates: Date[] = []
    const current = new Date(selectedDate)
    
    // Get Monday of week
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
  }, [selectedDate])

  const getClientName = (appointment: Appointment) => {
    if (appointment.users) {
      return `${appointment.users.first_name} ${appointment.users.last_name}`
    }
    return appointment.walk_in_client_name || 'Cliente'
  }

  return (
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
      <div className="flex-1 overflow-y-auto overflow-x-auto" style={{ scrollBehavior: 'smooth' }}>
        <div className="flex min-h-full">
          {/* Columna de horas */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50">
            {Array.from({ length: CALENDAR_CONFIG.END_HOUR - CALENDAR_CONFIG.START_HOUR + 1 }, (_, i) => CALENDAR_CONFIG.START_HOUR + i).map((hour) => (
              <div
                key={hour}
                className="relative"
                style={{ height: `${CALENDAR_CONFIG.HOUR_HEIGHT}px` }}
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
                style={{ height: `${(CALENDAR_CONFIG.END_HOUR - CALENDAR_CONFIG.START_HOUR + 1) * CALENDAR_CONFIG.HOUR_HEIGHT}px` }}
                onDragOver={(e) => onDragOver(e, employees[0]?.id, dateStr)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, employees[0]?.id, dateStr)}
                onClick={(e) => {
                  // For week view, we'll create appointments with first employee by default
                  const rect = e.currentTarget.getBoundingClientRect()
                  const relativeY = e.clientY - rect.top
                  const totalMinutes = (relativeY / CALENDAR_CONFIG.HOUR_HEIGHT) * 60
                  const hours = Math.floor(totalMinutes / 60) + CALENDAR_CONFIG.START_HOUR
                  const minutes = Math.round((totalMinutes % 60) / 15) * 15
                  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

                  onTimeSlotClick(date, timeString, employees[0]?.id)
                }}
              >
                {/* Líneas horizontales de horas */}
                {Array.from({ length: CALENDAR_CONFIG.END_HOUR - CALENDAR_CONFIG.START_HOUR + 1 }, (_, i) => CALENDAR_CONFIG.START_HOUR + i).map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-b border-gray-100"
                    style={{ top: `${(hour - CALENDAR_CONFIG.START_HOUR) * CALENDAR_CONFIG.HOUR_HEIGHT}px` }}
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
                      onDragStart={(e) => onDragStart(e, appointment)}
                      onDragEnd={onDragEnd}
                      onMouseEnter={(e) => onAppointmentHover(e, appointment)}
                      onMouseLeave={onAppointmentLeave}
                      className={`absolute inset-x-1 rounded-lg border-l-4 shadow-sm cursor-move hover:shadow-md transition-all z-20 overflow-hidden ${getStatusColor(
                        appointment.status
                      )} ${isDragging ? 'opacity-50 scale-95' : ''}`}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAppointmentClick(appointment)
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
                      height: `${(draggingAppointment.appointment_services?.[0]?.services?.duration_minutes || 60) * (CALENDAR_CONFIG.HOUR_HEIGHT / 60)}px`
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
  )
}