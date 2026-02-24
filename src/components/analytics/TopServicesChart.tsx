'use client'

import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { BaseChartCard } from './BaseChartCard'
import { ChartEmptyState, CustomTooltip, formatCurrency, formatNumber } from './ChartComponents'
import type { ServiceData } from '@/types/analytics'
import { Button } from '@/components/ui/button'

interface TopServicesChartProps {
  data: ServiceData[]
  loading?: boolean
  error?: Error | null
}

type MetricType = 'booking_count' | 'total_revenue'

export function TopServicesChart({ data, loading = false, error }: TopServicesChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>('booking_count')

  // Sorting and processing data based on active metric
  const processedData = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b[activeMetric] - a[activeMetric]).slice(0, 5)
  }, [data, activeMetric])

  // Colors: Orange for volume, Green for revenue
  const metricConfig = {
    booking_count: {
      label: 'Volumen',
      color: '#ea580c',
      formatter: formatNumber
    },
    total_revenue: {
      label: 'Ingresos',
      color: '#020617',
      formatter: formatCurrency
    }
  }

  return (
    <BaseChartCard
      title="Ranking de Servicios"
      description={`Top 5 servicios según su ${metricConfig[activeMetric].label.toLowerCase()}`}
      loading={loading}
      error={error}
      actions={
        <div className="flex bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl backdrop-blur-md border border-gray-200/20">
          {(['booking_count', 'total_revenue'] as MetricType[]).map((metric) => (
            <Button
              key={metric}
              variant="ghost"
              size="sm"
              onClick={() => setActiveMetric(metric)}
              className={`text-[10px] h-7 px-3 rounded-lg font-bold transition-all duration-300 ${
                activeMetric === metric 
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {metric === 'booking_count' ? 'Citas' : 'Ingresos'}
            </Button>
          ))}
        </div>
      }
    >
      {!processedData || processedData.length === 0 ? (
        <ChartEmptyState message="No hay datos disponibles para este período" />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart 
            data={processedData} 
            layout="vertical" 
            margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="service_name"
              type="category"
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip 
              content={<CustomTooltip formatter={metricConfig[activeMetric].formatter} />} 
              cursor={{ fill: 'currentColor', opacity: 0.05 }}
            />
            <Bar 
              dataKey={activeMetric} 
              name={activeMetric === 'booking_count' ? 'Citas' : 'Ingresos'}
              radius={[0, 12, 12, 0]} 
              barSize={32}
              animationDuration={1500}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={metricConfig[activeMetric].color} 
                  fillOpacity={1 - (index * 0.15)} 
                />
              ))}
              <LabelList 
                dataKey={activeMetric} 
                position="right" 
                formatter={metricConfig[activeMetric].formatter}
                className="fill-gray-500 dark:fill-gray-400 font-bold text-[10px]"
                offset={10}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </BaseChartCard>
  )
}
