import React from 'react'
import { Clock, UserCircle, UserCheck, ClipboardList, CircleDollarSign, Circle, Users } from 'lucide-react'
import type { Appointment } from '@/types/database'

interface AppointmentCardProps {
  appointment: Appointment
  top?: number  // Optional - can be handled by parent wrapper
  height: number
  clientName: string
  employeeName?: string
  employeeId?: string // Context for granular service filtering
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
  employeeId,
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
  
  // Obtener todos los servicios (filtrados por empleado si se provee el ID)
  const allServices = appointment.appointment_services || []
  const filteredServices = employeeId 
    ? allServices.filter(as => as.employee_id === employeeId)
    : allServices

  const services = filteredServices.map(as => as.services?.name).filter(Boolean) || []
  
  // Multi-employee detection
  const assignedEmployees = Array.from(new Set(
    allServices.map(as => as.employee_id).filter(Boolean) || []
  ))
  const isMultiEmployee = assignedEmployees.length > 1

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
      className={`${top !== undefined ? 'absolute' : ''} inset-x-1 rounded-2xl border-l-[6px] shadow-[0_4px_15px_-3px_rgba(0,0,0,0.08)] cursor-move hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 z-30 overflow-hidden ${getStatusColor(
        appointment.status
      )} ${isDragging ? 'opacity-50 scale-95 shadow-2xl' : ''}`}
      style={style}
    >
      <div className={`${isLarge ? 'p-2.5' : 'p-2'} h-full overflow-hidden flex flex-col gap-1.5`}>
        {/* Header: Hora + Dot indicator + Precio (si es pequeña) */}
        <div className="flex items-center justify-between gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <Clock className="w-3 h-3 flex-shrink-0 text-gray-500/80" />
            <span className="text-[10px] font-black text-gray-900/90 truncate tracking-tight">
              {startTime}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Precio en header solo si no es grande y no es muy pequeña */}
            {!isLarge && !isVerySmall && appointment.total_price && (
              <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/60 px-1 rounded-md shadow-sm">
                ${appointment.total_price}
              </span>
            )}
            {!isVerySmall && isMultiEmployee && (
              <div className="flex items-center gap-0.5 bg-blue-100/80 px-1 rounded-md border border-blue-200 shadow-sm" title="Múltiples profesionales">
                <Users className="w-2.5 h-2.5 text-blue-600" />
              </div>
            )}
            {!isVerySmall && (
              <div className={`w-1.5 h-1.5 ${statusBadge.bg} rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
            )}
          </div>
        </div>

        {/* Cliente con Typography Premium */}
        {!isVerySmall && (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`font-black text-gray-900 truncate flex-1 leading-tight ${isLarge ? 'text-[11px]' : 'text-[10px]'}`}>
              {clientName}
            </span>
            {isWalkIn && (
              <span className="text-[8px] font-black px-1 py-0.5 bg-orange-600/90 text-white rounded-md flex-shrink-0 shadow-sm">
                W
              </span>
            )}
          </div>
        )}

        {/* Servicio - Estilo Badge-like */}
        {((isMedium || isLarge) && !isSmall) && (
          <div className="flex items-center gap-1 min-w-0 bg-white/30 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-white/20">
            <ClipboardList className="w-2.5 h-2.5 flex-shrink-0 text-gray-500" />
            <span className="text-[9px] font-bold text-gray-700 truncate uppercase tracking-tighter">
              {serviceDisplay}
            </span>
          </div>
        )}

        {/* Empleado & Precio - Bottom Section (Solo para Large) */}
        {isLarge && (
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-black/5 pt-1.5">
            {employeeName ? (
              <div className="flex items-center gap-1 min-w-0">
                <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 border border-white/50">
                   <UserCheck className="w-2.5 h-2.5 text-gray-600" />
                </div>
                <span className="text-[9px] font-bold text-gray-500 truncate">{employeeName}</span>
              </div>
            ) : <div />}
            
            {appointment.total_price && (
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/40 px-2 py-0.5 rounded-lg">
                ${appointment.total_price}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
