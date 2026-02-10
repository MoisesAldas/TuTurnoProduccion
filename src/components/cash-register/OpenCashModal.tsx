/**
 * Modal para Abrir Caja
 * Permite al negocio iniciar una nueva sesión de caja con monto inicial
 */

'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCashRegister } from '@/hooks/useCashRegister'
import { createClient } from '@/lib/supabaseClient'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { DollarSign, Loader2 } from 'lucide-react'

interface OpenCashModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function OpenCashModal({ onClose, onSuccess }: OpenCashModalProps) {
  const { authState } = useAuth()
  const { openCashRegister, isLoading } = useCashRegister()
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    initialCashAmount: '',
    openingNotes: '',
  })

  const [errors, setErrors] = useState({
    initialCashAmount: '',
  })

  const validateForm = (): boolean => {
    const newErrors = {
      initialCashAmount: '',
    }

    const amount = parseFloat(formData.initialCashAmount)

    if (!formData.initialCashAmount.trim()) {
      newErrors.initialCashAmount = 'El monto inicial es requerido'
    } else if (isNaN(amount)) {
      newErrors.initialCashAmount = 'Ingrese un monto válido'
    } else if (amount < 0) {
      newErrors.initialCashAmount = 'El monto no puede ser negativo'
    }

    setErrors(newErrors)
    return !newErrors.initialCashAmount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    if (!authState.user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No hay usuario autenticado',
      })
      return
    }

    // Obtener business_id
    const { data: businessData } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', authState.user.id)
      .single()

    if (!businessData) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se encontró el negocio',
      })
      return
    }

    const result = await openCashRegister({
      businessId: businessData.id,
      userId: authState.user.id,
      initialCashAmount: parseFloat(formData.initialCashAmount),
      openingNotes: formData.openingNotes.trim() || undefined,
    })

    if (result && result.success) {
      toast({
        title: '✅ Caja Abierta',
        description: `Sesión iniciada con ${new Intl.NumberFormat('es-EC', {
          style: 'currency',
          currency: 'USD',
        }).format(result.initial_cash_amount)}`,
      })
      onSuccess()
      onClose()
    } else {
      toast({
        variant: 'destructive',
        title: 'Error al abrir caja',
        description: 'No se pudo iniciar la sesión. Intente nuevamente.',
      })
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-lg  bg-orange-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            Abrir Caja
          </DialogTitle>
          <DialogDescription>
            Inicia una nueva sesión de caja registrando el efectivo inicial
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Monto Inicial */}
          <div className="space-y-2">
            <Label htmlFor="initialCashAmount" className="text-sm font-medium">
              Efectivo Inicial <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="initialCashAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.initialCashAmount}
                onChange={(e) =>
                  setFormData({ ...formData, initialCashAmount: e.target.value })
                }
                className={`pl-7 ${errors.initialCashAmount ? 'border-red-500' : ''}`}
                disabled={isLoading}
                autoFocus
              />
            </div>
            {errors.initialCashAmount && (
              <p className="text-sm text-red-500">{errors.initialCashAmount}</p>
            )}
            <p className="text-xs text-gray-500">
              Monto en efectivo con el que inicia la caja
            </p>
          </div>

          {/* Notas de Apertura */}
          <div className="space-y-2">
            <Label htmlFor="openingNotes" className="text-sm font-medium">
              Notas de Apertura
            </Label>
            <Textarea
              id="openingNotes"
              placeholder="Ej: Caja chica incluida, billetes verificados..."
              value={formData.openingNotes}
              onChange={(e) =>
                setFormData({ ...formData, openingNotes: e.target.value })
              }
              className="min-h-[80px] resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">Opcional</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r  bg-orange-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Abriendo...
                </>
              ) : (
                'Abrir Caja'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
