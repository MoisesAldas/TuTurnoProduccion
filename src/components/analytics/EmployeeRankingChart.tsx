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

  // Sort by completed_count for real value ranking
  const sortedData = [...(data || [])].sort((a, b) => b.completed_count - a.completed_count)
  
  // Calculate total appointments to get share of work
  const totalAppointments = sortedData.reduce((acc, curr) => acc + curr.appointment_count, 0)

  return (
    <BaseChartCard
      title="Top 5 Empleados"
      description="Ránking por citas completadas con éxito"
      loading={loading}
      error={error}
    >
      {!sortedData || sortedData.length === 0 ? (
        <ChartEmptyState message="No hay datos disponibles para este período" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <XAxis
                type="number"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="employee_name"
                type="category"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                width={120}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const shareOfWork = totalAppointments > 0 
                      ? ((data.appointment_count / totalAppointments) * 100).toFixed(1)
                      : '0'

                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 space-y-2 min-w-[180px]">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                          {data.employee_name}
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-primary" />
                            <span className="text-sm text-orange-600 dark:text-gray-300">
                              Completadas: <span className="font-semibold">{data.completed_count}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-green-400" />
                            <span className="text-sm text-green-600 dark:text-gray-300">
                              Efectividad: <span className="font-semibold">{data.completion_rate}%</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700/50">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-slate-400" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Carga: <span className="font-medium">{shareOfWork}% del total</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ fill: '#f8fafc', opacity: 0.4 }}
              />
              <Bar dataKey="completed_count" name="Citas Completadas" radius={[0, 12, 12, 0]} barSize={32}>
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Compact Legend */}
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 px-2">
            {sortedData.map((emp, index) => (
              <div
                key={emp.employee_id}
                className="flex items-center gap-2 group transition-opacity hover:opacity-100"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                  {emp.employee_name}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </BaseChartCard>
  )
}
