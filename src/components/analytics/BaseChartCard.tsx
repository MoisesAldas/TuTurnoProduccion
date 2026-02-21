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
    <Card className={cn("border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:bg-gray-900/50 rounded-[2.5rem] hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-500 overflow-hidden backdrop-blur-sm", className)}>
      <CardHeader className="pt-8 px-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-semibold text-gray-900 dark:text-gray-50">
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
      <CardContent className="px-8 pb-8">
        {loading ? (
          <ChartSkeleton />
        ) : error ? (
          <ChartError error={error as Error} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
