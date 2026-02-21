'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
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
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ea580c" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${value}`}
            dx={-10}
          />
          <Tooltip 
            content={<CustomTooltip formatter={formatCurrency} />} 
            cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#ea580c"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            name="Ingresos"
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          />
          <ReferenceLine
            y={avgRevenue}
            stroke="#cbd5e1"
            strokeDasharray="8 8"
            label={{ value: 'Promedio', position: 'right', fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </BaseChartCard>
  )
}
