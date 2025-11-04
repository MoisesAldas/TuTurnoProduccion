'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, DollarSign, CreditCard, Banknote, ArrowRight, Check, AlertCircle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabaseClient'

interface CheckoutModalProps {
  appointmentId: string
  totalAmount: number
  services: Array<{
    name: string
    price: number
  }>
  onClose: () => void
  onSuccess: () => void
}

type PaymentMethod = 'cash' | 'transfer' | null

export default function CheckoutModal({
  appointmentId,
  totalAmount,
  services,
  onClose,
  onSuccess
}: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)
  const [transferReference, setTransferReference] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method)
    setError('')
    if (method === 'cash') {
      setTransferReference('')
    }
  }

  const handleFinalizePurchase = async () => {
    // Validate payment method selected
    if (!paymentMethod) {
      setError('Por favor selecciona un método de pago')
      return
    }

    // Validate transfer reference if transfer method
    if (paymentMethod === 'transfer' && !transferReference.trim()) {
      setError('Por favor ingresa el número de referencia de la transferencia')
      return
    }

    try {
      setProcessing(true)
      setError('')

      // 1. Get the appointment to check its status
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('status')
        .eq('id', appointmentId)
        .single()

      if (appointmentError) throw appointmentError

      // 2. If appointment is not completed, mark it as completed first
      // This will trigger the automatic invoice creation
      if (appointment.status !== 'completed') {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', appointmentId)

        if (updateError) throw updateError

        // Wait a moment for the trigger to create the invoice
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // 3. Get or wait for invoice (with retry logic for trigger race condition)
      let invoice = null
      let retries = 0
      const maxRetries = 5

      while (!invoice && retries < maxRetries) {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('id')
          .eq('appointment_id', appointmentId)
          .maybeSingle()

        if (invoiceError) throw invoiceError

        if (invoiceData) {
          invoice = invoiceData
        } else {
          // Wait before retrying
          retries++
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      if (!invoice) {
        throw new Error('No se pudo obtener la factura. Por favor intenta nuevamente.')
      }

      // 4. Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoice.id,
          payment_method: paymentMethod,
          amount: totalAmount,
          transfer_reference: paymentMethod === 'transfer' ? transferReference.trim() : null,
          payment_date: new Date().toISOString()
        })

      if (paymentError) {
        // Handle unique constraint error for transfer reference
        if (paymentError.code === '23505' && paymentError.message.includes('unique_transfer_reference')) {
          throw new Error('Este número de referencia ya ha sido utilizado. Por favor verifica el número.')
        }
        throw paymentError
      }

      // 5. Send invoice email
      try {
        await fetch('/api/send-invoice-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId })
        })
      } catch (emailError) {
        console.warn('⚠️ Failed to send invoice email:', emailError)
        // Don't block the operation if email fails
      }

      // 6. Success!
      toast({
        title: '¡Pago registrado exitosamente!',
        description: `El pago de ${formatPrice(totalAmount)} ha sido registrado correctamente.`,
      })

      onSuccess()
    } catch (error: any) {
      console.error('Error processing payment:', error)

      // Check if error is about missing invoice prefix configuration
      const errorMessage = error.message || ''
      const isMissingPrefix =
        errorMessage.includes('prefijo de factura') ||
        errorMessage.includes('configurar el prefijo') ||
        errorMessage.includes('Configuración → Facturación')

      if (isMissingPrefix) {
        // Show special error for missing invoice prefix
        setError('Debes configurar el prefijo de factura antes de finalizar un pago.')
        toast({
          variant: 'destructive',
          title: 'Configuración de Facturación Requerida',
          description: 'Necesitas configurar el prefijo de tus facturas antes de poder registrar pagos.',
          action: (
            <Button
              size="sm"
              variant="outline"
              className="bg-white hover:bg-gray-100 text-orange-600 border-orange-300"
              onClick={() => {
                onClose()
                router.push('/dashboard/business/settings/advanced?tab=invoicing')
              }}
            >
              <Settings className="w-4 h-4 mr-1" />
              Configurar Ahora
            </Button>
          ),
        })
      } else {
        // Generic error handling
        setError(error.message || 'Ocurrió un error al procesar el pago. Por favor intenta nuevamente.')
        toast({
          variant: 'destructive',
          title: 'Error al procesar pago',
          description: error.message || 'No se pudo completar el pago.',
        })
      }
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 rounded-t-2xl p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            disabled={processing}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white">Finalizar Compra</h2>
              <p className="text-white/90 mt-1 text-sm">Registra el pago para completar la cita</p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Services Summary */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              Resumen de Servicios
            </h3>
            <div className="space-y-3">
              {services.map((service, index) => (
                <div key={index} className="flex justify-between items-center pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                  <span className="text-gray-700">{service.name}</span>
                  <span className="font-semibold text-gray-900">{formatPrice(service.price)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-5 border-2 border-orange-200 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total a Pagar</span>
              <span className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                {formatPrice(totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Método de Pago</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Cash Option */}
              <button
                onClick={() => handlePaymentMethodSelect('cash')}
                disabled={processing}
                className={`relative p-6 rounded-xl border-2 transition-all duration-300 ${
                  paymentMethod === 'cash'
                    ? 'border-orange-500 bg-orange-50 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                    paymentMethod === 'cash'
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600'
                      : 'bg-gray-100'
                  }`}>
                    <Banknote className={`w-8 h-8 ${
                      paymentMethod === 'cash' ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold ${
                      paymentMethod === 'cash' ? 'text-orange-600' : 'text-gray-700'
                    }`}>
                      Efectivo
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Pago en efectivo</p>
                  </div>
                  {paymentMethod === 'cash' && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>

              {/* Transfer Option */}
              <button
                onClick={() => handlePaymentMethodSelect('transfer')}
                disabled={processing}
                className={`relative p-6 rounded-xl border-2 transition-all duration-300 ${
                  paymentMethod === 'transfer'
                    ? 'border-orange-500 bg-orange-50 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                    paymentMethod === 'transfer'
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600'
                      : 'bg-gray-100'
                  }`}>
                    <CreditCard className={`w-8 h-8 ${
                      paymentMethod === 'transfer' ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold ${
                      paymentMethod === 'transfer' ? 'text-orange-600' : 'text-gray-700'
                    }`}>
                      Transferencia
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Pago por transferencia</p>
                  </div>
                  {paymentMethod === 'transfer' && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Transfer Reference Input */}
          {paymentMethod === 'transfer' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <Label htmlFor="transfer-reference" className="text-gray-900 font-medium mb-2 block">
                Número de Referencia *
              </Label>
              <Input
                id="transfer-reference"
                type="text"
                placeholder="Ej: 1234567890"
                value={transferReference}
                onChange={(e) => {
                  setTransferReference(e.target.value)
                  setError('')
                }}
                disabled={processing}
                className="border-2 border-gray-200 focus:border-orange-500 rounded-lg p-3"
              />
              <p className="text-xs text-gray-500 mt-2">
                Este número debe ser único y corresponder a la referencia de la transferencia bancaria
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              disabled={processing}
              variant="outline"
              className="flex-1 hover:bg-gray-100 transition-all"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFinalizePurchase}
              disabled={processing || !paymentMethod}
              className="flex-1 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Procesando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Finalizar Compra
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
