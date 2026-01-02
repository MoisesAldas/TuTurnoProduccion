'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BaseChartCard } from './BaseChartCard'
import { ChartEmptyState, CustomTooltip } from './ChartComponents'
import type { TimeSlotData } from '@/types/analytics'

interface TimeSlotChartProps {
  data: TimeSlotData[]
  loading?: boolean
  error?: Error | null
}

export function TimeSlotChart({ data, loading = false, error }: TimeSlotChartProps) {
  // Filter out time slots with 0 appointments for cleaner visualization
  const filteredData = data.filter((slot) => slot.appointment_count > 0)

  // Find peak hour
  const peakHour = filteredData.length > 0 
    ? filteredData.reduce((max, slot) => slot.appointment_count > max.appointment_count ? slot : max)
    : null

  return (
    <BaseChartCard
      title="Distribución por Franja Horaria"
      description="Citas agrupadas por hora del día"
      loading={loading}
      error={error}
      actions={
        peakHour && (
          <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
            <Clock className="w-3 h-3 mr-1" />
            Pico: <strong className="ml-1">{peakHour.time_slot}</strong> ({peakHour.appointment_count} citas)
          </Badge>
        )
      }
    >
      {!filteredData || filteredData.length === 0 ? (
        <ChartEmptyState message="No hay datos disponibles para este período" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="time_slot"
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
