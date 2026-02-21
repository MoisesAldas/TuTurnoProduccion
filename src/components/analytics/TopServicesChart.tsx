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
            <XAxis
              dataKey="service_name"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              angle={-20}
              textAnchor="end"
              height={70}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              dx={-5}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: '#f8fafc', opacity: 0.4 }}
            />
            <Bar dataKey="booking_count" name="Reservas" radius={[12, 12, 0, 0]} barSize={32}>
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
