'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { X, DollarSign, CreditCard, Banknote, ArrowRight, Check, AlertCircle, Settings, Camera } from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabaseClient'
import { validateImageFile, compressReceiptImage } from '@/lib/imageUtils'

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
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string>('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      setReceiptFile(null)
      setReceiptPreview('')
    }
  }

  const handleReceiptSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar archivo
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      setError(validation.error || 'Archivo inválido')
      return
    }

    try {
      setUploadingReceipt(true)
      setError('')

      // Comprimir imagen (sin crop, solo compresión)
      const compressed = await compressReceiptImage(file)

      // Crear preview
      const preview = URL.createObjectURL(compressed)
      setReceiptFile(compressed)
      setReceiptPreview(preview)
    } catch (error) {
      console.error('Error al procesar imagen:', error)
      setError('Error al procesar la imagen. Por favor intenta nuevamente.')
    } finally {
      setUploadingReceipt(false)
    }
  }

  const uploadReceipt = async (invoiceId: string, businessId: string): Promise<string | null> => {
    if (!receiptFile) return null

    try {
      // 1. Crear carpeta del negocio si no existe
      const businessFolderKeep = `${businessId}/.keep`
      await supabase.storage
        .from('payment-receipts')
        .upload(businessFolderKeep, new Blob([''], { type: 'text/plain' }), {
          upsert: true
        })

      // 2. Crear carpeta de la factura si no existe
      const invoiceFolderKeep = `${businessId}/${invoiceId}/.keep`
      await supabase.storage
        .from('payment-receipts')
        .upload(invoiceFolderKeep, new Blob([''], { type: 'text/plain' }), {
          upsert: true
        })

      // 3. Subir el comprobante
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `${businessId}/${invoiceId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, receiptFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading receipt:', uploadError)
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error in uploadReceipt:', error)
      return null
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

      // 1. Get the appointment to check its status and business_id
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('status, business_id')
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

      // 4. Upload receipt if exists (for transfers)
      let receiptUrl: string | null = null
      if (receiptFile && paymentMethod === 'transfer') {
        receiptUrl = await uploadReceipt(invoice.id, appointment.business_id)
        if (!receiptUrl) {
          console.warn('⚠️ Failed to upload receipt, continuing without it')
        }
      }

      // 5. Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoice.id,
          payment_method: paymentMethod,
          amount: totalAmount,
          transfer_reference: paymentMethod === 'transfer' ? transferReference.trim() : null,
          receipt_url: receiptUrl,
          receipt_filename: receiptFile?.name || null,
          receipt_uploaded_at: receiptUrl ? new Date().toISOString() : null,
          payment_date: new Date().toISOString()
        })

      if (paymentError) {
        // Handle unique constraint error for transfer reference
        if (paymentError.code === '23505' && paymentError.message.includes('unique_transfer_reference')) {
          throw new Error('Este número de referencia ya ha sido utilizado. Por favor verifica el número.')
        }
        throw paymentError
      }

      // 6. Send invoice email
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

      // 7. Success!
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 border-none bg-transparent shadow-none" showCloseButton={false}>
        <div
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-h-[95vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con color sólido Premium - Ultra Compacto */}
          <div className="relative overflow-hidden pt-4 pb-3 sm:pt-6 sm:pb-4 px-5 sm:px-8 bg-primary shadow-lg sm:shadow-xl">
            {/* Botón Cerrar Premium - Ultra Ajustado */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-black/10 hover:bg-black/20 text-white border-none transition-all duration-300 z-10"
              disabled={processing}
            >
              <X className="w-3.5 h-3.5" />
            </Button>

            <div className="relative flex items-center gap-3 sm:gap-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/20 flex-shrink-0">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-[8px] sm:text-[9px] font-black text-white/80 uppercase tracking-[0.2em]">
                    Cita #{appointmentId.substring(0, 8)}
                  </span>
                </div>
                
                <h2 className="text-lg sm:text-2xl font-black text-white leading-none tracking-tight mb-1">
                  Finalizar Compra
                </h2>
                <p className="text-white/90 text-[10px] sm:text-xs font-medium truncate italic opacity-80">
                  Registra el pago para completar la cita
                </p>
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin dark:scrollbar-thumb-gray-800">
            {/* Services Summary - Premium Style */}
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 sm:p-6 mb-5">
              <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                Resumen de Servicios
              </h3>
              <div className="space-y-3">
                {services.map((service, index) => (
                  <div key={index} className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{service.name}</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white">{formatPrice(service.price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total - High Contrast */}
            <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-[2rem] p-5 sm:p-6 shadow-xl border border-white/5 mb-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/20 transition-all duration-700" />
              <div className="flex justify-between items-center relative z-10">
                <span className="text-xs sm:text-sm font-black text-white/60 uppercase tracking-widest">Total a Pagar</span>
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  {formatPrice(totalAmount)}
                </span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4">Método de Pago</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Cash Option */}
                <button
                  onClick={() => handlePaymentMethodSelect('cash')}
                  disabled={processing}
                  className={`relative p-6 rounded-[2rem] border-2 transition-all duration-300 ${
                    paymentMethod === 'cash'
                      ? 'border-primary bg-orange-50/30 dark:bg-orange-950/10 shadow-lg scale-[1.02]'
                      : 'border-gray-100 dark:border-gray-800 hover:border-primary/50 dark:hover:border-primary/50 bg-white dark:bg-gray-800/50'
                  } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                      paymentMethod === 'cash'
                        ? 'bg-primary text-white shadow-lg shadow-orange-500/20 rotate-0'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rotate-3 group-hover:rotate-0'
                    }`}>
                      <Banknote className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <p className={`font-black uppercase tracking-widest text-xs ${
                        paymentMethod === 'cash' ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        Efectivo
                      </p>
                    </div>
                    {paymentMethod === 'cash' && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-md">
                        <Check className="w-3 h-3 text-white stroke-[3px]" />
                      </div>
                    )}
                  </div>
                </button>

                {/* Transfer Option */}
                <button
                  onClick={() => handlePaymentMethodSelect('transfer')}
                  disabled={processing}
                  className={`relative p-6 rounded-[2rem] border-2 transition-all duration-300 ${
                    paymentMethod === 'transfer'
                      ? 'border-primary bg-orange-50/30 dark:bg-orange-950/10 shadow-lg scale-[1.02]'
                      : 'border-gray-100 dark:border-gray-800 hover:border-primary/50 dark:hover:border-primary/50 bg-white dark:bg-gray-800/50'
                  } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'}`}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                      paymentMethod === 'transfer'
                        ? 'bg-primary text-white shadow-lg shadow-orange-500/20 rotate-0'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rotate-3 group-hover:rotate-0'
                    }`}>
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <p className={`font-black uppercase tracking-widest text-xs ${
                        paymentMethod === 'transfer' ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        Transferencia
                      </p>
                    </div>
                    {paymentMethod === 'transfer' && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-md">
                        <Check className="w-3 h-3 text-white stroke-[3px]" />
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Transfer Reference Input */}
            {paymentMethod === 'transfer' && (
              <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800">
                  <Label htmlFor="transfer-reference" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2 block">
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
                    className="h-12 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus-visible:ring-primary rounded-xl font-bold dark:text-white"
                  />
                  <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-2 italic">
                    * Debe corresponder exactamente al comprobante bancario.
                  </p>
                </div>

                {/* Receipt Upload Section */}
                <div className="pt-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2 block pl-5">
                    Comprobante Visual (opcional)
                  </Label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleReceiptSelect}
                    disabled={processing || uploadingReceipt}
                    className="hidden"
                  />

                  {!receiptPreview ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={processing || uploadingReceipt}
                      className="w-full border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-primary h-auto py-6 rounded-[2rem] bg-gray-50/50 dark:bg-gray-800/30 transition-all group"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <Camera className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-primary" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          {uploadingReceipt ? 'Procesando...' : 'Adjuntar Captura'}
                        </span>
                      </div>
                    </Button>
                  ) : (
                    <div className="relative rounded-[2rem] overflow-hidden border-2 border-primary/20 shadow-xl group">
                      <img
                        src={receiptPreview}
                        alt="Comprobante"
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={processing || uploadingReceipt}
                          className="rounded-xl font-bold text-xs"
                        >
                          Cambiar
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setReceiptFile(null)
                            setReceiptPreview('')
                          }}
                          disabled={processing}
                          className="rounded-xl font-bold text-xs"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer Actions - Premium Standard */}
          <div className="border-t border-gray-100 dark:border-gray-800 p-6 bg-gray-50/50 dark:bg-gray-950/50 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onClose}
                disabled={processing}
                variant="ghost"
                className="flex-1 h-12 rounded-xl text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleFinalizePurchase}
                disabled={processing || !paymentMethod}
                className="flex-[2] h-12 bg-primary hover:bg-orange-600 text-white rounded-xl shadow-xl shadow-orange-500/20 transition-all duration-300 active:scale-[0.98] group"
              >
                {processing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Procesando...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 w-full">
                    <span className="text-[10px] font-black uppercase tracking-widest">Registrar Pago</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

}
