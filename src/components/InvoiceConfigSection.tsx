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
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 dark:from-orange-700 dark:to-amber-800 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="dark:text-gray-50">Configuración de Facturación</CardTitle>
            <CardDescription className="mt-1 dark:text-gray-400">
              Personaliza el formato de tus números de factura
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Alert Informativo */}
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-200">¿Qué es el prefijo de factura?</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-200 text-sm">
            El prefijo es un identificador único que aparecerá en todas tus facturas.
            Ejemplo: Si eliges "SALON", tus facturas serán: <strong>SALON-2025-0001</strong>, <strong>SALON-2025-0002</strong>, etc.
          </AlertDescription>
        </Alert>

        {/* Estado del Prefijo */}
        {prefixLocked && (
          <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700">
            <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-900 dark:text-amber-200">Prefijo bloqueado</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-200 text-sm">
              Has emitido <strong>{invoiceCount} factura{invoiceCount !== 1 ? 's' : ''}</strong>.
              El prefijo se ha bloqueado automáticamente para mantener la consistencia de tus registros contables.
            </AlertDescription>
          </Alert>
        )}

        {/* Configuración del Prefijo */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="invoice_prefix" className="text-base font-semibold dark:text-gray-50">
              Prefijo de Factura *
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">
              Define el identificador que aparecerá en todas tus facturas
            </p>
            <Input
              id="invoice_prefix"
              value={invoicePrefix}
              onChange={(e) => handlePrefixChange(e.target.value)}
              disabled={prefixLocked}
              placeholder="Ej: SALON, BARBER, SPA"
              className={`text-lg font-mono uppercase ${prefixError ? 'border-red-500' : ''}`}
              maxLength={10}
            />
            {prefixError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {prefixError}
              </p>
            )}

            {/* Ejemplos */}
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">💡 Ejemplos sugeridos:</p>
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

          {/* Número Inicial de Secuencia */}
          <div>
            <Label htmlFor="sequential_start" className="text-base font-semibold dark:text-gray-50">
              Número Inicial de Secuencia
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">
              Número desde el cual comenzará la numeración de tus facturas
            </p>
            <Input
              id="sequential_start"
              type="number"
              min="1"
              max="9999"
              value={sequentialStart}
              onChange={(e) => setSequentialStart(parseInt(e.target.value) || 1)}
              disabled={prefixLocked || invoiceCount > 0}
              className="text-lg"
            />
            {invoiceCount > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                <Info className="w-4 h-4" />
                No se puede modificar porque ya tienes facturas emitidas
              </p>
            )}
          </div>
        </div>

        {/* Vista Previa */}
        {previewNumber && (
          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 dark:text-green-50 mb-2">Vista Previa</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-300 mb-1">Tu primera factura será:</p>
                    <p className="text-2xl font-bold font-mono text-green-900 dark:text-green-50">{previewNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-300 mb-1">Próximas facturas:</p>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3].map((num) => {
                        const currentYear = new Date().getFullYear()
                        const nextNum = `${invoicePrefix.toUpperCase()}-${currentYear}-${String(sequentialStart + num).padStart(4, '0')}`
                        return (
                          <Badge key={num} variant="outline" className="bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 font-mono">
                            {nextNum}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reglas de Validación */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">📋 Reglas del Prefijo</h4>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <span>Solo letras mayúsculas y números (A-Z, 0-9)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <span>Entre 2 y 10 caracteres de longitud</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <span>Sin espacios ni caracteres especiales (-, _, @, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <span>Se recomienda usar el nombre de tu negocio (ej: SALON, BARBER)</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <span><strong>Importante:</strong> Una vez emitida la primera factura, el prefijo se bloqueará automáticamente</span>
            </li>
          </ul>
        </div>

        {/* Estadísticas */}
        {invoiceCount > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Has emitido <strong>{invoiceCount}</strong> factura{invoiceCount !== 1 ? 's' : ''} con el prefijo <strong>{invoicePrefix}</strong>
                </p>
                {previewNumber && (
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Próxima factura: {previewNumber.replace(String(sequentialStart).padStart(4, '0'), String(sequentialStart + invoiceCount).padStart(4, '0'))}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex gap-3 pt-4">
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
