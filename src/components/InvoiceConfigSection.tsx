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
  Receipt
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
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando configuración...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg dark:text-gray-50">
          <Receipt className="w-5 h-5 text-orange-600" />
          Configuración de Facturación
        </CardTitle>
        <CardDescription className="dark:text-gray-400 text-sm">
          Personaliza el formato de tus números de factura
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Alert compacto cuando está bloqueado */}
        {prefixLocked && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-sm text-amber-900 dark:text-amber-200">
            <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>
              <strong>Prefijo bloqueado:</strong> Has emitido <strong>{invoiceCount} factura{invoiceCount !== 1 ? 's' : ''}</strong>. No se puede modificar para mantener consistencia contable.
            </span>
          </div>
        )}

        {/* Grid: Configuración */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
          {/* Prefijo */}
          <div className="space-y-1.5">
            <Label htmlFor="invoice_prefix" className="text-sm dark:text-gray-50">
              Prefijo de Factura *
            </Label>
            <Input
              id="invoice_prefix"
              value={invoicePrefix}
              onChange={(e) => handlePrefixChange(e.target.value)}
              disabled={prefixLocked}
              placeholder="Ej: SALON"
              className={`h-9 font-mono uppercase ${prefixError ? 'border-red-500' : ''}`}
              maxLength={10}
            />
            {prefixError && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {prefixError}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Solo letras y números (2-10 caracteres)
            </p>
          </div>

          {/* Número Inicial */}
          <div className="space-y-1.5">
            <Label htmlFor="sequential_start" className="text-sm dark:text-gray-50">
              Número Inicial
            </Label>
            <Input
              id="sequential_start"
              type="number"
              min="1"
              max="9999"
              value={sequentialStart}
              onChange={(e) => setSequentialStart(parseInt(e.target.value) || 1)}
              disabled={prefixLocked || invoiceCount > 0}
              className="h-9"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {invoiceCount > 0 ? 'Bloqueado (facturas emitidas)' : 'Primera factura iniciará en este número'}
            </p>
          </div>

          {/* Ejemplos - Full Width */}
          <div className="lg:col-span-2">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">💡 Sugerencias:</p>
            <div className="flex flex-wrap gap-2">
              {['SALON', 'BARBER', 'SPA', 'ESTETICA', 'BELLEZA'].map((example) => (
                <Badge
                  key={example}
                  variant="outline"
                  className="cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors dark:hover:bg-orange-900/20 dark:hover:border-orange-700"
                  onClick={() => !prefixLocked && handlePrefixChange(example)}
                >
                  {example}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Vista Previa Compacta */}
        {previewNumber && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FileText className="w-4 h-4 text-green-600" />
            <span>Primera factura:</span>
            <Badge variant="secondary" className="font-mono text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20">
              {previewNumber}
            </Badge>
            <span>→</span>
            {[1, 2].map((num) => {
              const currentYear = new Date().getFullYear()
              const nextNum = `${invoicePrefix.toUpperCase()}-${currentYear}-${String(sequentialStart + num).padStart(4, '0')}`
              return (
                <Badge key={num} variant="outline" className="font-mono text-xs">
                  {nextNum}
                </Badge>
              )
            })}
          </div>
        )}

        {/* Reglas Compactas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>Solo A-Z y 0-9 (2-10 caracteres)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>Sin espacios ni símbolos especiales</span>
          </div>
          <div className="flex items-center gap-1.5 lg:col-span-2">
            <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span><strong>Importante:</strong> Se bloquea tras emitir la primera factura</span>
          </div>
        </div>

        {/* Estadísticas */}
        {invoiceCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <FileText className="w-4 h-4" />
            <span>Has emitido <strong>{invoiceCount}</strong> factura{invoiceCount !== 1 ? 's' : ''} con prefijo <strong>{invoicePrefix}</strong></span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex gap-3 pt-3">
          <Button
            onClick={handleSave}
            disabled={saving || prefixLocked || !invoicePrefix || !!prefixError}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
          >
            {saving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Guardando...
              </>
            ) : (
              'Guardar Configuración'
            )}
          </Button>

          {!prefixLocked && invoicePrefix && (
            <Button
              variant="outline"
              onClick={() => {
                setInvoicePrefix('')
                setSequentialStart(1)
                setPrefixError('')
              }}
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Limpiar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
