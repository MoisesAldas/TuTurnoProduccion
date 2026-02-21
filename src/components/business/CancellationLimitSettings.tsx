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
            Seguridad Avanzada
          </span>
          <CardTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
            Límite de Cancelaciones
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        {/* Main Grid - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Toggle para habilitar/deshabilitar */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bloqueo Automático</Label>
            <div className="flex items-center justify-between h-10 px-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-50 dark:border-gray-700/50">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{enabled ? 'ACTIVO' : 'INACTIVO'}</span>
              </div>
              <Switch
                id="enable-blocking"
                checked={enabled}
                onCheckedChange={handleEnabledChange}
                className="scale-90"
              />
            </div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
              Protección anti-spam
            </p>
          </div>

          {/* Límite de cancelaciones */}
          <div className="space-y-1.5">
            <Label htmlFor="limit" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Citas Máximas / Mes
            </Label>
            <div className="flex gap-2 items-center h-10">
              <Input
                id="limit"
                type="number"
                min="1"
                max="10"
                value={limit}
                onChange={(e) => handleLimitChange(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                disabled={!enabled}
                className="h-10 w-16 text-center font-black bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 rounded-xl text-sm"
              />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pt-1">Cancelaciones</span>
            </div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
              Rango sugerido: 3 a 5
            </p>
          </div>

          {/* Información de reseteo - Compact Info */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estado del Contador</Label>
            <div className="flex items-center gap-3 h-10 px-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
              <p className="text-[10px] font-bold text-blue-800/80 dark:text-blue-300/80 uppercase tracking-tight">
                Reseteo el día 1ero
              </p>
            </div>
             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Ciclo Mensual</p>
          </div>

          {/* Recomendaciones - Premium Banner */}
          <div className="md:col-span-2 lg:col-span-3">
            <div className="bg-orange-50/30 dark:bg-orange-950/20 border border-orange-100/30 dark:border-orange-900/40 rounded-2xl p-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-orange-950 dark:text-orange-200 uppercase tracking-widest mb-1">Guía de Configuración</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-orange-600/80 uppercase">Estricta</span>
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 italic">1-2 Citas</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-orange-600/80 uppercase">Equilibrada</span>
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 italic">3-5 Citas</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-orange-600/80 uppercase">Flexible</span>
                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 italic">6-10 Citas</span>
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
