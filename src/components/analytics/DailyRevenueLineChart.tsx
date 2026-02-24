'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { BaseChartCard } from './BaseChartCard'
import { CustomTooltip, formatCurrency, formatMonthDateSpanish } from './ChartComponents'
import type { RevenuePeriod } from '@/types/analytics'
import { aggregateByWeek, aggregateByMonth, calculateMovingAverage } from '@/lib/utils/chartUtils'

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
  
  const { processedData, aggregationLevel } = useMemo(() => {
    if (!data.length) return { processedData: [], aggregationLevel: 'diarios' }

    let aggregated = [...data]
    let level = 'diarios'

    if (data.length > 360) {
      aggregated = aggregateByMonth(data) as any
      level = 'mensuales'
    } else if (data.length > 60) {
      aggregated = aggregateByWeek(data) as any
      level = 'semanales'
    }

    // Add Moving Average for smoother trend line if daily or weekly
    const dataWithMA = level !== 'mensuales' 
      ? calculateMovingAverage(aggregated, 'revenue', level === 'diarios' ? 7 : 4)
      : aggregated

    const finalData = dataWithMA.map((item: any) => {
      // Si ya viene formateado de aggregateByMonth, lo mantenemos o refinamos
      let label = item.period_label;
      if (level === 'mensuales') {
        // Aseguramos formato español sin puntos molestos y con capitalización
        label = formatMonthDateSpanish(item.period_date);
      }

      return {
        date: label,
        revenue: item.revenue,
        revenueMA: item.revenueMA || item.revenue,
        invoices: item.invoice_count,
        appointments: item.appointment_count
      }
    })

    return { processedData: finalData, aggregationLevel: level }
  }, [data])

  const { maxRevenue, avgRevenue } = useMemo(() => {
    if (processedData.length === 0) return { maxRevenue: 0, avgRevenue: 0 }
    
    const revenues = processedData.map(d => d.revenue)
    return {
      maxRevenue: Math.max(...revenues),
      avgRevenue: revenues.reduce((sum, r) => sum + r, 0) / processedData.length
    }
  }, [processedData])

  return (
    <BaseChartCard
      title={`Tendencia de Ingresos ${aggregationLevel.charAt(0).toUpperCase() + aggregationLevel.slice(1)}`}
      description={`Promedio factual: ${formatCurrency(avgRevenue)}/${aggregationLevel === 'diarios' ? 'día' : aggregationLevel === 'semanales' ? 'semana' : 'mes'}`}
      loading={loading}
      error={error}
      actions={
        <Badge variant="outline" className="text-xs bg-orange-50/50 border-orange-200 text-orange-700 dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-400">
          Máximo {aggregationLevel}: {formatCurrency(maxRevenue)}
        </Badge>
      }
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={processedData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ea580c" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#ea580c" stopOpacity={0.01}/>
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            dy={10}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${value}`}
            dx={-10}
          />
          <Tooltip 
            content={<CustomTooltip formatter={formatCurrency} />} 
            cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
          />
          
          {/* Main Area (Aggregated Revenue) */}
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#ea580c"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            name="Ingreso Real"
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          />

          {/* Trend Line (Moving Average) - Only for high density views */}
       

          <ReferenceLine
            y={avgRevenue}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ 
              value: 'Promedio', 
              position: 'right', 
              fill: '#94a3b8', 
              fontSize: 10, 
              fontWeight: 600,
              offset: 10
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </BaseChartCard>
  )
}
