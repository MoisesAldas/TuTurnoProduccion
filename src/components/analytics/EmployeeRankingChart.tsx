'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Users } from 'lucide-react'
import type { EmployeeAppointmentCount } from '@/types/analytics'

interface EmployeeRankingChartProps {
  data: EmployeeAppointmentCount[]
  loading?: boolean
}

export function EmployeeRankingChart({ data, loading = false }: EmployeeRankingChartProps) {
  // Orange gradient colors for bars
  const colors = ['#ea580c', '#f97316', '#fb923c', '#fbbf24', '#fcd34d']

  if (loading) {
    return (
      <Card className="dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg dark:text-gray-50">
            <Users className="w-5 h-5 text-orange-600 dark:text-orange-500" />
            Top 5 Empleados
          </CardTitle>
          <CardDescription className="dark:text-gray-400 text-sm">
            Empleados con más citas atendidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full dark:border-orange-900 dark:border-t-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg dark:text-gray-50">
            <Users className="w-5 h-5 text-orange-600 dark:text-orange-500" />
            Top 5 Empleados
          </CardTitle>
          <CardDescription className="dark:text-gray-400 text-sm">
            Empleados con más citas atendidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">No hay datos disponibles para este período</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg dark:text-gray-50">
          <Users className="w-5 h-5 text-orange-600 dark:text-orange-500" />
          Top 5 Empleados
        </CardTitle>
        <CardDescription className="dark:text-gray-400 text-sm">
          Empleados con más citas atendidas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
            <XAxis
              type="number"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              className="dark:fill-gray-400"
            />
            <YAxis
              dataKey="employee_name"
              type="category"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              className="dark:fill-gray-400"
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
              cursor={{ fill: 'rgba(234, 88, 12, 0.1)' }}
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
      </CardContent>
    </Card>
  )
}
