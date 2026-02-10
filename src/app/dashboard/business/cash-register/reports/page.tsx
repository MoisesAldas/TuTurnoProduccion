/**
 * Página de Reportes Avanzados de Cierre de Caja
 * Vista con métricas, gráficos y reportes detallados
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCashRegister } from '@/hooks/useCashRegister'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  ArrowLeft,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DailyPerformanceReport } from '@/types/cash-register'
import Link from 'next/link'

export default function CashRegisterReportsPage() {
  const { authState } = useAuth()
  const { getDailyReport, isLoading } = useCashRegister()
  const supabase = createClient()

  const [businessId, setBusinessId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dailyReport, setDailyReport] = useState<DailyPerformanceReport | null>(null)

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

  // Fetch daily report when date changes
  useEffect(() => {
    async function fetchReport() {
      if (!businessId) return

      const report = await getDailyReport(businessId, selectedDate)
      setDailyReport(report)
    }
    fetchReport()
  }, [businessId, selectedDate, getDailyReport])

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert('Exportación a PDF - Por implementar')
  }

  const handleExportExcel = () => {
    // TODO: Implement Excel export
    alert('Exportación a Excel - Por implementar')
  }

  if (isLoading && !dailyReport) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/business/cash-register">
              <Button variant="outline" size="sm" className="border-gray-300 hover:bg-gray-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reportes de Caja</h1>
          </div>
          <p className="text-gray-600 text-sm sm:text-base">Análisis detallado de sesiones y rendimiento</p>
        </div>
      </div>

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seleccionar Fecha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="reportDate">Fecha del Reporte</Label>
              <Input
                id="reportDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              variant="outline"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Hoy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="sessions">Sesiones</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6 mt-6">
          {dailyReport ? (
            <>
              {/* Totals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Sesiones"
                  value={dailyReport.totals.sessions_count.toString()}
                  icon={FileText}
                  color="blue"
                />
                <MetricCard
                  label="Ventas Efectivo"
                  value={formatCurrency(dailyReport.totals.total_cash_sales)}
                  icon={TrendingUp}
                  color="green"
                />
                <MetricCard
                  label="Ventas Transferencia"
                  value={formatCurrency(dailyReport.totals.total_transfer_sales)}
                  icon={TrendingUp}
                  color="green"
                />
                <MetricCard
                  label="Total Gastos"
                  value={formatCurrency(dailyReport.totals.total_expenses)}
                  icon={TrendingDown}
                  color="red"
                />
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  label="Ventas Totales"
                  value={formatCurrency(dailyReport.totals.total_sales)}
                  icon={DollarSign}
                  color="orange"
                  highlight
                />
                <MetricCard
                  label="Flujo Neto de Efectivo"
                  value={formatCurrency(dailyReport.totals.net_cash_flow)}
                  icon={BarChart3}
                  color="blue"
                />
                <MetricCard
                  label="Diferencias Totales"
                  value={formatCurrency(Math.abs(dailyReport.totals.total_differences))}
                  icon={
                    Math.abs(dailyReport.totals.total_differences) < 0.01
                      ? CheckCircle2
                      : AlertCircle
                  }
                  color={
                    Math.abs(dailyReport.totals.total_differences) < 0.01
                      ? 'green'
                      : 'red'
                  }
                />
              </div>

              {/* Info Banner */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 font-medium">
                        Reporte del {format(new Date(selectedDate), 'PPP', { locale: es })}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Este reporte muestra el resumen consolidado de todas las sesiones del día seleccionado.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-500">No hay datos para la fecha seleccionada</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6 mt-6">
          {dailyReport && dailyReport.sessions.length > 0 ? (
            <div className="space-y-4">
              {dailyReport.sessions.map((session, index) => (
                <Card key={session.session_id} className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Sesión #{index + 1}
                        <span
                          className={`ml-3 text-sm px-2 py-1 rounded ${
                            session.status === 'open'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </span>
                      </CardTitle>
                      <div
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          session.difference_type === 'exacto'
                            ? 'bg-green-100 text-green-800'
                            : session.difference_type === 'faltante'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {session.difference_type === 'exacto'
                          ? '✓ Exacto'
                          : session.difference_type === 'faltante'
                            ? `Faltante: ${formatCurrency(Math.abs(session.difference || 0))}`
                            : `Sobrante: ${formatCurrency(session.difference || 0)}`}
                      </div>
                    </div>
                    <CardDescription>
                      {format(new Date(session.opened_at), 'PPp', { locale: es })}
                      {session.closed_at &&
                        ` - ${format(new Date(session.closed_at), 'PPp', { locale: es })}`}
                      {' · '}
                      Duración: {session.duration_hours.toFixed(1)}h
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Efectivo Inicial</p>
                        <p className="font-semibold">{formatCurrency(session.initial_cash)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Ventas Efectivo</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(session.cash_sales)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Ventas Transferencia</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(session.transfer_sales)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Gastos ({session.expenses_count})</p>
                        <p className="font-semibold text-red-600">
                          {formatCurrency(session.total_expenses)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Efectivo Esperado</p>
                        <p className="font-semibold">{formatCurrency(session.expected_cash)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Efectivo Contado</p>
                        <p className="font-semibold">
                          {session.actual_cash !== null
                            ? formatCurrency(session.actual_cash)
                            : '-'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Abierto/Cerrado por</p>
                        <p className="font-semibold text-sm">
                          {session.opened_by}
                          {session.closed_by && ` / ${session.closed_by}`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-500">No hay sesiones para la fecha seleccionada</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Detallado</CardTitle>
              <CardDescription>
                Métricas de rendimiento y tendencias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailyReport ? (
                <div className="space-y-6">
                  {/* Payment Method Breakdown */}
                  <div>
                    <h3 className="font-semibold mb-3">Distribución por Método de Pago</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-700">Efectivo</p>
                        <p className="text-2xl font-bold text-green-900">
                          {formatCurrency(dailyReport.totals.total_cash_sales)}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {dailyReport.totals.total_sales > 0
                            ? (
                                (dailyReport.totals.total_cash_sales /
                                  dailyReport.totals.total_sales) *
                                100
                              ).toFixed(1)
                            : 0}
                          % del total
                        </p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-700">Transferencia</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {formatCurrency(dailyReport.totals.total_transfer_sales)}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {dailyReport.totals.total_sales > 0
                            ? (
                                (dailyReport.totals.total_transfer_sales /
                                  dailyReport.totals.total_sales) *
                                100
                              ).toFixed(1)
                            : 0}
                          % del total
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div>
                    <h3 className="font-semibold mb-3">Métricas de Rendimiento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4">
                        <p className="text-sm text-gray-600">Promedio por Sesión</p>
                        <p className="text-xl font-bold">
                          {dailyReport.totals.sessions_count > 0
                            ? formatCurrency(
                                dailyReport.totals.total_sales /
                                  dailyReport.totals.sessions_count
                              )
                            : formatCurrency(0)}
                        </p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="text-sm text-gray-600">Gastos por Sesión</p>
                        <p className="text-xl font-bold">
                          {dailyReport.totals.sessions_count > 0
                            ? formatCurrency(
                                dailyReport.totals.total_expenses /
                                  dailyReport.totals.sessions_count
                              )
                            : formatCurrency(0)}
                        </p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <p className="text-sm text-gray-600">Margen de Efectivo</p>
                        <p className="text-xl font-bold">
                          {dailyReport.totals.total_cash_sales > 0
                            ? (
                                ((dailyReport.totals.total_cash_sales -
                                  dailyReport.totals.total_expenses) /
                                  dailyReport.totals.total_cash_sales) *
                                100
                              ).toFixed(1)
                            : 0}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500">No hay datos para analizar</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Metric Card Component
function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  highlight = false,
}: {
  label: string
  value: string
  icon: React.ElementType
  color: 'blue' | 'green' | 'red' | 'orange'
  highlight?: boolean
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <Card className={highlight ? 'ring-2 ring-orange-200' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
        <div
          className={`w-8 h-8 rounded-lg ${colorClasses[color]} flex items-center justify-center`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? 'text-orange-900' : 'text-gray-900'}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}
