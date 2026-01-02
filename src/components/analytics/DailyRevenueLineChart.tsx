'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { BaseChartCard } from './BaseChartCard'
import { CustomTooltip, formatCurrency } from './ChartComponents'
import type { RevenuePeriod } from '@/types/analytics'

interface DailyRevenueLineChartProps {
  data: RevenuePeriod[]
  loading?: boolean
  error?: Error | null
}

export const DailyRevenueLineChart = ({ 
  data, 
  loading, 
  error 
}: DailyRevenueLineChartProps) => {
  
  const chartData = useMemo(() => {
    return data.map(item => ({
      date: item.period_label,
      revenue: item.revenue,
      invoices: item.invoice_count,
      appointments: item.appointment_count
    }))
  }, [data])

  const { maxRevenue, avgRevenue } = useMemo(() => {
    if (data.length === 0) return { maxRevenue: 0, avgRevenue: 0 }
    
    const revenues = data.map(d => d.revenue)
    return {
      maxRevenue: Math.max(...revenues),
      avgRevenue: revenues.reduce((sum, r) => sum + r, 0) / revenues.length
    }
  }, [data])

  return (
    <BaseChartCard
      title="Tendencia de Ingresos Diarios"
      description={`Promedio: ${formatCurrency(avgRevenue)}/día`}
      loading={loading}
      error={error}
      actions={
        <Badge variant="outline" className="text-xs">
          Máximo: {formatCurrency(maxRevenue)}
        </Badge>
      }
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#ea580c"
            strokeWidth={3}
            dot={{ fill: '#ea580c', r: 4 }}
            activeDot={{ r: 6 }}
            name="Ingresos"
          />
          <ReferenceLine
            y={avgRevenue}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            label={{ value: 'Promedio', position: 'right', fill: '#64748b', fontSize: 12 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </BaseChartCard>
  )
}
