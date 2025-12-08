'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Briefcase } from 'lucide-react'
import type { ServiceData } from '@/types/analytics'

interface TopServicesChartProps {
  data: ServiceData[]
  loading?: boolean
}

export function TopServicesChart({ data, loading = false }: TopServicesChartProps) {
  // Orange gradient colors for bars
  const colors = ['#ea580c', '#f97316', '#fb923c', '#fbbf24', '#fcd34d']

  if (loading) {
    return (
      <Card className="dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg dark:text-gray-50">
            <Briefcase className="w-5 h-5 text-orange-600 dark:text-orange-500" />
            Top 5 Servicios
          </CardTitle>
          <CardDescription className="dark:text-gray-400 text-sm">
            Servicios más solicitados
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
            <Briefcase className="w-5 h-5 text-orange-600 dark:text-orange-500" />
            Top 5 Servicios
          </CardTitle>
          <CardDescription className="dark:text-gray-400 text-sm">
            Servicios más solicitados
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
          <Briefcase className="w-5 h-5 text-orange-600 dark:text-orange-500" />
          Top 5 Servicios
        </CardTitle>
        <CardDescription className="dark:text-gray-400 text-sm">
          Servicios más solicitados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
            <XAxis
              dataKey="service_name"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              className="dark:fill-gray-400"
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              className="dark:fill-gray-400"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
              itemStyle={{ color: '#ea580c' }}
              cursor={{ fill: 'rgba(234, 88, 12, 0.1)' }}
            />
            <Bar dataKey="booking_count" name="Reservas" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
