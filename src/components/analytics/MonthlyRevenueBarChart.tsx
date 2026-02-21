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
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity={1} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
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
            cursor={{ fill: '#f8fafc', opacity: 0.4 }}
          />
          <Bar
            dataKey="revenue"
            fill="url(#barGradient)"
            radius={[12, 12, 0, 0]}
            name="Ingresos"
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </BaseChartCard>
  )
}
