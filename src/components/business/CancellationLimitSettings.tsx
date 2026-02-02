'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'

interface CancellationLimitSettingsProps {
  businessId: string
  onLimitChange?: (limit: number) => void
  onEnabledChange?: (enabled: boolean) => void
}

export default function CancellationLimitSettings({ 
  businessId, 
  onLimitChange,
  onEnabledChange 
}: CancellationLimitSettingsProps) {
  const [limit, setLimit] = useState<number>(3)
  const [enabled, setEnabled] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (businessId) {
      fetchCurrentSettings()
    }
  }, [businessId])

  const fetchCurrentSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('businesses')
        .select('max_monthly_cancellations, enable_cancellation_blocking')
        .eq('id', businessId)
        .single()

      if (error) throw error
      
      const newLimit = data.max_monthly_cancellations || 3
      const newEnabled = data.enable_cancellation_blocking ?? true
      
      setLimit(newLimit)
      setEnabled(newEnabled)
      
      // Notify parent of initial values
      onLimitChange?.(newLimit)
      onEnabledChange?.(newEnabled)
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar la configuración',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    onLimitChange?.(newLimit)
  }

  const handleEnabledChange = (newEnabled: boolean) => {
    setEnabled(newEnabled)
    onEnabledChange?.(newEnabled)
  }

  if (loading) {
    return (
      <Card className="dark:border-gray-700">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-orange-600" />
          Límite de Cancelaciones
        </CardTitle>
        <CardDescription className="dark:text-gray-400 text-sm">
          Protege tu negocio bloqueando clientes con cancelaciones excesivas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Toggle para habilitar/deshabilitar */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Bloqueo automático</Label>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm">{enabled ? 'Activado' : 'Desactivado'}</span>
              </div>
              <Switch
                id="enable-blocking"
                checked={enabled}
                onCheckedChange={handleEnabledChange}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {enabled ? 'Bloqueo automático habilitado' : 'Sistema desactivado'}
            </p>
          </div>

          {/* Límite de cancelaciones */}
          <div className="space-y-1.5">
            <Label htmlFor="limit" className="text-sm font-medium">
              Cancelaciones máximas por mes
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                id="limit"
                type="number"
                min="1"
                max="10"
                value={limit}
                onChange={(e) => handleLimitChange(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                disabled={!enabled}
                className="h-9 max-w-[100px] text-center font-semibold"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">cancelaciones</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Rango: 1-10 cancelaciones
            </p>
          </div>

          {/* Información de reseteo */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Reseteo automático</Label>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Los contadores se resetean el 1ro de cada mes
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Reseteo mensual automático
            </p>
          </div>

          {/* Recomendaciones - Full Width */}
          <div className="md:col-span-2 lg:col-span-3">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Recomendaciones:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <strong>3-5 cancelaciones:</strong> Ideal para mayoría de negocios
                    </div>
                    <div>
                      <strong>1-2 cancelaciones:</strong> Política estricta (premium)
                    </div>
                    <div>
                      <strong>6-10 cancelaciones:</strong> Política flexible (casual)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
