import React from 'react'
import { Clock } from 'lucide-react'

interface AppointmentActionTooltipProps {
  /** Si la acción está disponible */
  isAvailable: boolean
  /** Mensaje personalizado cuando no está disponible */
  unavailableMessage?: string
  /** Clase CSS adicional */
  className?: string
}

/**
 * Tooltip informativo para acciones de citas
 * Muestra un mensaje cuando una acción no está disponible aún
 * 
 * @example
 * <AppointmentActionTooltip 
 *   isAvailable={canTakeAction}
 *   unavailableMessage="Disponible cuando comience la cita"
 * />
 */
export function AppointmentActionTooltip({
  isAvailable,
  unavailableMessage = 'Esta acción estará disponible cuando comience la cita',
  className = ''
}: AppointmentActionTooltipProps) {
  if (isAvailable) return null

  return (
    <div className={`flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500 mt-1.5 ${className}`}>
      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{unavailableMessage}</span>
    </div>
  )
}
