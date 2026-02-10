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
import { DollarSign, TrendingUp, TrendingDown, Calendar, Clock, AlertCircle, Plus, X, FileText, BarChart3, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { OpenCashModal } from '@/components/cash-register/OpenCashModal'
import { ExpenseModal } from '@/components/cash-register/ExpenseModal'
import { CloseCashModal } from '@/components/cash-register/CloseCashModal'

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
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Sticky Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">Cierre de Caja</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gestión de efectivo y control de ingresos
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/dashboard/business/cash-register/reports">
                <Button variant="outline" size="sm" className="border-orange-300 hover:border-orange-500 text-orange-700 hover:text-orange-900 dark:border-orange-700 dark:hover:border-orange-500 dark:text-orange-400 dark:hover:text-orange-300 transition-colors">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Ver Reportes
                </Button>
              </Link>
              <Badge
                variant={hasOpenSession ? 'default' : 'secondary'}
                className={`text-sm px-4 py-2 ${
                  hasOpenSession
                    ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${hasOpenSession ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {hasOpenSession ? 'Caja Abierta' : 'Caja Cerrada'}
              </Badge>
              
              {/* Sync Indicator */}
              {hasOpenSession && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
                  <span>Actualizado {relativeTime}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

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
        <Card className="border-l-4  dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Sesión Actual</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => setShowExpenseModal(true)}
                  size="sm"
                  variant="outline"
                  className="border-orange-300 hover:border-orange-500 text-orange-700 hover:text-orange-900 dark:border-orange-700 dark:hover:border-orange-500 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Gasto
                </Button>
                <Button
                  onClick={() => setShowCloseModal(true)}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cerrar Caja
                </Button>
              </div>
            </div>
            <CardDescription>
              Abierta el {format(new Date(session.opened_at || ''), 'PPpp', { locale: es })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                label="Efectivo Inicial"
                value={formatCurrency(session.initial_cash || 0)}
                icon={DollarSign}
                color="blue"
              />
              <StatCard
                label="Ventas Efectivo"
                value={formatCurrency(session.current_cash_sales || 0)}
                icon={TrendingUp}
                color="green"
              />
              <StatCard
                label="Ventas Transferencia"
                value={formatCurrency(session.current_transfer_sales || 0)}
                icon={TrendingUp}
                color="green"
              />
              <StatCard
                label="Gastos"
                value={formatCurrency(session.current_expenses || 0)}
                icon={TrendingDown}
                color="red"
              />
              <StatCard
                label="Efectivo Esperado"
                value={formatCurrency(session.expected_cash || 0)}
                icon={DollarSign}
                color="orange"
                highlight
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-l-4 border-l-gray-300 dark:border-l-gray-700 dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="max-w-md mx-auto space-y-6">
              {/* Icon */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              
              {/* Title & Description */}
              <div className="space-y-2">
                <CardTitle className="text-xl">No hay sesión activa</CardTitle>
                <CardDescription className="text-sm">
                  Comienza tu día abriendo una nueva sesión de caja. Registrarás el efectivo inicial y podrás gestionar ventas y gastos.
                </CardDescription>
              </div>
              
              {/* CTA Button */}
              <Button
                onClick={() => setShowOpenModal(true)}
                className="bg-orange-600 hover:bg-orange-700 h-12 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Abrir Caja
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Sesiones Hoy</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-gray-50">{hasOpenSession ? '1' : '0'}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">+0% vs ayer</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Vendido</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-gray-50">
              {formatCurrency(
                (session?.current_cash_sales || 0) + (session?.current_transfer_sales || 0)
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Efectivo + Transferencias</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Accuracy Rate</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold dark:text-gray-50">100%</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cierres exactos</p>
          </CardContent>
        </Card>
      </div>



      {/* Modales */}
      {showOpenModal && <OpenCashModal onClose={() => setShowOpenModal(false)} onSuccess={refetch} />}
      {showExpenseModal && <ExpenseModal sessionId={session?.session_id || ''} onClose={() => setShowExpenseModal(false)} onSuccess={refetch} />}
      {showCloseModal && <CloseCashModal sessionId={session?.session_id || ''} onClose={() => setShowCloseModal(false)} onSuccess={refetch} />}
      </div>
    </div>
  )
}

// Mini componente para estadísticas
function StatCard({
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
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  }

  return (
    <div className={`p-4 rounded-lg transition-all duration-300 hover:scale-105 ${
      highlight 
        ? 'ring-2 ring-orange-200 dark:ring-orange-800 bg-orange-50 dark:bg-orange-900/20 shadow-md hover:shadow-xl' 
        : 'bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm hover:shadow-md'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-orange-900 dark:text-orange-100' : 'text-gray-900 dark:text-gray-50'}`}>{value}</div>
    </div>
  )
}
