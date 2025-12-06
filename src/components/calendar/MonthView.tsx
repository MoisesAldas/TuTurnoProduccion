'use client'

import { useState, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { CALENDAR_CONFIG, getStatusColor, getInitials } from './calendarUtils'
import type { Employee, Appointment } from '@/types/database'

interface MonthViewProps {
  selectedDate: Date
  appointments: Appointment[]
  employees: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'is_active'>[]
  onDateSelect: (date: Date) => void
  onAppointmentClick: (appointment: Appointment) => void
  onPreviousMonth: () => void
  onNextMonth: () => void
}

export default function MonthView({
  selectedDate,
  appointments,
  employees,
  onDateSelect,
  onAppointmentClick,
  onPreviousMonth,
  onNextMonth
}: MonthViewProps) {
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null)

  // Calculate calendar days for the month view
  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    
    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)
    
    // Calculate days from previous month to show
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    
    // Calculate days from next month to show
    const endPadding = 6 - lastDay.getDay()
    
    const days: Array<{
      date: Date
      isCurrentMonth: boolean
      isToday: boolean
      appointments: Appointment[]
    }> = []
    
    // Add days from previous month
    for (let i = startPadding; i > 0; i--) {
      const date = new Date(year, month, -i + 1)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.toDateString() === new Date().toDateString(),
        appointments: []
      })
    }
    
    // Add days from current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr)
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === new Date().toDateString(),
        appointments: dayAppointments
      })
    }
    
    // Add days from next month
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(year, month + 1, i)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.toDateString() === new Date().toDateString(),
        appointments: []
      })
    }
    
    return days
  }, [selectedDate, appointments])

  // Group appointments by employee for better display
  const getAppointmentsByEmployee = (dayAppointments: Appointment[]) => {
    return dayAppointments.reduce((acc, apt) => {
      const employee = employees.find(e => e.id === apt.employee_id)
      if (employee) {
        if (!acc[employee.id]) {
          acc[employee.id] = []
        }
        acc[employee.id].push(apt)
      }
      return acc
    }, {} as Record<string, Appointment[]>)
  }

  const getClientName = (appointment: Appointment) => {
    if (appointment.users) {
      return `${appointment.users.first_name} ${appointment.users.last_name}`
    }
    return appointment.walk_in_client_name || 'Cliente'
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const formatDayNumber = (date: Date) => {
    return date.getDate()
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {formatMonthYear(selectedDate)}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviousMonth}
            className="hover:bg-orange-50 hover:border-orange-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNextMonth}
            className="hover:bg-orange-50 hover:border-orange-300"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <div
            key={day}
            className="p-3 text-center text-xs font-semibold text-gray-600 bg-gray-50"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full">
          {calendarDays.map((dayInfo, index) => {
            const appointmentsByEmployee = getAppointmentsByEmployee(dayInfo.appointments)
            const hasAppointments = dayInfo.appointments.length > 0
            const isCurrentMonth = dayInfo.isCurrentMonth
            const isToday = dayInfo.isToday
            const isSelected = dayInfo.date.toDateString() === selectedDate.toDateString()

            return (
              <div
                key={index}
                className={`border-r border-b border-gray-200 min-h-[100px] p-2 cursor-pointer transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                } ${isToday ? 'bg-orange-50' : ''} ${
                  isSelected ? 'ring-2 ring-orange-500 bg-orange-100' : ''
                } hover:bg-orange-50/50`}
                onClick={() => onDateSelect(dayInfo.date)}
                onMouseEnter={() => setHoveredDay(dayInfo.date)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    !isCurrentMonth ? 'text-gray-400' : 
                    isToday ? 'text-orange-600 font-bold' : 'text-gray-900'
                  }`}>
                    {formatDayNumber(dayInfo.date)}
                  </span>
                  {hasAppointments && (
                    <span className="text-xs bg-orange-600 text-white px-1.5 py-0.5 rounded-full">
                      {dayInfo.appointments.length}
                    </span>
                  )}
                </div>

                {/* Appointments */}
                {hasAppointments && (
                  <div className="space-y-1">
                    {Object.entries(appointmentsByEmployee).slice(0, 2).map(([employeeId, employeeAppointments]) => {
                      const employee = employees.find(e => e.id === employeeId)
                      if (!employee) return null

                      return (
                        <div
                          key={employeeId}
                          className="text-xs p-1 rounded border-l-2 bg-white shadow-sm truncate cursor-pointer hover:shadow-md transition-shadow"
                          style={{
                            borderColor: employeeAppointments[0].status === 'confirmed' ? '#059669' :
                                       employeeAppointments[0].status === 'pending' ? '#ca8a04' :
                                       employeeAppointments[0].status === 'in_progress' ? '#0369a1' :
                                       employeeAppointments[0].status === 'completed' ? '#6b7280' :
                                       employeeAppointments[0].status === 'cancelled' ? '#dc2626' :
                                       '#ea580c'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAppointmentClick(employeeAppointments[0])
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={employee.avatar_url} />
                              <AvatarFallback className="text-[8px] bg-orange-600 text-white">
                                {getInitials(employee.first_name, employee.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate font-medium">
                              {employeeAppointments[0].start_time.substring(0, 5)} {getClientName(employeeAppointments[0])}
                            </span>
                          </div>
                          {employeeAppointments.length > 1 && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              +{employeeAppointments.length - 1} más
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {dayInfo.appointments.length > 4 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayInfo.appointments.length - 4} más...
                      </div>
                    )}
                  </div>
                )}

                {/* Hover tooltip for day */}
                {hoveredDay?.toDateString() === dayInfo.date.toDateString() && hasAppointments && (
                  <div className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px]">
                    <div className="text-sm font-semibold text-gray-900 mb-2">
                      {dayInfo.date.toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long' 
                      })}
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {dayInfo.appointments.slice(0, 5).map((apt) => {
                        const employee = employees.find(e => e.id === apt.employee_id)
                        return (
                          <div
                            key={apt.id}
                            className="text-xs p-1 rounded hover:bg-gray-50 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAppointmentClick(apt)
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{apt.start_time.substring(0, 5)}</span>
                              {employee && (
                                <Avatar className="w-3 h-3">
                                  <AvatarImage src={employee.avatar_url} />
                                  <AvatarFallback className="text-[6px] bg-orange-600 text-white">
                                    {getInitials(employee.first_name, employee.last_name)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <span className="truncate">{getClientName(apt)}</span>
                            </div>
                          </div>
                        )
                      })}
                      {dayInfo.appointments.length > 5 && (
                        <div className="text-xs text-gray-500 text-center pt-1">
                          +{dayInfo.appointments.length - 5} más...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}