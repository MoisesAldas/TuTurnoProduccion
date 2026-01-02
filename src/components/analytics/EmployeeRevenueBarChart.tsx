'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BaseChartCard } from './BaseChartCard'
import { CustomTooltip, formatCurrency } from './ChartComponents'
import type { EmployeeRevenueDetailed } from '@/types/analytics'

interface EmployeeRevenueBarChartProps {
  data: EmployeeRevenueDetailed[]
  loading?: boolean
  error?: Error | null
}

export const EmployeeRevenueBarChart = ({ 
  data, 
  loading, 
  error 
}: EmployeeRevenueBarChartProps) => {
  
  const chartData = useMemo(() => {
    // Group by employee and sum revenue
    const employeeMap = new Map<string, { name: string, revenue: number }>()
    
    data.forEach(item => {
      const existing = employeeMap.get(item.employee_id)
      if (existing) {
        existing.revenue += item.total_revenue
      } else {
        employeeMap.set(item.employee_id, {
          name: item.employee_name,
          revenue: item.total_revenue
        })
      }
    })
    
    // Convert to array and sort by revenue descending
    return Array.from(employeeMap.values())
      .sort((a, b) => b.revenue - a.revenue)
  }, [data])

  return (
    <BaseChartCard
      title="Ingresos por Empleado"
      description="Ranking de empleados por ingresos generados"
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
          <Bar
            dataKey="revenue"
            fill="#ea580c"
            radius={[0, 8, 8, 0]}
            name="Ingresos"
          />
        </BarChart>
      </ResponsiveContainer>
    </BaseChartCard>
  )
}
