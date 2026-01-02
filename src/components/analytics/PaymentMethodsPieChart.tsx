'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { BaseChartCard } from './BaseChartCard'
import { ChartEmptyState, CustomTooltip, formatCurrency } from './ChartComponents'
import type { PaymentMethodData } from '@/types/analytics'

interface PaymentMethodsPieChartProps {
  data: PaymentMethodData[]
  loading?: boolean
  error?: Error | null
}

const PAYMENT_COLORS: Record<string, string> = {
  'Efectivo': '#ea580c',      // Orange-600
  'Transferencia': '#f59e0b'  // Amber-500
}

export const PaymentMethodsPieChart = ({ 
  data, 
  loading, 
  error 
}: PaymentMethodsPieChartProps) => {
  
  const chartData = useMemo(() => {
    return data.map(item => ({
      name: item.payment_method,
      value: item.total_amount,
      count: item.transaction_count,
      percentage: item.percentage,
      color: PAYMENT_COLORS[item.payment_method] || '#94a3b8'
    }))
  }, [data])

  const totalRevenue = useMemo(() => {
    return data.reduce((sum, item) => sum + item.total_amount, 0)
  }, [data])

  return (
    <BaseChartCard
      title="Métodos de Pago"
      description="Distribución de ingresos por método de pago"
      loading={loading}
      error={error}
    >
      {data.length === 0 ? (
        <ChartEmptyState message="No hay datos de pagos en este período" />
      ) : (
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Pie Chart */}
          <div className="relative flex-1 w-full">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ percentage }) => `${percentage.toFixed(1)}%`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={<CustomTooltip formatter={formatCurrency} />} 
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Label - Positioned absolutely */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total</p>
              </div>
            </div>
          </div>

          {/* Legend with Details */}
          <div className="flex-1 w-full space-y-4">
            {chartData.map((method) => (
              <div key={method.name} className="space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: method.color }}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {method.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {method.percentage.toFixed(1)}%
                  </span>
                </div>
                
                {/* Details */}
                <div className="pl-6 space-y-1">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Monto:</span>
                    <span className="font-medium">
                      {formatCurrency(method.value)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Transacciones:</span>
                    <span className="font-medium">{method.count}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Ticket Promedio:</span>
                    <span className="font-medium">
                      {formatCurrency(method.value / method.count)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${method.percentage}%`,
                      backgroundColor: method.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </BaseChartCard>
  )
}
