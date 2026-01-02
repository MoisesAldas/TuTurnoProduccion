'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ChartSkeleton, ChartError } from './ChartComponents'

interface BaseChartCardProps {
  title: string
  description?: string
  loading?: boolean
  error?: Error | null
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export const BaseChartCard = ({
  title,
  description,
  loading,
  error,
  children,
  actions,
  className
}: BaseChartCardProps) => {
  return (
    <Card className={cn("border border-gray-200 hover:shadow-lg transition-shadow dark:border-gray-700 dark:bg-gray-800", className)}>
      <CardHeader className="border-b border-gray-200 pb-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                {description}
              </CardDescription>
            )}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <ChartSkeleton />
        ) : error ? (
          <ChartError error={error} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
