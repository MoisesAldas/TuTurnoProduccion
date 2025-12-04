'use client'

import { useState, useEffect } from 'react'
import DashboardAnalytics from '@/components/DashboardAnalytics'
import { useAnalyticsData } from '@/hooks/useAnalyticsData'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabaseClient'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Business Analytics Dashboard Page
 *
 * This page integrates the DashboardAnalytics component with real data
 * from the Supabase backend. It handles data fetching, loading states,
 * and error handling.
 *
 * Route: /dashboard/business/analytics
 *
 * INSTALLATION STEPS:
 * 1. Rename this file to: src/app/dashboard/business/analytics/page.tsx
 * 2. Create folder: src/app/dashboard/business/analytics/
 * 3. Move this file into that folder
 * 4. The route will be: /dashboard/business/analytics
 */

export default function AnalyticsPage() {
  const { authState } = useAuth()
  const supabase = createClient()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessLoading, setBusinessLoading] = useState(true)
  const { data, loading, error, refetch } = useAnalyticsData(businessId || '')

  // Fetch business ID from authenticated user
  useEffect(() => {
    if (!authState.user) {
      setBusinessLoading(false)
      return
    }

    const fetchBusiness = async () => {
      try {
        const { data: business, error: err } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', authState.user.id)
          .single()

        if (err) {
          console.error('Error fetching business:', err)
          setBusinessLoading(false)
          return
        }

        if (business) {
          setBusinessId(business.id)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
      } finally {
        setBusinessLoading(false)
      }
    }

    fetchBusiness()
  }, [authState.user])

  // Redirect to setup if no business
  if (businessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Cargando negocio...</p>
        </div>
      </div>
    )
  }

  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Negocio no encontrado</h1>
          <p className="text-gray-600 mb-6">
            No pudimos encontrar tu negocio. Por favor, completa tu perfil de negocio primero.
          </p>
          <Button
            onClick={() => (window.location.href = '/auth/business/setup')}
            className="bg-gradient-to-r from-orange-600 to-amber-600 text-white"
          >
            Configurar Negocio
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Análisis de Negocio</h1>
              <p className="text-gray-600 mt-1">
                Visualiza métricas clave, ingresos y rendimiento del equipo
              </p>
            </div>

            {/* Refresh Button */}
            <Button
              onClick={() => refetch()}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* Error State */}
        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Error al cargar analytics</h3>
                <p className="text-sm text-red-700 mt-1">{error.message}</p>
                <Button
                  onClick={() => refetch()}
                  size="sm"
                  variant="outline"
                  className="mt-3"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Cargando análisis...</p>
            </div>
          </div>
        )}

        {/* Dashboard Analytics Component */}
        {data && (
          <div className="bg-white">
            <DashboardAnalytics businessId={businessId} data={data} />
          </div>
        )}

        {/* Empty State (no data yet) */}
        {!loading && !error && !data && (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sin datos aún</h3>
              <p className="text-sm text-gray-600 mb-6">
                Comienza creando citas y registrando pagos para ver tus análisis aquí.
              </p>
              <Button
                onClick={() => (window.location.href = '/dashboard/business/appointments')}
                className="bg-gradient-to-r from-orange-600 to-amber-600 text-white"
              >
                Ir a Citas
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info (optional) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-200 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Ingresos Totales</h4>
            <p>Suma de todos los pagos registrados en el período actual</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Total de Citas</h4>
            <p>Cantidad de citas completadas, en progreso y confirmadas</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Tasa de Completitud</h4>
            <p>Porcentaje de citas completadas vs total de citas</p>
          </div>
        </div>
      </div>
    </div>
  )
}
