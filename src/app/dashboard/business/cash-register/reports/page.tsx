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
import { Badge } from '@/components/ui/badge'
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
  X,
  Plus,
  RefreshCw,
  Clock
} from 'lucide-react'
import { ExportDropdown } from '@/components/ui/ExportDropdown'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DailyPerformanceReport } from '@/types/cash-register'
import Link from 'next/link'

// Mini componente para estadísticas
function StatCard({
  label,
  value,
  icon: Icon,
  variant,
  highlight = false,
}: {
  label: string
  value: string
  icon: React.ElementType
  variant: 'blue' | 'green' | 'red' | 'orange'
  highlight?: boolean
}) {
  const variants = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  }

  return (
    <div className={`p-4 rounded-[2rem] transition-all duration-300 hover:scale-[1.01] ${
      highlight 
        ? 'bg-orange-600 text-white shadow-[0_8px_16px_rgba(234,88,12,0.15)] hover:shadow-[0_12px_24px_rgba(234,88,12,0.25)]' 
        : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md'
    }`}>
      <div className="flex flex-col gap-3">
        <div className={`w-9 h-9 rounded-xl ${highlight ? 'bg-white/20 text-white' : variants[variant]} flex items-center justify-center shadow-sm`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div>
          <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${highlight ? 'text-orange-100' : 'text-gray-400'}`}>
            {label}
          </span>
          <div className={`text-lg font-black tracking-tight mt-0.5 ${highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            {value}
          </div>
        </div>
      </div>
    </div>
  )
}

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-orange-100 dark:border-orange-900/30 rounded-[2rem]"></div>
            <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-[2rem] animate-spin shadow-[0_0_15px_rgba(234,88,12,0.2)]"></div>
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">
            Generando Reportes...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950/50 p-4 lg:p-6">
      <div className="w-full space-y-6">
        {/* Premium Header - Integrated */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/business/cash-register">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-orange-600 transition-all duration-300 shadow-sm"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
              </Button>
            </Link>
            
            <div className="relative pl-5">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(251,146,60,0.3)]" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-0.5">
                  Finanzas • Reportes de Caja
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-50 tracking-tight">
                  Análisis de <span className="text-orange-600">Caja</span>
                </h1>
              </div>
            </div>
          </div>

            <ExportDropdown
              onExport={async (format) => {
                if (format === 'excel') handleExportExcel()
                else if (format === 'pdf') handleExportPDF()
              }}
              filename={`reporte-caja-${selectedDate}`}
              pdfTitle="Análisis de Caja"
              className="h-10 px-5 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 font-bold text-gray-600 dark:text-gray-300"
            />
        </div>

        {/* Date Selector, Controls & Navigation - Integrated */}
        {/* Date Selector, Navigation & Quick Stats - Compact Integrated Header */}
        <Tabs defaultValue="summary" className="w-full space-y-6">
          <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-[1.5rem] px-6 py-4 border border-gray-100/50 dark:border-gray-800/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
              
              {/* Left: Date Filters */}
              <div className="flex items-end gap-3">

  {/* Date Field */}
  <div className="flex flex-col">
    <label
      htmlFor="reportDate"
      className="text-xs font-medium text-gray-500 mb-1"
    >
      Fecha
    </label>

    <div className="relative">
      <Input
        id="reportDate"
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="
          h-11
          w-40
          px-4
          rounded-2xl
          border border-gray-200
          bg-white
          text-sm
          font-medium
          shadow-sm
          focus:ring-2 focus:ring-orange-500/20
          focus:border-orange-500
          transition
        "
      />
    </div>
  </div>

  {/* Today Button */}
  <Button
    onClick={() =>
      setSelectedDate(new Date().toISOString().split("T")[0])
    }
    variant="outline"
    className="
      h-11
      px-4
      rounded-2xl
      border border-gray-200
      bg-white
      text-sm
      font-medium
      text-gray-700
      hover:bg-gray-50
      shadow-sm
      transition
    "
  >
    <Calendar className="w-4 h-4 mr-2" />
    Hoy
  </Button>

</div>

              {/* Middle: Navigation Tabs */}
              <div className="flex-1 flex justify-center items-end">
                <TabsList className="bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl h-10 grid grid-cols-3 w-full max-w-[320px]">
                  <TabsTrigger 
                    value="summary"
                    className="rounded-lg h-8 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-300 font-bold text-[9px] uppercase tracking-wider"
                  >
                    Resumen
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sessions"
                    className="rounded-lg h-8 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-300 font-bold text-[9px] uppercase tracking-wider"
                  >
                    Sesiones
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analytics"
                    className="rounded-lg h-8 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-300 font-bold text-[9px] uppercase tracking-wider"
                  >
                    Análisis
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Right: Quick Metrics & Sync */}
              <div className="flex items-end gap-6 flex-shrink-0">
                {dailyReport && (
                  <div className="flex gap-6 items-end border-r border-gray-100 dark:border-gray-800 pr-6">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 shadow-none">Ventas</span>
                      <span className="text-sm font-black text-gray-900 dark:text-white leading-none tracking-tight">{formatCurrency(dailyReport.totals.total_sales)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 shadow-none">Efectivo</span>
                      <span className="text-sm font-black text-emerald-600 leading-none tracking-tight">{formatCurrency(dailyReport.totals.total_cash_sales)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 shadow-none">Gastos</span>
                      <span className="text-sm font-black text-red-600 leading-none tracking-tight">{formatCurrency(dailyReport.totals.total_expenses)}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                  En Vivo
                </div>
              </div>

            </div>
          </div>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6 mt-6">
          {dailyReport ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  label="Total Sesiones"
                  value={dailyReport.totals.sessions_count.toString()}
                  icon={FileText}
                  variant="blue"
                />
                <StatCard
                  label="Ventas Efectivo"
                  value={formatCurrency(dailyReport.totals.total_cash_sales)}
                  icon={TrendingUp}
                  variant="green"
                />
                <StatCard
                  label="Ventas Transferencia"
                  value={formatCurrency(dailyReport.totals.total_transfer_sales)}
                  icon={TrendingUp}
                  variant="green"
                />
                <StatCard
                  label="Total Gastos"
                  value={formatCurrency(dailyReport.totals.total_expenses)}
                  icon={TrendingDown}
                  variant="red"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                  label="Ventas Totales"
                  value={formatCurrency(dailyReport.totals.total_sales)}
                  icon={DollarSign}
                  variant="orange"
                  highlight
                />
                <StatCard
                  label="Flujo Neto de Efectivo"
                  value={formatCurrency(dailyReport.totals.net_cash_flow)}
                  icon={BarChart3}
                  variant="blue"
                />
                <StatCard
                  label="Diferencias Totales"
                  value={formatCurrency(Math.abs(dailyReport.totals.total_differences))}
                  icon={
                    Math.abs(dailyReport.totals.total_differences) < 0.01
                      ? CheckCircle2
                      : AlertCircle
                  }
                  variant={
                    Math.abs(dailyReport.totals.total_differences) < 0.01
                      ? 'green'
                      : 'red'
                  }
                />
              </div>

              {/* Info Banner - Premium */}
              <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-[1.5rem] p-4 border border-gray-100/50 dark:border-gray-800/50 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-gray-900 dark:text-gray-50 tracking-tight">
                      Reporte del {format(new Date(selectedDate), "d 'de' MMMM, yyyy", { locale: es })}
                    </h3>
                    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                      Este reporte muestra el resumen consolidado de todas las sesiones del día seleccionado.
                    </p>
                  </div>
                </div>
              </div>
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
        <TabsContent value="sessions" className="space-y-4 mt-6">
          {dailyReport && dailyReport.sessions.length > 0 ? (
              <div className="space-y-4">
                {dailyReport.sessions.map((session, index) => (
                  <div key={session.session_id} className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-[1.5rem] p-6 border border-gray-100/50 dark:border-gray-800/50 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                    {/* Brand Accent */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-orange-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black text-gray-900 dark:text-gray-50 tracking-tight">
                            Sesión #{index + 1}
                          </h3>
                          <Badge 
                            variant="outline"
                            className={`rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                              session.status === 'open'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-gray-50 text-gray-500 border-gray-100'
                            }`}
                          >
                            {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                          </Badge>
                        </div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(session.opened_at), "d 'de' MMM, HH:mm", { locale: es })}
                          {session.closed_at && ` — ${format(new Date(session.closed_at), 'HH:mm', { locale: es })}`}
                          <span className="mx-2 opacity-50">•</span>
                          <Clock className="w-3 h-3" />
                          {session.duration_hours.toFixed(1)}h de operación
                        </p>
                      </div>

                      <div
                        className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider ${
                          session.difference_type === 'exacto'
                            ? 'bg-emerald-50 text-emerald-600'
                            : session.difference_type === 'faltante'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-orange-50 text-orange-600'
                        }`}
                      >
                        {session.difference_type === 'exacto'
                          ? '✓ Arqueo Exacto'
                          : session.difference_type === 'faltante'
                            ? `⚠ Faltante: ${formatCurrency(Math.abs(session.difference || 0))}`
                            : `⚠ Sobrante: ${formatCurrency(session.difference || 0)}`}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fondo Inicial</span>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{formatCurrency(session.initial_cash)}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ventas Efectivo</span>
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(session.cash_sales)}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gastos</span>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(session.total_expenses)}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Efectivo Final</span>
                        <p className="text-lg font-bold text-orange-600">{session.actual_cash !== null ? formatCurrency(session.actual_cash) : '-'}</p>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-xs font-bold text-gray-500">
                          Operador: <span className="text-gray-900 dark:text-gray-300">{session.opened_by}</span>
                        </p>
                      </div>
                      
                      <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-xl">
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
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
        <TabsContent value="analytics" className="space-y-4 mt-6">
              <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-[1.5rem] p-6 border border-gray-100/50 dark:border-gray-800/50 shadow-sm">
                <div className="flex flex-col gap-6">
                  <div className="space-y-0.5">
                    <h3 className="text-xl font-black text-gray-900 dark:text-gray-50 tracking-tight">Análisis Detallado</h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Tendencias y distribución de ingresos por canal</p>
                  </div>

                  {dailyReport ? (
                    <div className="space-y-8">
                      {/* Payment Method Breakdown */}
                      <div className="space-y-3">
                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Distribución por Método de Pago</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-900/30">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Efectivo</span>
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                              </div>
                            </div>
                            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-400 tracking-tight">
                              {formatCurrency(dailyReport.totals.total_cash_sales)}
                            </div>
                            <div className="mt-1 text-[10px] font-black text-emerald-600/70 uppercase tracking-widest">
                              {dailyReport.totals.total_sales > 0
                                ? (
                                    (dailyReport.totals.total_cash_sales /
                                      dailyReport.totals.total_sales) *
                                    100
                                  ).toFixed(1)
                                : 0}
                              % del volumen
                            </div>
                          </div>

                          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-[1.5rem] border border-blue-100 dark:border-blue-900/30">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Transferencia</span>
                              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <RefreshCw className="w-4 h-4 text-blue-600" />
                              </div>
                            </div>
                            <div className="text-2xl font-black text-blue-900 dark:text-blue-400 tracking-tight">
                              {formatCurrency(dailyReport.totals.total_transfer_sales)}
                            </div>
                            <div className="mt-1 text-[10px] font-black text-blue-600/70 uppercase tracking-widest">
                              {dailyReport.totals.total_sales > 0
                                ? (
                                    (dailyReport.totals.total_transfer_sales /
                                      dailyReport.totals.total_sales) *
                                    100
                                  ).toFixed(1)
                                : 0}
                              % del volumen
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="space-y-3">
                        <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Eficiencia Operativa</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ticket Promedio</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">
                              {dailyReport.totals.sessions_count > 0
                                ? formatCurrency(
                                    dailyReport.totals.total_sales /
                                      dailyReport.totals.sessions_count
                                  )
                                : formatCurrency(0)}
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Costo Operativo</p>
                            <p className="text-lg font-black text-red-600">
                              {dailyReport.totals.sessions_count > 0
                                ? formatCurrency(
                                    dailyReport.totals.total_expenses /
                                      dailyReport.totals.sessions_count
                                  )
                                : formatCurrency(0)}
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Margen Neto</p>
                            <p className="text-lg font-black text-emerald-600">
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
                    <div className="py-10 text-center space-y-3">
                       <div className="mx-auto w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-xs font-medium text-gray-500">No hay datos suficientes para generar un análisis</p>
                    </div>
                  )}
                </div>
              </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
