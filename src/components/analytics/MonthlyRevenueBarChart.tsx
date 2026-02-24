'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart, ReferenceLine, Label } from 'recharts'
import { BaseChartCard } from './BaseChartCard'
import { CustomTooltip, formatCurrency, formatMonthDateSpanish } from './ChartComponents'
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
  
  const { chartData, averageRevenue } = useMemo(() => {
    const rawData = data.map((item, index, array) => {
      // Calcular promedio móvil de 3 meses (si hay suficientes datos)
      let movingAverage = null;
      if (index >= 2) {
        const last3 = array.slice(index - 2, index + 1);
        movingAverage = last3.reduce((sum, d) => sum + d.revenue, 0) / 3;
      } else if (index === 1) {
        const last2 = array.slice(0, 2);
        movingAverage = last2.reduce((sum, d) => sum + d.revenue, 0) / 2;
      } else {
        movingAverage = item.revenue;
      }

      return {
        month: formatMonthDateSpanish(item.period_date),
        revenue: item.revenue,
        movingAverage: Math.round(movingAverage),
        invoices: item.invoice_count,
        appointments: item.appointment_count
      }
    });

    const total = data.reduce((sum, item) => sum + item.revenue, 0);
    const avg = data.length > 0 ? total / data.length : 0;

    return { chartData: rawData, averageRevenue: avg };
  }, [data])

  return (
    <BaseChartCard
      title="Ingresos Mensuales"
      description="Comparación de ingresos y tendencia de negocio"
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity={1} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${value}`}
            dx={-10}
          />
          <Tooltip 
            content={<CustomTooltip formatter={formatCurrency} />}
            cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
          />

          {/* Línea de Promedio General */}
          <ReferenceLine 
            y={averageRevenue} 
            stroke="#94a3b8" 
            strokeDasharray="3 3" 
            label={{ 
              value: 'Promedio', 
              position: 'right', 
              fill: '#94a3b8', 
              fontSize: 10,
              fontWeight: 'bold'
            }} 
          />

          {/* Barras de Ingreso Real */}
          <Bar
            dataKey="revenue"
            fill="url(#barGradient)"
            radius={[10, 10, 0, 0]}
            name="Ingreso Real"
            barSize={40}
          />

          {/* Línea de Tendencia (Promedio Móvil) */}
      
        </ComposedChart>
      </ResponsiveContainer>
    </BaseChartCard>
  )
}
