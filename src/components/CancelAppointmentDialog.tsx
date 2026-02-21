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
import { AlertTriangle, Loader2, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      <DialogContent className="sm:max-w-md rounded-[2rem] border-0 shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-gray-900">Cancelar Cita</DialogTitle>
              <DialogDescription className="text-sm font-medium text-gray-400">
                Esta acción no se puede deshacer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {appointmentDetails && (
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
            {appointmentDetails.businessName && (
              <p className="text-sm">
                <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider block mb-0.5">Negocio</span>
                <span className="text-gray-900 font-semibold">{appointmentDetails.businessName}</span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              {appointmentDetails.date && (
                <p className="text-sm">
                  <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider block mb-0.5">Fecha</span>
                  <span className="text-gray-900 font-semibold">{appointmentDetails.date}</span>
                </p>
              )}
              {appointmentDetails.time && (
                <p className="text-sm">
                  <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wider block mb-0.5">Hora</span>
                  <span className="text-gray-900 font-semibold">{appointmentDetails.time}</span>
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Label htmlFor="cancel-reason" className="text-xs font-black uppercase tracking-widest text-gray-500">
            Motivo de cancelación <span className="text-gray-400 capitalize font-medium">(opcional)</span>
          </Label>
          <Textarea
            id="cancel-reason"
            placeholder="Ej: Surgió un imprevisto, cambio de planes, etc."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            disabled={isSubmitting || isLoading}
            rows={3}
            className="resize-none rounded-xl border-gray-200 focus:border-slate-900 focus:ring-slate-900/10 transition-all font-medium text-sm"
          />
          <p className="text-[10px] font-medium text-gray-400 italic">
            * Proporcionar un motivo ayuda a mejorar el servicio
          </p>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
            className="rounded-xl px-6 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all"
          >
            Volver
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || isLoading}
            className="rounded-xl px-8 text-[11px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 bg-red-600 hover:bg-red-700 shadow-red-600/20"
          >
            {isSubmitting || isLoading ? (
              <div className="relative w-3.5 h-3.5">
                <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              'Confirmar Cancelación'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
