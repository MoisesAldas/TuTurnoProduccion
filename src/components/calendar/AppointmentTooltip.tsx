'use client'

import { useMemo } from 'react'
import type { Employee, Appointment } from '@/types/database'

interface AppointmentTooltipProps {
  hoveredAppointment: {
    appointment: Appointment
    position: { x: number; y: number }
  } | null
}

interface CalendarEmployee extends Employee {
  is_active: boolean
}

// Helper functions (copiadas del CalendarView original)
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

const getClientName = (appointment: Appointment) => {
  if (appointment.users) {
    return `${appointment.users.first_name} ${appointment.users.last_name}`
  }
  return appointment.walk_in_client_name || 'Cliente'
}

export default function AppointmentTooltip({ hoveredAppointment }: AppointmentTooltipProps) {
  if (!hoveredAppointment) return null

  const { appointment, position } = hoveredAppointment
  
  // Memoizar cálculos para evitar re-renders innecesarios
  const tooltipContent = useMemo(() => {
    const serviceName = appointment.appointment_services?.[0]?.services?.name || 'Servicio'
    const clientName = getClientName(appointment)
    const duration = formatDuration(appointment.start_time, appointment.end_time)
    
    const statusLabels = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      in_progress: 'En Progreso',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show: 'No Asistió'
    }

    return {
      serviceName,
      clientName,
      duration,
      statusLabel: statusLabels[appointment.status as keyof typeof statusLabels] || 'Pendiente'
    }
  }, [appointment])

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
              {tooltipContent.duration}
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
              <p className="font-medium text-gray-900 truncate">{tooltipContent.clientName}</p>
            </div>
          </div>

          {/* Servicio */}
          <div className="flex items-start gap-2">
            <span className="text-gray-400 text-xs">📋</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Servicio</p>
              <p className="font-medium text-gray-900 truncate">{tooltipContent.serviceName}</p>
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
                {tooltipContent.statusLabel}
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