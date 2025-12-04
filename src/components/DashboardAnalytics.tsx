'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Eye, FileText, Zap } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string
  icon: React.ReactNode
  trend: number
  isPositive: boolean
}

interface ChartDataPoint {
  name: string
  value: number
}

interface EmployeeRevenue {
  name: string
  revenue: number
  appointments: number
}

interface WeeklyAppointments {
  day: string
  count: number
}

interface PaymentMethod {
  name: string
  value: number
}

interface ServiceData {
  name: string
  count: number
  percentage: number
}

/**
 * KPI Card Component
 * Minimalist card with metric, trend badge, and icon
 */
const KPICard = ({ label, value, icon, trend, isPositive }: KPICardProps) => {
  return (
    <Card className="border border-gray-200 hover:shadow-lg transition-shadow duration-300 bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Left: Icon & Values */}
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {label}
            </p>
            <p className="text-3xl font-bold text-gray-900 mb-3">{value}</p>
            {/* Trend Badge */}
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <Badge
                className={`${
                  isPositive
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-red-100 text-red-700 border-red-200'
                } border text-xs font-medium`}
              >
                {isPositive ? '+' : '-'}
                {Math.abs(trend)}%
              </Badge>
            </div>
          </div>

          {/* Right: Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Main Dashboard Analytics Component
 */
interface DashboardAnalyticsProps {
  businessId: string
  data?: {
    totalRevenue: number
    totalAppointments: number
    completionRate: number
    revenueTrend: number
    appointmentsTrend: number
    completionTrend: number
    revenueByEmployee: EmployeeRevenue[]
    appointmentsByWeekday: WeeklyAppointments[]
    paymentMethods: PaymentMethod[]
    topServices: ServiceData[]
  }
}

export default function DashboardAnalytics({
  businessId,
  data = {
    totalRevenue: 2847.5,
    totalAppointments: 127,
    completionRate: 94.5,
    revenueTrend: 12.5,
    appointmentsTrend: 8.3,
    completionTrend: 2.1,
    revenueByEmployee: [
      { name: 'Enero', revenue: 1200, appointments: 15 },
      { name: 'Febrero', revenue: 1450, appointments: 18 },
      { name: 'Marzo', revenue: 1680, appointments: 22 },
    ],
    appointmentsByWeekday: [
      { day: 'Dom', count: 18 },
      { day: 'Lun', count: 24 },
      { day: 'Mar', count: 22 },
      { day: 'Mié', count: 19 },
      { day: 'Jue', count: 25 },
      { day: 'Vie', count: 28 },
      { day: 'Sáb', count: 20 },
    ],
    paymentMethods: [
      { name: 'Efectivo', value: 1800 },
      { name: 'Transferencia', value: 1047.5 },
    ],
    topServices: [
      { name: 'Corte Cabello', count: 32, percentage: 25 },
      { name: 'Tintura', count: 28, percentage: 22 },
      { name: 'Pedicura', count: 24, percentage: 19 },
      { name: 'Manicura', count: 22, percentage: 17 },
      { name: 'Tratamiento Facial', count: 21, percentage: 17 },
    ],
  },
}: DashboardAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const PAYMENT_COLORS = ['#ea580c', '#f59e0b']
  const SERVICE_COLORS = ['#ea580c', '#f97316', '#fb923c', '#fbbf24', '#fcd34d']

  return (
    <div className="space-y-6 p-6 bg-white">
      {/* TOP SECTION: KPI CARDS (3 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          label="Ingresos Totales"
          value={`$${data.totalRevenue.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Eye className="w-6 h-6" />}
          trend={data.revenueTrend}
          isPositive={data.revenueTrend > 0}
        />
        <KPICard
          label="Total de Citas"
          value={data.totalAppointments.toString()}
          icon={<FileText className="w-6 h-6" />}
          trend={data.appointmentsTrend}
          isPositive={data.appointmentsTrend > 0}
        />
        <KPICard
          label="Tasa de Completitud"
          value={`${data.completionRate.toFixed(1)}%`}
          icon={<Zap className="w-6 h-6" />}
          trend={data.completionTrend}
          isPositive={data.completionTrend > 0}
        />
      </div>

      {/* MIDDLE SECTION: Charts (2x2 grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Employee (Stacked Bar) */}
        <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
          <CardHeader className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Ingresos por Empleado
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Últimos 3 meses
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.revenueByEmployee}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  formatter={(value) => `$${value}`}
                />
                <Bar
                  dataKey="revenue"
                  fill="#ea580c"
                  radius={[8, 8, 0, 0]}
                  name="Ingresos"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointments by Weekday (Bar) */}
        <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
          <CardHeader className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Citas por Día
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Esta semana
                </CardDescription>
              </div>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="text-xs px-2 py-1 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="week">Semana</option>
                <option value="month">Mes</option>
                <option value="year">Año</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.appointmentsByWeekday}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="count" fill="#a78bfa" radius={[8, 8, 0, 0]} name="Citas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM SECTION: Charts (2x1 grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods (Donut) */}
        <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
          <CardHeader className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Métodos de Pago
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Distribución de ingresos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-8">
              {/* Donut Chart */}
              <ResponsiveContainer width="60%" height={250}>
                <PieChart>
                  <Pie
                    data={data.paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="space-y-3 flex-1">
                {data.paymentMethods.map((method, index) => (
                  <div key={method.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length],
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{method.name}</p>
                      <p className="text-xs text-gray-500">
                        ${method.value.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Services (Table with Progress Bars) */}
        <Card className="border border-gray-200 hover:shadow-lg transition-shadow">
          <CardHeader className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Servicios Principales
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Top 5 servicios
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {data.topServices.map((service, index) => (
                <div key={service.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <span className="text-xs font-semibold text-gray-600">
                      {service.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${service.percentage}%`,
                        backgroundColor: SERVICE_COLORS[index % SERVICE_COLORS.length],
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{service.count} citas</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
