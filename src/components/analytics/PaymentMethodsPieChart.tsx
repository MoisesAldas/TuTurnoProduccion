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
  'Transferencia': '#f59e0b'  // Amber-500 (Un toque más oscuro y sólido)
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
      description="Distribución de ingresos"
      loading={loading}
      error={error}
    >
      {data.length === 0 ? (
        <ChartEmptyState message="No hay datos de pagos en este período" />
      ) : (
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
          {/* Pie Chart */}
          <div className="relative flex-1 w-full min-w-0">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="100%"
                  paddingAngle={5}
                  dataKey="value"
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

            {/* Center Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xl font-black text-gray-900 dark:text-gray-50">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">Total</p>
              </div>
            </div>
          </div>

          {/* Legend with Details */}
          <div className="flex-1 w-full space-y-3 min-w-0">
            {chartData.map((method) => {
              const ticketAverage = method.value / method.count;
              const isHighTicket = ticketAverage > (totalRevenue / chartData.reduce((acc, d) => acc + d.count, 0)) * 1.1;
              
              return (
                <div key={method.name} className="space-y-2 p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 hover:border-orange-200 dark:hover:border-orange-900/30 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: method.color }}
                      />
                      
                    </div>
                    <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                      {method.percentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 pl-5">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Monto</p>
                      <p className="text-xs font-black text-gray-900 dark:text-gray-100">
                        {formatCurrency(method.value)}
                      </p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Transacciones</p>
                      <p className="text-xs font-black text-gray-900 dark:text-gray-100">
                        {method.count}
                      </p>
                    </div>
                    <div className="col-span-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Ticket Promedio</p>
                      <p className="text-xs font-black text-orange-600 dark:text-orange-400">
                        {formatCurrency(ticketAverage)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </BaseChartCard>
  )
}
