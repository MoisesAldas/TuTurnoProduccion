'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BaseChartCard } from './BaseChartCard'
import { ChartEmptyState, CustomTooltip } from './ChartComponents'
import type { MonthlyAppointments } from '@/types/analytics'

interface MonthlyAppointmentsChartProps {
  data: MonthlyAppointments[]
  loading?: boolean
  error?: Error | null
}

export function MonthlyAppointmentsChart({ data, loading = false, error }: MonthlyAppointmentsChartProps) {
  // Find peak month
  const peakMonth = data.length > 0
    ? data.reduce((max, month) => month.appointment_count > max.appointment_count ? month : max)
    : null

  return (
    <BaseChartCard
      title="Citas por Mes (Últimos 12 Meses)"
      description="Tendencia mensual de citas agendadas"
      loading={loading}
      error={error}
      actions={
        peakMonth && (
          <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
            <Calendar className="w-3 h-3 mr-1" />
            Pico: <strong className="ml-1">{peakMonth.month_label}</strong> ({peakMonth.appointment_count} citas)
          </Badge>
        )
      }
    >
      {!data || data.length === 0 ? (
        <ChartEmptyState message="No hay datos disponibles para este período" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="month_label"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
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
      )}
    </BaseChartCard>
  )
}
