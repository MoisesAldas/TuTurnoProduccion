/**
 * Modal para Cerrar Caja
 * Permite cerrar sesión con conteo de denominaciones y validación
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCashRegister } from '@/hooks/useCashRegister'
import { useCurrentSession } from '@/hooks/useCurrentSession'
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
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { DENOMINATIONS_USD, DENOMINATION_LABELS } from '@/types/cash-register'
import type { DenominationType } from '@/types/cash-register'

interface CloseCashModalProps {
  sessionId: string
  onClose: () => void
  onSuccess: () => void
}

interface DenominationCount {
  type: DenominationType
  value: number
  quantity: number
}

export function CloseCashModal({ sessionId, onClose, onSuccess }: CloseCashModalProps) {
  const { authState } = useAuth()
  const { closeCashRegister, addDenomination, isLoading } = useCashRegister()
  const { toast } = useToast()
  const supabase = createClient()

  const [businessId, setBusinessId] = useState<string>('')
  const { session } = useCurrentSession({ businessId, enabled: !!businessId })

  const [useDenominations, setUseDenominations] = useState(false)
  const [closingNotes, setClosingNotes] = useState('')
  const [manualCashCounted, setManualCashCounted] = useState('')

  // Estados para denominaciones
  const [billCounts, setBillCounts] = useState<Record<number, number>>({
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    1: 0,
  })

  const [coinCounts, setCoinCounts] = useState<Record<number, number>>({
    1: 0,
    0.5: 0,
    0.25: 0,
    0.1: 0,
    0.05: 0,
    0.01: 0,
  })

  // Fetch business ID
  useEffect(() => {
    async function fetchBusiness() {
      if (!authState.user) return

      const { data } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', authState.user.id)
        .single()

      if (data) {
        setBusinessId(data.id)
      }
    }
    fetchBusiness()
  }, [authState.user, supabase])

  // Calcular totales
  const billsTotal = useMemo(() => {
    return DENOMINATIONS_USD.bills.reduce(
      (sum, value) => sum + value * (billCounts[value] || 0),
      0
    )
  }, [billCounts])

  const coinsTotal = useMemo(() => {
    return DENOMINATIONS_USD.coins.reduce(
      (sum, value) => sum + value * (coinCounts[value] || 0),
      0
    )
  }, [coinCounts])

  const totalCounted = useMemo(() => {
    return billsTotal + coinsTotal
  }, [billsTotal, coinsTotal])

  // Calcular diferencia
  const expectedCash = session?.expected_cash || 0
  const actualCash = useDenominations ? totalCounted : parseFloat(manualCashCounted) || 0
  const difference = actualCash - expectedCash

  const differenceType = useMemo(() => {
    if (Math.abs(difference) < 0.01) return 'exacto'
    if (difference < 0) return 'faltante'
    return 'sobrante'
  }, [difference])

  const handleBillChange = (value: number, quantity: string) => {
    const qty = parseInt(quantity) || 0
    setBillCounts({ ...billCounts, [value]: qty >= 0 ? qty : 0 })
  }

  const handleCoinChange = (value: number, quantity: string) => {
    const qty = parseInt(quantity) || 0
    setCoinCounts({ ...coinCounts, [value]: qty >= 0 ? qty : 0 })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!authState.user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No hay usuario autenticado',
      })
      return
    }

    if (!useDenominations && !manualCashCounted.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ingrese el efectivo contado',
      })
      return
    }

    // Paso 1: Registrar denominaciones si se usan
    if (useDenominations) {
      const denominations: DenominationCount[] = [
        ...DENOMINATIONS_USD.bills.map((value) => ({
          type: 'bill' as DenominationType,
          value,
          quantity: billCounts[value] || 0,
        })),
        ...DENOMINATIONS_USD.coins.map((value) => ({
          type: 'coin' as DenominationType,
          value,
          quantity: coinCounts[value] || 0,
        })),
      ]

      // Registrar solo las denominaciones con cantidad > 0
      for (const denom of denominations) {
        if (denom.quantity > 0) {
          await addDenomination({
            sessionId,
            denominationType: denom.type,
            denominationValue: denom.value,
            quantity: denom.quantity,
          })
        }
      }
    }

    // Paso 2: Cerrar caja
    const result = await closeCashRegister({
      sessionId,
      userId: authState.user.id,
      actualCashCounted: actualCash,
      closingNotes: closingNotes.trim() || undefined,
    })

    if (result && result.success) {
      toast({
        title: '✅ Caja Cerrada',
        description: `${result.summary.difference_type === 'exacto' ? 'Cierre exacto' : result.summary.difference_type === 'faltante' ? `Faltante: ${formatCurrency(Math.abs(result.summary.difference))}` : `Sobrante: ${formatCurrency(result.summary.difference)}`}`,
      })
      onSuccess()
      onClose()
    } else {
      toast({
        variant: 'destructive',
        title: 'Error al cerrar caja',
        description: 'No se pudo cerrar la sesión. Intente nuevamente.',
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 flex items-center justify-center">
              <X className="w-5 h-5 text-white" />
            </div>
            Cerrar Caja
          </DialogTitle>
          <DialogDescription>
            Cuenta el efectivo y cierra la sesión actual
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Resumen Sesión */}
          <div className="bg-orange-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-orange-900">Resumen de Sesión</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Efectivo Inicial</p>
                <p className="font-semibold">{formatCurrency(session?.initial_cash || 0)}</p>
              </div>
              <div>
                <p className="text-gray-600">Ventas Efectivo</p>
                <p className="font-semibold text-green-600">
                  +{formatCurrency(session?.current_cash_sales || 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Gastos</p>
                <p className="font-semibold text-red-600">
                  -{formatCurrency(session?.current_expenses || 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Efectivo Esperado</p>
                <p className="font-bold text-orange-900">
                  {formatCurrency(expectedCash)}
                </p>
              </div>
            </div>
          </div>

          {/* Método de Conteo */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Contar Denominaciones</Label>
              <p className="text-sm text-gray-500">
                {useDenominations
                  ? 'Cuenta billetes y monedas individualmente'
                  : 'Ingresa el total manualmente'}
              </p>
            </div>
            <Switch
              checked={useDenominations}
              onCheckedChange={setUseDenominations}
              disabled={isLoading}
            />
          </div>

          {useDenominations ? (
            <>
              {/* Billetes */}
              <div className="space-y-3">
                <Label className="text-base">Billetes</Label>
                <div className="grid grid-cols-2 gap-3">
                  {DENOMINATIONS_USD.bills.map((value) => (
                    <div key={value} className="flex items-center gap-2">
                      <Label className="w-16 text-sm font-medium">
                        {DENOMINATION_LABELS[value]}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={billCounts[value] || ''}
                        onChange={(e) => handleBillChange(value, e.target.value)}
                        className="flex-1 text-center"
                        disabled={isLoading}
                      />
                      <span className="w-20 text-sm text-gray-600 text-right">
                        {formatCurrency(value * (billCounts[value] || 0))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">Subtotal Billetes:</span>
                  <span className="font-bold text-lg">{formatCurrency(billsTotal)}</span>
                </div>
              </div>

              <Separator />

              {/* Monedas */}
              <div className="space-y-3">
                <Label className="text-base">Monedas</Label>
                <div className="grid grid-cols-2 gap-3">
                  {DENOMINATIONS_USD.coins.map((value) => (
                    <div key={value} className="flex items-center gap-2">
                      <Label className="w-16 text-sm font-medium">
                        {DENOMINATION_LABELS[value]}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={coinCounts[value] || ''}
                        onChange={(e) => handleCoinChange(value, e.target.value)}
                        className="flex-1 text-center"
                        disabled={isLoading}
                      />
                      <span className="w-20 text-sm text-gray-600 text-right">
                        {formatCurrency(value * (coinCounts[value] || 0))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">Subtotal Monedas:</span>
                  <span className="font-bold text-lg">{formatCurrency(coinsTotal)}</span>
                </div>
              </div>
            </>
          ) : (
            /* Conteo Manual */
            <div className="space-y-2">
              <Label htmlFor="manualCashCounted" className="text-sm font-medium">
                Efectivo Contado <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="manualCashCounted"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={manualCashCounted}
                  onChange={(e) => setManualCashCounted(e.target.value)}
                  className="pl-7"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Total y Diferencia */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total Contado:</span>
              <span className="text-2xl font-bold">
                {formatCurrency(actualCash)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="font-medium">Efectivo Esperado:</span>
              <span className="font-semibold">{formatCurrency(expectedCash)}</span>
            </div>
            <div
              className={`flex justify-between items-center p-3 rounded-lg ${
                differenceType === 'exacto'
                  ? 'bg-green-50'
                  : differenceType === 'faltante'
                    ? 'bg-red-50'
                    : 'bg-yellow-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {differenceType === 'exacto' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle
                    className={`w-5 h-5 ${differenceType === 'faltante' ? 'text-red-600' : 'text-yellow-600'}`}
                  />
                )}
                <span className="font-semibold">
                  {differenceType === 'exacto'
                    ? 'Cierre Exacto'
                    : differenceType === 'faltante'
                      ? 'Faltante'
                      : 'Sobrante'}
                </span>
              </div>
              <span
                className={`text-xl font-bold ${
                  differenceType === 'exacto'
                    ? 'text-green-700'
                    : differenceType === 'faltante'
                      ? 'text-red-700'
                      : 'text-yellow-700'
                }`}
              >
                {differenceType === 'exacto'
                  ? '✓'
                  : formatCurrency(Math.abs(difference))}
              </span>
            </div>
          </div>

          {/* Notas de Cierre */}
          <div className="space-y-2">
            <Label htmlFor="closingNotes" className="text-sm font-medium">
              Notas de Cierre
            </Label>
            <Textarea
              id="closingNotes"
              placeholder="Ej: Revisión completa, todo en orden..."
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
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
              className="flex-1 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cerrando...
                </>
              ) : (
                'Cerrar Caja'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
