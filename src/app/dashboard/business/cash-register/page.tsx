/**
 * Dashboard de Cierre de Caja
 * Vista principal con estado de caja en tiempo real
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentSession } from '@/hooks/useCurrentSession'
import { useCashRegister } from '@/hooks/useCashRegister'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, Calendar, Clock, AlertCircle, Plus, X, FileText, BarChart3, RefreshCw, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { OpenCashModal } from '@/components/cash-register/OpenCashModal'
import { ExpenseModal } from '@/components/cash-register/ExpenseModal'
import { CloseCashModal } from '@/components/cash-register/CloseCashModal'

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

export default function CashRegisterPage() {
  const { authState } = useAuth()
  const [businessId, setBusinessId] = useState<string>('')
  const supabase = createClient()

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

  const { session, isLoading, refetch, hasOpenSession } = useCurrentSession({
    businessId,
    pollingInterval: 30000, // 30 segundos
  })

  const { getDailyReport } = useCashRegister()

  // Estados para modales
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Update last sync time when session changes
  useEffect(() => {
    if (session) {
      setLastUpdate(new Date())
    }
  }, [session])

  // Format relative time for last update
  const relativeTime = useMemo(() => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000)
    if (seconds < 10) return 'ahora'
    if (seconds < 60) return `hace ${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `hace ${minutes}m`
    const hours = Math.floor(minutes / 60)
    return `hace ${hours}h`
  }, [lastUpdate])

  // Re-render every 10 seconds to update relative time
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(prev => prev) // Trigger re-render
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Debug function to check payments
  const debugCheckPayments = async () => {
    if (!businessId || !session?.opened_at) return

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_method,
        created_at,
        invoice_id,
        invoices (
          id,
          business_id,
          appointment_id
        )
      `)
      .gte('created_at', session.opened_at)
      .order('created_at', { ascending: false })
      .limit(20)

    console.log('💰 Pagos desde apertura de caja:', {
      opened_at: session.opened_at,
      now: new Date().toISOString(),
      total_payments: payments?.length || 0,
      payments: payments,
      error: error,
    })

    // Also check if there are any payments for this business
    const { data: businessPayments } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_method,
        created_at,
        invoices!inner (
          business_id
        )
      `)
      .eq('invoices.business_id', businessId)
      .gte('created_at', session.opened_at)

    console.log('�� Pagos del negocio desde apertura:', businessPayments)
  }

  if (isLoading && !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-orange-100 dark:border-orange-900/30 rounded-[2rem]"></div>
            <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-[2rem] animate-spin shadow-[0_0_15px_rgba(234,88,12,0.2)]"></div>
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">
            Sincronizando Caja...
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
          <div className="relative pl-5">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(251,146,60,0.3)]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-0.5">
                Panel de Control • Negocio
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-50 tracking-tight">
                Gestión de <span className="text-orange-600">Caja</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/business/cash-register/reports">
              <Button
                variant="outline"
                className="h-12 px-6 rounded-2xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 font-bold text-gray-600 dark:text-gray-300 hover:bg-orange-50 hover:text-orange-600 transition-all duration-300"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Reportes
              </Button>
            </Link>
            
            <Badge
              variant={hasOpenSession ? 'default' : 'secondary'}
              className={`h-12 px-6 rounded-2xl text-sm font-bold flex items-center transition-all duration-300 ${
                hasOpenSession
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-transparent'
              }`}
            >
              <div className={`w-2 h-2 rounded-full mr-3 ${hasOpenSession ? 'bg-emerald-500 animate-pulse outline outline-4 outline-emerald-500/20' : 'bg-gray-400'}`} />
              {hasOpenSession ? 'Sesión Activa' : 'Caja Cerrada'}
            </Badge>

            {hasOpenSession && (
              <div className="hidden lg:flex flex-col items-end px-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
                  Sincronizado
                </div>
                <span className="text-xs font-medium text-gray-500">{relativeTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-8">

      {/* Info Banner - Moved to top */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700">
        <CardContent className="py-3 sm:py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0 hidden sm:block" />
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-200 font-medium">Sistema de Cierre de Caja Activo</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 hidden sm:block">
                Los datos se sincronizan automáticamente cada 30 segundos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado actual de la caja */}
      {hasOpenSession && session ? (
        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-[2rem] p-6 border border-gray-100/50 dark:border-gray-800/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-gray-50 tracking-tight">Sesión de Caja Activa</h2>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Abierta el {format(new Date(session.opened_at || ''), "d 'de' MMMM, HH:mm", { locale: es })}
                </p>
              </div>
            </div>

              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => setShowExpenseModal(true)} 
                  variant="outline"
                  className="h-10 px-5 rounded-xl border-red-100 dark:border-red-900/30 font-bold text-red-600 hover:bg-red-50 transition-all duration-300"
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Registrar Gasto
                </Button>
                <Button 
                  onClick={() => setShowCloseModal(true)} 
                  className="h-10 px-5 rounded-xl bg-gray-900 dark:bg-gray-50 text-white dark:text-gray-900 font-bold hover:scale-105 transition-all duration-300"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cerrar Caja
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              label="Fondo Inicial"
              value={formatCurrency(session.initial_cash || 0)}
              icon={DollarSign}
              variant="blue"
            />
            <StatCard
              label="Ventas Efectivo"
              value={formatCurrency(session.current_cash_sales || 0)}
              icon={TrendingUp}
              variant="green"
            />
            <StatCard
              label="Transferencias"
              value={formatCurrency(session.current_transfer_sales || 0)}
              icon={TrendingUp}
              variant="blue"
            />
            <StatCard
              label="Gastos Totales"
              value={formatCurrency(session.current_expenses || 0)}
              icon={TrendingDown}
              variant="red"
            />
            <StatCard
              label="Efectivo en Caja"
              value={formatCurrency((session.initial_cash || 0) + (session.current_cash_sales || 0) - (session.expected_cash|| 0))}
              icon={DollarSign}
              variant="orange"
              highlight
            />
            </div>
        </div>
      ) : (
        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-[2.5rem] p-12 text-center border border-gray-100/50 dark:border-gray-800/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="max-w-md mx-auto space-y-6">
            <div className="mx-auto w-20 h-20 rounded-[2rem] bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shadow-[0_0_20px_rgba(234,88,12,0.1)]">
              <DollarSign className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Sin Sesión Activa</h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Comienza tu jornada abriendo una nueva sesión de caja para registrar el fondo inicial y gestionar tus ingresos.
              </p>
            </div>
            
            <Button
              onClick={() => setShowOpenModal(true)}
              className="bg-orange-600 hover:bg-orange-700 h-14 px-10 rounded-[1.25rem] text-white font-bold shadow-[0_10px_20px_rgba(234,88,12,0.2)] hover:shadow-[0_15px_30px_rgba(234,88,12,0.3)] transition-all duration-300"
            >
              <Plus className="w-5 h-5 mr-3" />
              Abrir Punto de Venta
            </Button>
          </div>
        </div>
      )}

      {/* Quick Stats - Premium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-[2rem] p-6 border border-gray-100/50 dark:border-gray-800/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Sesiones Hoy</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{hasOpenSession ? '1' : '0'}</div>
          <div className="flex items-center gap-1 mt-2 text-xs font-bold text-gray-400">
            <TrendingUp className="w-3 h-3" />
            <span>Control diario activo</span>
          </div>
        </div>

        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-[2rem] p-6 border border-gray-100/50 dark:border-gray-800/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ingresos Totales</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency((session?.current_cash_sales || 0) + (session?.current_transfer_sales || 0))}
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs font-bold text-gray-400">
            <RefreshCw className="w-3 h-3" />
            <span>Procesado en tiempo real</span>
          </div>
        </div>

        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-[2rem] p-6 border border-gray-100/50 dark:border-gray-800/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Accuracy Rate</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">100%</div>
          <div className="flex items-center gap-1 mt-2 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="w-3 h-3" />
            <span>Cierres sin novedades</span>
          </div>
        </div>
      </div>




      {/* Modales */}
      {showOpenModal && <OpenCashModal onClose={() => setShowOpenModal(false)} onSuccess={refetch} />}
      {showExpenseModal && <ExpenseModal sessionId={session?.session_id || ''} onClose={() => setShowExpenseModal(false)} onSuccess={refetch} />}
      {showCloseModal && <CloseCashModal sessionId={session?.session_id || ''} onClose={() => setShowCloseModal(false)} onSuccess={refetch} />}
      </div>
      </div>
    </div>
  )
}
