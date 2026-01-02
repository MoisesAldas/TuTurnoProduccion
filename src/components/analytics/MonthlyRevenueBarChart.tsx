'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BaseChartCard } from './BaseChartCard'
import { CustomTooltip, formatCurrency } from './ChartComponents'
import type { RevenuePeriod } from '@/types/analytics'

interface MonthlyRevenueBarChartProps {
  data: RevenuePeriod[]
  loading?: boolean
  error?: Error | null
}

export const MonthlyRevenueBarChart = ({ 
  data, 
  loading, 
  error 
}: MonthlyRevenueBarChartProps) => {
  
  const chartData = useMemo(() => {
    return data.map(item => ({
      month: item.period_label,
      revenue: item.revenue,
      invoices: item.invoice_count,
      appointments: item.appointment_count
    }))
  }, [data])

  return (
    <BaseChartCard
      title="Ingresos Mensuales"
      description="Comparación de ingresos por mes"
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="month"
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
          <Bar
            dataKey="revenue"
            fill="#ea580c"
            radius={[8, 8, 0, 0]}
            name="Ingresos"
          />
        </BarChart>
      </ResponsiveContainer>
    </BaseChartCard>
  )
}
