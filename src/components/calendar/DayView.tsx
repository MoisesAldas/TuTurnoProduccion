'use client'

import { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { CALENDAR_CONFIG, getTimePosition, getAppointmentHeight, getStatusColor, getInitials, getClientName, getClientPhone, type EmployeeAbsence } from './calendarUtils'
import type { Employee, Appointment } from '@/types/database'

interface DayViewProps {
  selectedDate: Date
  appointments: Appointment[]
  employees: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'is_active'>[]
  absences: EmployeeAbsence[]
  onTimeSlotClick: (employeeId: string, clickY: number, containerTop: number) => void
  onAppointmentClick: (appointment: Appointment) => void
  onAppointmentHover: (e: React.MouseEvent, appointment: Appointment) => void
  onAppointmentLeave: () => void
  onDragStart: (e: React.DragEvent, appointment: Appointment) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, employeeId?: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, targetEmployeeId: string) => void
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

export default function DayView({
  selectedDate,
  appointments,
  employees,
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
}: DayViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Scroll al horario actual o a las 8 AM
  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date()
      const currentHour = now.getHours()
      const scrollPosition = Math.max(0, (currentHour - CALENDAR_CONFIG.START_HOUR) * CALENDAR_CONFIG.HOUR_HEIGHT - 100)
      scrollContainerRef.current.scrollTop = scrollPosition
    }
  }, [])

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
                          onClick={() => onAppointmentClick(appointment)}
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
                  style={{ height: `${(CALENDAR_CONFIG.END_HOUR - CALENDAR_CONFIG.START_HOUR + 1) * CALENDAR_CONFIG.HOUR_HEIGHT}px` }}
                  onDragOver={(e) => onDragOver(e, employee.id)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, employee.id)}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    onTimeSlotClick(employee.id, e.clientY, rect.top)
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
                  {selectedDate.toDateString() === new Date().toDateString() && (
                    <CurrentTimeLine />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}