'use client'

import { useMemo } from 'react'
import { Label, Pie, PieChart, Cell } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { BaseChartCard } from './BaseChartCard'
import { ChartEmptyState, CustomTooltip, formatCurrency } from './ChartComponents'
import type { EmployeeRevenueDetailed } from '@/types/analytics'

interface EmployeeRevenueBarChartProps {
  data: EmployeeRevenueDetailed[]
  loading?: boolean
  error?: Error | null
}

// Color palette for employees (varied colors)
const EMPLOYEE_COLORS = [
  'hsl(24.6 95% 53.1%)',   // Orange-600
  'hsl(142.1 76.2% 36.3%)', // Green-600
  'hsl(221.2 83.2% 53.3%)', // Blue-600
  'hsl(262.1 83.3% 57.8%)', // Purple-600
  'hsl(346.8 77.2% 49.8%)', // Rose-600
  'hsl(173.4 80.4% 40%)',   // Teal-600
  'hsl(43.3 96.4% 56.3%)',  // Amber-400
]

export const EmployeeRevenueBarChart = ({ 
  data, 
  loading, 
  error 
}: EmployeeRevenueBarChartProps) => {
  
  const chartData = useMemo(() => {
    // Group by employee and sum revenue + appointments
    const employeeMap = new Map<string, { name: string, revenue: number, count: number }>()
    
    data.forEach(item => {
      const existing = employeeMap.get(item.employee_id)
      if (existing) {
        existing.revenue += item.total_revenue
        existing.count += item.appointment_count
      } else {
        employeeMap.set(item.employee_id, {
          name: item.employee_name,
          revenue: item.total_revenue,
          count: item.appointment_count
        })
      }
    })
    
    // Convert to array and sort by revenue descending
    return Array.from(employeeMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((item, index) => ({
        ...item,
        // Calculate average ticket
        avgTicket: item.count > 0 ? item.revenue / item.count : 0,
        fill: index === 0 ? 'hsl(24.6 95% 53.1%)' : EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length]
      }))
  }, [data])

  // Calculate total revenue
  const totalRevenue = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.revenue, 0)
  }, [chartData])

  // Get top employee stats
  const topEmployee = chartData[0]
  const topEmployeePercentage = topEmployee && totalRevenue > 0 
    ? ((topEmployee.revenue / totalRevenue) * 100).toFixed(1)
    : '0'

  // Create chart config dynamically
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      revenue: {
        label: "Ingresos",
      },
    }
    chartData.forEach((item, index) => {
      config[`employee_${index}`] = {
        label: item.name,
        color: item.fill,
      }
    })
    return config
  }, [chartData])

  if (loading || error || !chartData.length) {
    return (
      <BaseChartCard
        title="Ingresos por Empleado"
        description="Distribución de ingresos y eficiencia"
        loading={loading}
        error={error}
      >
        {!chartData.length && <ChartEmptyState message="No hay datos disponibles" />}
      </BaseChartCard>
    )
  }

  return (
    <BaseChartCard
      title="Ingresos por Empleado"
      description="Porcentaje de facturación por colaborador"
      loading={loading}
      error={error}
    >
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[350px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 space-y-2 min-w-[180px]">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50 border-b border-gray-100 dark:border-gray-700/50 pb-1.5">
                        {data.name}
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ingreso Total</span>
                          <span className="text-sm font-black text-gray-900 dark:text-gray-50">{formatCurrency(data.revenue)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Citas Totales</span>
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{data.count}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-gray-50 dark:border-gray-700/30">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ticket Promedio</span>
                          <span className="text-sm font-black text-primary">{formatCurrency(data.avgTicket)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={chartData}
              dataKey="revenue"
              nameKey="name"
              innerRadius={65}
              outerRadius={110}
              strokeWidth={8}
              stroke="transparent"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill} 
                  className="stroke-background dark:stroke-gray-900 outline-none"
                />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-extrabold tracking-tight"
                        >
                          {formatCurrency(totalRevenue)}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-xs font-medium uppercase tracking-widest opacity-70"
                        >
                          Total
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="mt-8 space-y-3 w-full text-center">
          <div className="flex items-center justify-center gap-2 font-bold text-gray-900 dark:text-gray-50 text-base">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <span>{topEmployee?.name} genera el {topEmployeePercentage}%</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Ticket promedio general: <span className="font-bold text-gray-700 dark:text-gray-200">{formatCurrency(totalRevenue / (chartData.reduce((a, b) => a + b.count, 0) || 1))}</span>
          </p>
        </div>
      </div>
    </BaseChartCard>
  )
}
