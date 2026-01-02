'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Users } from 'lucide-react'
import { BaseChartCard } from './BaseChartCard'
import { ChartEmptyState, CustomTooltip } from './ChartComponents'
import type { EmployeeAppointmentCount } from '@/types/analytics'

interface EmployeeRankingChartProps {
  data: EmployeeAppointmentCount[]
  loading?: boolean
  error?: Error | null
}

export function EmployeeRankingChart({ data, loading = false, error }: EmployeeRankingChartProps) {
  // Orange gradient colors for bars
  const colors = ['#ea580c', '#f97316', '#fb923c', '#fbbf24', '#fcd34d']

  return (
    <BaseChartCard
      title="Top 5 Empleados"
      description="Empleados con más citas atendidas"
      loading={loading}
      error={error}
    >
      {!data || data.length === 0 ? (
        <ChartEmptyState message="No hay datos disponibles para este período" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="employee_name"
                type="category"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                width={120}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(value: number, name: string) => {
                  if (name === 'appointment_count') return [value, 'Citas']
                  if (name === 'completion_rate') return [`${value}%`, 'Tasa completitud']
                  return [value, name]
                }}
              />
              <Bar dataKey="appointment_count" name="Citas" radius={[0, 8, 8, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Completion rate legend */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
            {data.map((emp, index) => (
              <div
                key={emp.employee_id}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800"
              >
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span>{emp.employee_name}:</span>
                <span className="font-medium">{emp.completion_rate}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </BaseChartCard>
  )
}
