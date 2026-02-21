'use client'

import * as React from "react"
import { CartesianGrid, Area, AreaChart, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatCurrency, formatNumber, CustomTooltip, formatMonthDateSpanish } from './ChartComponents'
import type { RevenuePeriod } from '@/types/analytics'
import { cn } from "@/lib/utils"

interface MonthlyAppointmentsChartProps {
  data: RevenuePeriod[]
  loading?: boolean
  error?: Error | null
}

const chartConfig = {
  appointment_count: {
    label: "Citas",
    color: "hsl(24.6 95% 53.1%)", // Orange-600
  },
  revenue: {
    label: "Ingresos",
    color: "hsl(142.1 76.2% 36.3%)", // Green-600
  },
} satisfies ChartConfig

export function MonthlyAppointmentsChart({ data, loading = false, error }: MonthlyAppointmentsChartProps) {
  const [activeChart, setActiveChart] = React.useState<keyof typeof chartConfig>("appointment_count")

  const total = React.useMemo(
    () => ({
      appointment_count: data.reduce((acc, curr) => acc + curr.appointment_count, 0),
      revenue: data.reduce((acc, curr) => acc + curr.revenue, 0),
    }),
    [data]
  )

  if (loading) {
    return (
      <Card className="flex flex-col border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:bg-gray-900/50 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pt-8 px-8 pb-4">
          <div>
            <CardTitle className="font-semibold text-gray-900 dark:text-gray-50">Tendencia Mensual</CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">Cargando datos...</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Cargando gráfico...</div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data.length) {
    return (
      <Card className="flex flex-col border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:bg-gray-900/50 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pt-8 px-8 pb-4">
          <div>
            <CardTitle className="font-semibold text-gray-900 dark:text-gray-50">Tendencia Mensual</CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">No hay datos suficientes para mostrar la tendencia</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Sin datos para el período seleccionado
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:bg-gray-900/50 rounded-[2.5rem] overflow-hidden backdrop-blur-sm">
      <CardHeader className="flex flex-col items-stretch !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-8 py-6">
          <CardTitle className="font-semibold text-gray-900 dark:text-gray-50">Tendencia Mensual</CardTitle>
          <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
            Resumen comparativo de citas e ingresos
          </CardDescription>
        </div>
        <div className="flex border-l border-gray-100 dark:border-gray-800">
          {(["appointment_count", "revenue"] as const).map((key) => {
            const chart = key as keyof typeof chartConfig
            const isActive = activeChart === chart
            return (
              <button
                key={chart}
                data-active={isActive}
                className={cn(
                  "flex flex-1 flex-col justify-center gap-1 px-8 py-6 text-left transition-all duration-300",
                  "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                  "data-[active=true]:bg-orange-50/50 dark:data-[active=true]:bg-orange-950/10",
                  "border-l border-gray-100 dark:border-gray-800 first:border-l-0"
                )}
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold opacity-70">
                  {chartConfig[chart].label}
                </span>
                <span className="text-xl leading-none font-bold sm:text-2xl text-gray-900 dark:text-gray-100">
                  {key === 'revenue' 
                    ? formatCurrency(total[key])
                    : formatNumber(total[key])}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-8 pt-6 sm:px-8">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 0,
              right: 12,
              top: 10,
              bottom: 0
            }}
          >
            <defs>
              <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartConfig[activeChart].color} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={chartConfig[activeChart].color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis
              dataKey="period_date"
              tickLine={false}
              axisLine={false}
              tickMargin={15}
              minTickGap={32}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={formatMonthDateSpanish}
            />
            <YAxis hide />
            <ChartTooltip
              content={
                <CustomTooltip 
                    labelFormatter={formatMonthDateSpanish}
                    formatter={activeChart === 'revenue' ? formatCurrency : formatNumber}
                />
              }
            />
            <Area
              dataKey={activeChart}
              type="monotone"
              stroke={chartConfig[activeChart].color}
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#colorActive)"
              animationDuration={1500}
              activeDot={{
                r: 6,
                stroke: "#fff",
                strokeWidth: 2,
                fill: chartConfig[activeChart].color
              }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
