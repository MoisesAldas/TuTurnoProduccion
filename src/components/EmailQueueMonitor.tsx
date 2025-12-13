'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, Send, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EmailQueueStats {
  pending: number
  sent: number
  failed: number
  total: number
}

export default function EmailQueueMonitor() {
  const [stats, setStats] = useState<EmailQueueStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/process-email-queue')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const processQueue = async () => {
    try {
      setProcessing(true)
      const response = await fetch('/api/process-email-queue', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        toast({
          title: '✅ Emails procesados',
          description: `Enviados: ${data.sent}, Fallidos: ${data.failed}`,
        })
        fetchStats() // Actualizar estadísticas
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al procesar',
          description: data.error || 'No se pudieron procesar los emails',
        })
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="border-orange-200 dark:border-orange-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-600" />
            <CardTitle className="text-lg">Cola de Emails</CardTitle>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchStats}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
        <CardDescription>
          Sistema de envío de notificaciones por email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <>
            {/* Estadísticas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Pendientes</span>
                </div>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.pending}</p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">Enviados</span>
                </div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.sent}</p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-medium text-red-700 dark:text-red-400">Fallidos</span>
                </div>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.failed}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-400">Total</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              </div>
            </div>

            {/* Estado y acciones */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                {stats.pending > 0 ? (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    {stats.pending} email{stats.pending !== 1 ? 's' : ''} en cola
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Cola vacía
                  </Badge>
                )}
              </div>

              <Button
                size="sm"
                onClick={processQueue}
                disabled={processing || stats.pending === 0}
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 gap-2"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Procesar Ahora
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 Los emails se procesan automáticamente cada minuto en producción.
              Usa este botón para procesarlos manualmente durante desarrollo.
            </p>
          </>
        )}

        {!stats && !loading && (
          <p className="text-sm text-gray-500 text-center py-4">
            No se pudieron cargar las estadísticas
          </p>
        )}
      </CardContent>
    </Card>
  )
}
