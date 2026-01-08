/**
 * Dashboard de Cierre de Caja
 * Vista principal con estado de caja en tiempo real
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentSession } from '@/hooks/useCurrentSession'
import { useCashRegister } from '@/hooks/useCashRegister'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, Calendar, Clock, AlertCircle, Plus, X, FileText, BarChart3 } from 'lucide-react'
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cierre de Caja</h1>
          <p className="text-gray-600 mt-1">Gestión de efectivo y control de ingresos</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/business/cash-register/reports">
            <Button variant="outline" size="sm" className="border-orange-200 hover:bg-orange-50">
              <BarChart3 className="w-4 h-4 mr-2" />
              Ver Reportes
            </Button>
          </Link>
          <Badge
            variant={hasOpenSession ? 'default' : 'secondary'}
            className={`text-sm px-4 py-2 ${
              hasOpenSession
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${hasOpenSession ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {hasOpenSession ? 'Caja Abierta' : 'Caja Cerrada'}
          </Badge>
        </div>
      </div>

      {/* Estado actual de la caja */}
      {hasOpenSession && session ? (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Sesión Actual</CardTitle>
              <div className="flex space-x-2">
                <Button
                  onClick={() => setShowExpenseModal(true)}
                  size="sm"
                  variant="outline"
                  className="border-orange-200 hover:bg-orange-50"
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
        <Card className="border-l-4 border-l-gray-300">
          <CardHeader>
            <CardTitle>No hay sesión activa</CardTitle>
            <CardDescription>
              Abre una nueva sesión de caja para comenzar el día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowOpenModal(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Abrir Caja
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sesiones Hoy</CardTitle>
            <Calendar className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hasOpenSession ? '1' : '0'}</div>
            <p className="text-xs text-gray-500 mt-1">+0% vs ayer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Vendido</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                (session?.current_cash_sales || 0) + (session?.current_transfer_sales || 0)
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Efectivo + Transferencias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Accuracy Rate</CardTitle>
            <FileText className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-gray-500 mt-1">Cierres exactos</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-900 font-medium">Sistema de Cierre de Caja Activo</p>
              <p className="text-xs text-blue-700 mt-1">
                Registra gastos, cuenta denominaciones y genera reportes automáticos. Los datos se sincronizan en tiempo real.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modales */}
      {showOpenModal && <OpenCashModal onClose={() => setShowOpenModal(false)} onSuccess={refetch} />}
      {showExpenseModal && <ExpenseModal sessionId={session?.session_id || ''} onClose={() => setShowExpenseModal(false)} onSuccess={refetch} />}
      {showCloseModal && <CloseCashModal sessionId={session?.session_id || ''} onClose={() => setShowCloseModal(false)} onSuccess={refetch} />}
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
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className={`p-4 rounded-lg ${highlight ? 'ring-2 ring-orange-200 bg-orange-50' : 'bg-white border'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-orange-900' : 'text-gray-900'}`}>{value}</div>
    </div>
  )
}
