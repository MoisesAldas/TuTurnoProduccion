'use client'

import { AlertCircle, BarChart3 } from 'lucide-react'

// Skeleton para loading state
export const ChartSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 dark:bg-gray-700"></div>
    <div className="h-64 bg-gray-100 rounded dark:bg-gray-700/50"></div>
  </div>
)

// Error display
export const ChartError = ({ error }: { error: Error }) => (
  <div className="flex items-center gap-3 text-red-600 dark:text-red-400 p-4">
    <AlertCircle className="w-5 h-5 flex-shrink-0" />
    <p className="text-sm">{error.message}</p>
  </div>
)

// Empty state
export const ChartEmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
    <BarChart3 className="w-12 h-12 mb-2 opacity-50" />
    <p className="text-sm">{message}</p>
  </div>
)

// Custom tooltip para Recharts
export const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null
  
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// Formatter utilities
export const formatCurrency = (value: number) => 
  `$${value.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatPercentage = (value: number) => 
  `${value.toFixed(1)}%`
