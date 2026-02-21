'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Lock,
  Info,
  Receipt,
  Save
} from 'lucide-react'

export default function InvoiceConfigSection() {
  const { authState } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [businessId, setBusinessId] = useState<string>('')

  // Form state
  const [invoicePrefix, setInvoicePrefix] = useState('')
  const [sequentialStart, setSequentialStart] = useState(1)
  const [prefixLocked, setPrefixLocked] = useState(false)
  const [invoiceCount, setInvoiceCount] = useState(0)

  // Validation
  const [prefixError, setPrefixError] = useState('')
  const [previewNumber, setPreviewNumber] = useState('')

  useEffect(() => {
    if (authState.user) {
      fetchBusinessData()
    }
  }, [authState.user])

  useEffect(() => {
    // Actualizar vista previa en tiempo real
    if (invoicePrefix) {
      const currentYear = new Date().getFullYear()
      const formatted = `${invoicePrefix.toUpperCase()}-${currentYear}-${String(sequentialStart).padStart(4, '0')}`
      setPreviewNumber(formatted)
    } else {
      setPreviewNumber('')
    }
  }, [invoicePrefix, sequentialStart])

  const fetchBusinessData = async () => {
    if (!authState.user) return

    try {
      setLoading(true)

      // Obtener datos del negocio
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, invoice_prefix, invoice_sequential_start, invoice_prefix_locked')
        .eq('owner_id', authState.user.id)
        .single()

      if (businessError) throw businessError

      setBusinessId(businessData.id)
      setInvoicePrefix(businessData.invoice_prefix || '')
      setSequentialStart(businessData.invoice_sequential_start || 1)
      setPrefixLocked(businessData.invoice_prefix_locked || false)

      // Contar facturas emitidas
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessData.id)

      setInvoiceCount(count || 0)

    } catch (error) {
      console.error('Error fetching business data:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar la configuración de facturación.',
      })
    } finally {
      setLoading(false)
    }
  }

  const validatePrefix = (prefix: string): string | null => {
    // Limpiar espacios
    const cleaned = prefix.trim().toUpperCase()

    // Validar vacío
    if (!cleaned) {
      return 'El prefijo es obligatorio'
    }

    // Validar longitud
    if (cleaned.length < 2) {
      return 'El prefijo debe tener al menos 2 caracteres'
    }

    if (cleaned.length > 10) {
      return 'El prefijo no puede exceder 10 caracteres'
    }

    // Validar caracteres permitidos (solo letras y números)
    if (!/^[A-Z0-9]+$/.test(cleaned)) {
      return 'Solo se permiten letras mayúsculas y números (sin espacios ni caracteres especiales)'
    }

    return null
  }

  const handlePrefixChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setInvoicePrefix(cleaned)

    const error = validatePrefix(cleaned)
    setPrefixError(error || '')
  }

  const handleSave = async () => {
    if (!businessId) return

    // Validar prefijo
    const error = validatePrefix(invoicePrefix)
    if (error) {
      setPrefixError(error)
      return
    }

    // Validar si está bloqueado
    if (prefixLocked) {
      toast({
        variant: 'destructive',
        title: 'Prefijo bloqueado',
        description: 'No puedes modificar el prefijo porque ya has emitido facturas.',
      })
      return
    }

    try {
      setSaving(true)

      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          invoice_prefix: invoicePrefix.toUpperCase(),
          invoice_sequential_start: sequentialStart,
        })
        .eq('id', businessId)

      if (updateError) throw updateError

      toast({
        title: 'Configuración guardada',
        description: 'El prefijo de facturación ha sido actualizado exitosamente.',
      })

      // Recargar datos
      await fetchBusinessData()

    } catch (error) {
      console.error('Error saving invoice config:', error)
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se pudo actualizar la configuración. Por favor intenta nuevamente.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-sm dark:bg-gray-900 rounded-[2rem] overflow-hidden">
        <CardContent className="p-8 text-center bg-white dark:bg-gray-900">
          <div className="animate-spin w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-2" />
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cargando...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:bg-gray-900 rounded-[2rem] overflow-hidden">
      <CardHeader className="px-6 pt-6 pb-2">
        <div className="flex flex-col gap-0.5 relative pl-5">
          <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-full mt-0.5" />
          <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600">
            Módulo Contable
          </span>
          <CardTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
            Configuración de Facturación
          </CardTitle>
        </div>
        <CardDescription className="px-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
          Establece el formato legal y secuencial de tus comprobantes
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-6 space-y-5">
        {/* Alert compacto cuando está bloqueado */}
        {prefixLocked && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/30 dark:border-amber-900/40">
            <div className="w-10 h-10 rounded-xl bg-amber-100/50 dark:bg-amber-950/50 flex items-center justify-center flex-shrink-0">
              <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-[11px] font-bold text-amber-900/80 dark:text-amber-200/80 uppercase tracking-tight">
              <strong>Prefijo bloqueado:</strong> Has emitido <strong>{invoiceCount} factura{invoiceCount !== 1 ? 's' : ''}</strong>. No es posible modificar el prefijo por razones contables.
            </p>
          </div>
        )}

        {/* Grid: Configuración */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Prefijo */}
          <div className="space-y-1.5">
            <Label htmlFor="invoice_prefix" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Prefijo de Venta *
            </Label>
            <Input
              id="invoice_prefix"
              value={invoicePrefix}
              onChange={(e) => handlePrefixChange(e.target.value)}
              disabled={prefixLocked}
              placeholder="Ej: FAC"
              className={`h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm font-black uppercase font-mono ${prefixError ? 'border-red-500' : ''}`}
              maxLength={10}
            />
            {prefixError && (
              <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tight flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {prefixError}
              </p>
            )}
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
              Letras y Números (Máx 10)
            </p>
          </div>

          {/* Número Inicial */}
          <div className="space-y-1.5">
            <Label htmlFor="sequential_start" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Secuencia Inicial
            </Label>
            <Input
              id="sequential_start"
              type="number"
              min="1"
              max="9999"
              value={sequentialStart}
              onChange={(e) => setSequentialStart(parseInt(e.target.value) || 1)}
              disabled={prefixLocked || invoiceCount > 0}
              className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm font-black"
            />
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
              {invoiceCount > 0 ? 'Protegido por historial' : 'Comienza en el n° indicado'}
            </p>
          </div>

          {/* Ejemplos - Compact Row */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest pr-1">Sugeridos:</span>
              {['SALON', 'BARBER', 'SPA', 'CITA', 'TURNO'].map((example) => (
                <Button
                  key={example}
                  type="button"
                  variant="ghost"
                  disabled={prefixLocked}
                  onClick={() => handlePrefixChange(example)}
                  className="h-7 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-orange-50 hover:text-orange-600 transition-colors disabled:opacity-50"
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Vista Previa Premium */}
        {previewNumber && (
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-orange-50/30 dark:bg-orange-950/20 border border-orange-100/30 dark:border-orange-900/40">
            <div className="w-10 h-10 rounded-xl bg-orange-100/50 dark:bg-orange-950/50 flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-orange-950 dark:text-orange-200 uppercase tracking-widest pr-1">Próxima Emisión</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-orange-600 text-white text-[11px] font-black uppercase tracking-widest border-0 rounded-lg">
                  {previewNumber}
                </Badge>
                <div className="flex gap-1">
                  {[1, 2].map((num) => {
                    const currentYear = new Date().getFullYear()
                    const nextNum = `${invoicePrefix.toUpperCase()}-${currentYear}-${String(sequentialStart + num).padStart(4, '0')}`
                    return (
                      <span key={num} className="text-[10px] font-bold text-gray-300 uppercase tracking-tight">/ {nextNum}</span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Políticas y Estadísticas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-gray-50 dark:border-gray-800">
           <div className="flex flex-col gap-1">
             <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
               <CheckCircle className="w-3 h-3 text-green-500" />
               Aprobado por sistema fiscal
             </div>
             {invoiceCount > 0 && (
               <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                 {invoiceCount} registros históricos detectados
               </div>
             )}
           </div>

           {/* Sticky Action Bar - Standardized */}
           <div className="flex items-center gap-2">
             {!prefixLocked && invoicePrefix && (
               <Button
                 type="button"
                 variant="ghost"
                 onClick={() => {
                   setInvoicePrefix('')
                   setSequentialStart(1)
                   setPrefixError('')
                 }}
                 className="h-9 px-4 rounded-lg text-xs font-bold text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
               >
                 Restablecer
               </Button>
             )}
             <Button
               type="button"
               onClick={handleSave}
               disabled={saving || prefixLocked || !invoicePrefix || !!prefixError}
               className="h-9 px-6 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-lg transition-all active:scale-95"
             >
               {saving ? (
                 <>
                   <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                   Guardando...
                 </>
               ) : (
                 <>
                   <Save className="w-3.5 h-3.5 mr-2" />
                   Aplicar Formato
                 </>
               )}
             </Button>
           </div>
        </div>
      </CardContent>
    </Card>
  )
}
