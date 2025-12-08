'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Calendar } from 'lucide-react'
import type { MonthlyAppointments } from '@/types/analytics'

interface MonthlyAppointmentsChartProps {
  data: MonthlyAppointments[]
  loading?: boolean
}

export function MonthlyAppointmentsChart({ data, loading = false }: MonthlyAppointmentsChartProps) {
  if (loading) {
    return (
      <Card className="dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg dark:text-gray-50">
            <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-500" />
            Citas por Mes (Últimos 12 Meses)
          </CardTitle>
          <CardDescription className="dark:text-gray-400 text-sm">
            Tendencia mensual de citas agendadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full dark:border-orange-900 dark:border-t-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg dark:text-gray-50">
            <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-500" />
            Citas por Mes (Últimos 12 Meses)
          </CardTitle>
          <CardDescription className="dark:text-gray-400 text-sm">
            Tendencia mensual de citas agendadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">No hay datos disponibles para este período</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Find peak month
  const peakMonth = data.reduce((max, month) =>
    month.appointment_count > max.appointment_count ? month : max
  )

  return (
    <Card className="dark:border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg dark:text-gray-50">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-500" />
              Citas por Mes (Últimos 12 Meses)
            </CardTitle>
            <CardDescription className="dark:text-gray-400 text-sm">
              Tendencia mensual de citas agendadas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Pico: <strong>{peakMonth.month_label}</strong> ({peakMonth.appointment_count} citas)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
            <XAxis
              dataKey="month_label"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              className="dark:fill-gray-400"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              className="dark:fill-gray-400"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
              itemStyle={{ color: '#ea580c' }}
              cursor={{ fill: 'rgba(234, 88, 12, 0.1)' }}
              formatter={(value: number) => [value, 'Citas']}
            />
            <Bar
              dataKey="appointment_count"
              name="Citas"
              fill="#ea580c"
              radius={[8, 8, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
