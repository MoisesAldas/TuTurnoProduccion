import React from 'react'
import { Clock, UserCircle, UserCheck, ClipboardList, CircleDollarSign, Circle } from 'lucide-react'
import type { Appointment } from '@/types/database'

interface AppointmentCardProps {
  appointment: Appointment
  top?: number  // Optional - can be handled by parent wrapper
  height: number
  clientName: string
  employeeName?: string
  isDragging?: boolean
  onMouseEnter?: (e: React.MouseEvent) => void
  onMouseLeave?: () => void
  onClick?: (e: React.MouseEvent) => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  draggable?: boolean
}

const getStatusColor = (status: string) => {
  const colors = {
    pending: 'bg-amber-50 border-amber-400 hover:bg-amber-100',
    confirmed: 'bg-emerald-50 border-emerald-500 hover:bg-emerald-100',
    in_progress: 'bg-blue-50 border-blue-500 hover:bg-blue-100',
    completed: 'bg-slate-100 border-slate-400 hover:bg-slate-200',
    cancelled: 'bg-rose-50 border-rose-400 hover:bg-rose-100',
    no_show: 'bg-orange-50 border-orange-400 hover:bg-orange-100'
  }
  return colors[status as keyof typeof colors] || colors.pending
}

const getStatusBadge = (status: string) => {
  const badges = {
    pending: { bg: 'bg-amber-500', text: 'Pendiente', icon: Circle },
    confirmed: { bg: 'bg-emerald-500', text: 'Confirmada', icon: Circle },
    in_progress: { bg: 'bg-blue-500', text: 'En Curso', icon: Circle },
    completed: { bg: 'bg-slate-500', text: 'Completada', icon: Circle },
    cancelled: { bg: 'bg-rose-500', text: 'Cancelada', icon: Circle },
    no_show: { bg: 'bg-orange-500', text: 'No Asistió', icon: Circle }
  }
  return badges[status as keyof typeof badges] || badges.pending
}

export default function AppointmentCard({
  appointment,
  top,
  height,
  clientName,
  employeeName,
  isDragging = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onDragStart,
  onDragEnd,
  draggable = true
}: AppointmentCardProps) {
  const startTime = appointment.start_time.substring(0, 5)
  const endTime = appointment.end_time.substring(0, 5)
  const isWalkIn = !appointment.client_id
  
  // Obtener todos los servicios
  const services = appointment.appointment_services?.map(as => as.services?.name).filter(Boolean) || []
  const serviceDisplay = services.length === 1 
    ? services[0] 
    : services.length > 1 
      ? `${services.length} servicios`
      : 'Sin servicio'
  
  const statusBadge = getStatusBadge(appointment.status)
  
  // Determinar qué mostrar según la altura disponible
  const isVerySmall = height < 50
  const isSmall = height >= 50 && height < 70
  const isMedium = height >= 70 && height < 100
  const isLarge = height >= 100
  
  // Build style object conditionally
  const style: React.CSSProperties = { height: `${height}px` }
  if (top !== undefined) {
    style.top = `${top}px`
  }
  
  return (
    <div
      draggable={draggable && appointment.status !== 'completed' && appointment.status !== 'cancelled'}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={`${top !== undefined ? 'absolute' : ''} inset-x-1 rounded-lg border-l-4 shadow-md cursor-move hover:shadow-xl transition-all duration-200 z-20 overflow-hidden ${getStatusColor(
        appointment.status
      )} ${isDragging ? 'opacity-60 scale-95 shadow-2xl' : ''}`}
      style={style}
    >
      <div className="p-2 h-full overflow-hidden flex flex-col gap-1">
        {/* Header: Hora + Badge Estado */}
        <div className="flex items-center justify-between gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Clock className="w-3.5 h-3.5 flex-shrink-0 text-gray-700" />
            <span className="text-xs font-bold text-gray-900 truncate">
              {startTime} - {endTime}
            </span>
          </div>
          {!isVerySmall && (
            <div className={`w-2 h-2 ${statusBadge.bg} rounded-full flex-shrink-0`} />
          )}
        </div>

        {/* Cliente */}
        {!isVerySmall && (
          <div className="flex items-center gap-1.5 min-w-0">
            <UserCircle className="w-3.5 h-3.5 flex-shrink-0 text-gray-600" />
            <span className="text-xs font-semibold text-gray-900 truncate flex-1">
              {clientName}
            </span>
            {isWalkIn && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-orange-600 text-white rounded flex-shrink-0">
                W
              </span>
            )}
          </div>
        )}

        {/* Servicio */}
        {(isMedium || isLarge) && (
          <div className="flex items-center gap-1.5 min-w-0 text-gray-700">
            <ClipboardList className="w-3 h-3 flex-shrink-0" />
            <span className="text-[11px] truncate">{serviceDisplay}</span>
          </div>
        )}

        {/* Empleado */}
        {isLarge && employeeName && (
          <div className="flex items-center gap-1.5 pt-1 mt-auto border-t border-gray-300/40 min-w-0">
            <UserCheck className="w-3 h-3 flex-shrink-0 text-gray-600" />
            <span className="text-[10px] text-gray-700 truncate">{employeeName}</span>
          </div>
        )}

        {/* Precio - mostrar desde medium size */}
        {(isMedium || isLarge) && appointment.total_price && (
          <div className="flex items-center gap-1 mt-auto">
            <CircleDollarSign className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">
              {appointment.total_price}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
