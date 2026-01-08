'use client'

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
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
      <Card className="flex flex-col">
        <CardHeader className="pt-4 px-6 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div>
            <CardTitle className="font-semibold text-gray-900 dark:text-gray-50">Tendencia Mensual</CardTitle>
            <CardDescription>Cargando datos...</CardDescription>
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
      <Card className="flex flex-col">
        <CardHeader className="pt-4 px-6 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div>
            <CardTitle className="font-semibold text-gray-900 dark:text-gray-50">Tendencia Mensual</CardTitle>
            <CardDescription>No hay datos suficientes para mostrar la tendencia</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Sin datos para el período seleccionado
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4 sm:py-6">
          <CardTitle className="font-semibold text-gray-900 dark:text-gray-50">Tendencia Mensual</CardTitle>
          <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
            Resumen comparativo de citas e ingresos
          </CardDescription>
        </div>
        <div className="flex">
          {(["appointment_count", "revenue"] as const).map((key) => {
            const chart = key as keyof typeof chartConfig
            const isActive = activeChart === chart
            return (
              <button
                key={chart}
                data-active={isActive}
                className={cn(
                  "flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left transition-colors sm:border-t-0 sm:border-l sm:px-8 sm:py-6",
                  "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                  "data-[active=true]:bg-orange-50/50 dark:data-[active=true]:bg-orange-950/10"
                )}
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
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
      <CardContent className="px-2 pt-4 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
              top: 10,
              bottom: 10
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="period_date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={formatMonthDateSpanish}
            />
            <YAxis
                hide
                domain={['auto', 'auto']}
            />
            <ChartTooltip
              content={
                <CustomTooltip 
                    labelFormatter={formatMonthDateSpanish}
                    formatter={activeChart === 'revenue' ? formatCurrency : formatNumber}
                />
              }
            />
            <Line
              dataKey={activeChart}
              name={chartConfig[activeChart].label as string}
              type="monotone"
              stroke={chartConfig[activeChart].color}
              strokeWidth={3}
              dot={{
                r: 4,
                fill: chartConfig[activeChart].color,
                strokeWidth: 2,
                stroke: "#fff"
              }}
              activeDot={{
                r: 6,
                strokeWidth: 0
              }}
              animationDuration={1000}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
