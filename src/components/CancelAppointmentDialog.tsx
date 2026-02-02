import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface CancelAppointmentDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  appointmentDetails?: {
    businessName?: string
    date?: string
    time?: string
  }
  isLoading?: boolean
}

/**
 * Componente modular reutilizable para diálogo de cancelación de citas
 * Puede ser usado tanto por clientes como por negocios
 */
export function CancelAppointmentDialog({
  isOpen,
  onClose,
  onConfirm,
  appointmentDetails,
  isLoading = false
}: CancelAppointmentDialogProps) {
  const [cancelReason, setCancelReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(cancelReason)
      setCancelReason('') // Limpiar después de éxito
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setCancelReason('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Cancelar Cita</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Esta acción no se puede deshacer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {appointmentDetails && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {appointmentDetails.businessName && (
              <p className="text-sm">
                <span className="font-semibold text-gray-700">Negocio:</span>{' '}
                <span className="text-gray-900">{appointmentDetails.businessName}</span>
              </p>
            )}
            {appointmentDetails.date && (
              <p className="text-sm">
                <span className="font-semibold text-gray-700">Fecha:</span>{' '}
                <span className="text-gray-900">{appointmentDetails.date}</span>
              </p>
            )}
            {appointmentDetails.time && (
              <p className="text-sm">
                <span className="font-semibold text-gray-700">Hora:</span>{' '}
                <span className="text-gray-900">{appointmentDetails.time}</span>
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">
            Motivo de cancelación <span className="text-gray-400">(opcional)</span>
          </Label>
          <Textarea
            id="cancel-reason"
            placeholder="Ej: Surgió un imprevisto, cambio de planes, etc."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            disabled={isSubmitting || isLoading}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            Proporcionar un motivo ayuda a mejorar el servicio
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
          >
            Volver
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || isLoading}
            className="gap-2"
          >
            {(isSubmitting || isLoading) && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            Confirmar Cancelación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
