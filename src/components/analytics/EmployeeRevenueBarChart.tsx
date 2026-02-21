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
      .map((item, index) => ({
        ...item,
        fill: EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length]
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
        color: EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length],
      }
    })
    return config
  }, [chartData])

  if (loading || error || !chartData.length) {
    return (
      <BaseChartCard
        title="Ingresos por Empleado"
        description="Distribución de ingresos por empleado"
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
      description="Distribución de ingresos por empleado"
      loading={loading}
      error={error}
    >
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="revenue"
              nameKey="name"
              innerRadius={50}
              outerRadius={100}
              strokeWidth={8}
              stroke="transparent"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill} 
                  className="stroke-background dark:stroke-gray-900"
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

        <div className="mt-8 space-y-3 w-full">
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-50 text-base">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <span>{topEmployee?.name} lidera con {topEmployeePercentage}%</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando ingresos de {chartData.length} {chartData.length === 1 ? 'empleado' : 'empleados'}
          </p>
        </div>
      </div>
    </BaseChartCard>
  )
}
