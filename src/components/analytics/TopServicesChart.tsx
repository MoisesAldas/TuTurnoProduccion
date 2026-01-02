'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Briefcase } from 'lucide-react'
import { BaseChartCard } from './BaseChartCard'
import { ChartEmptyState, CustomTooltip } from './ChartComponents'
import type { ServiceData } from '@/types/analytics'

interface TopServicesChartProps {
  data: ServiceData[]
  loading?: boolean
  error?: Error | null
}

export function TopServicesChart({ data, loading = false, error }: TopServicesChartProps) {
  // Orange gradient colors for bars
  const colors = ['#ea580c', '#f97316', '#fb923c', '#fbbf24', '#fcd34d']

  return (
    <BaseChartCard
      title="Top 5 Servicios"
      description="Servicios más solicitados"
      loading={loading}
      error={error}
    >
      {!data || data.length === 0 ? (
        <ChartEmptyState message="No hay datos disponibles para este período" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="service_name"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              angle={-15}
              textAnchor="end"
              height={60}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="booking_count" name="Reservas" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </BaseChartCard>
  )
}
