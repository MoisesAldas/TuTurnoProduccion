'use client'

import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts'
import { BaseChartCard } from './BaseChartCard'
import { ChartEmptyState } from './ChartComponents'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { WeekdayData } from '@/types/analytics'

interface WeekdayAppointmentsChartProps {
  data: WeekdayData[]
  loading?: boolean
  error?: Error | null
}

// Gradient colors for ranking (from most to least popular)
const RANKING_COLORS = [
  'hsl(24.6 95% 53.1%)',   // Orange-600 - #1
  'hsl(20.5 90.2% 48.2%)', // Orange-500 - #2
  'hsl(27.3 96% 61%)',     // Orange-400 - #3
  'hsl(43.3 96.4% 56.3%)', // Amber-400  - #4
  'hsl(45.4 93.4% 47.5%)', // Amber-500  - #5
  'hsl(47.9 95.8% 53.1%)', // Yellow-400 - #6
  'hsl(48 96.5% 88.8%)',   // Yellow-200 - #7
]

const chartConfig = {
  appointment_count: {
    label: "Citas",
  },
} satisfies ChartConfig

export function WeekdayAppointmentsChart({ data, loading = false, error }: WeekdayAppointmentsChartProps) {
  // Sort data by appointment count (descending) for ranking
  const sortedData = [...data].sort((a, b) => b.appointment_count - a.appointment_count)
  
  // Find peak day
  const peakDay = sortedData.length > 0 ? sortedData[0] : null

  return (
    <BaseChartCard
      title="Ranking de Días de la Semana"
      description={peakDay ? `Día más popular: ${peakDay.day_name} con ${peakDay.appointment_count} citas` : "Distribución de Lunes a Domingo"}
      loading={loading}
      error={error}
    >
      {!data || data.length === 0 ? (
        <ChartEmptyState message="No hay datos disponibles para este período" />
      ) : (
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={sortedData}
            layout="vertical"
            margin={{
              left: 0,
            }}
          >
            <YAxis
              dataKey="day_name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <XAxis 
              dataKey="appointment_count" 
              type="number" 
              hide 
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar 
              dataKey="appointment_count" 
              layout="vertical" 
              radius={5}
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={RANKING_COLORS[index % RANKING_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </BaseChartCard>
  )
}
