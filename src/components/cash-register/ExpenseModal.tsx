/**
 * Modal para Registrar Gastos
 * Permite registrar gastos durante una sesión de caja abierta
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { TrendingDown, Loader2 } from 'lucide-react'
import { EXPENSE_CATEGORIES } from '@/types/cash-register'
import type { ExpenseCategory } from '@/types/cash-register'

interface ExpenseModalProps {
  sessionId: string
  onClose: () => void
  onSuccess: () => void
}

export function ExpenseModal({ sessionId, onClose, onSuccess }: ExpenseModalProps) {
  const { authState } = useAuth()
  const { addExpense, isLoading } = useCashRegister()
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    amount: '',
    category: '' as ExpenseCategory | '',
    description: '',
  })

  const [errors, setErrors] = useState({
    amount: '',
    category: '',
    description: '',
  })

  const validateForm = (): boolean => {
    const newErrors = {
      amount: '',
      category: '',
      description: '',
    }

    const amount = parseFloat(formData.amount)

    if (!formData.amount.trim()) {
      newErrors.amount = 'El monto es requerido'
    } else if (isNaN(amount)) {
      newErrors.amount = 'Ingrese un monto válido'
    } else if (amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0'
    }

    if (!formData.category) {
      newErrors.category = 'Seleccione una categoría'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida'
    } else if (formData.description.trim().length < 3) {
      newErrors.description = 'Mínimo 3 caracteres'
    }

    setErrors(newErrors)
    return !newErrors.amount && !newErrors.category && !newErrors.description
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

    const result = await addExpense({
      sessionId,
      businessId: businessData.id,
      amount: parseFloat(formData.amount),
      category: formData.category as ExpenseCategory,
      description: formData.description.trim(),
      createdBy: authState.user.id,
    })

    if (result && result.success) {
      toast({
        title: '✅ Gasto Registrado',
        description: `${EXPENSE_CATEGORIES[result.category]}: ${new Intl.NumberFormat('es-EC', {
          style: 'currency',
          currency: 'USD',
        }).format(result.amount)}`,
      })
      onSuccess()
      onClose()
    } else {
      toast({
        variant: 'destructive',
        title: 'Error al registrar gasto',
        description: 'No se pudo registrar el gasto. Intente nuevamente.',
      })
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            Registrar Gasto
          </DialogTitle>
          <DialogDescription>
            Registra un gasto realizado durante la sesión actual
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Monto <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className={`pl-7 ${errors.amount ? 'border-red-500' : ''}`}
                disabled={isLoading}
                autoFocus
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Categoría <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value as ExpenseCategory })
              }
              disabled={isLoading}
            >
              <SelectTrigger
                className={errors.category ? 'border-red-500' : ''}
              >
                <SelectValue placeholder="Seleccione categoría" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Ej: Compra de productos de limpieza..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className={`min-h-[80px] resize-none ${
                errors.description ? 'border-red-500' : ''
              }`}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
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
              className="flex-1 bg-orange-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Gasto'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
