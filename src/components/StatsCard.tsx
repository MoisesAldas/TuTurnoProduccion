import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { statsCardVariants, type StatsCardVariant } from './StatsCard.variants'

interface StatsCardProps {
  title: string
  value: string | number
  description: string
  icon: LucideIcon
  // Option 1: Use predefined variant
  variant?: StatsCardVariant
  // Option 2: Custom colors (overrides variant)
  gradientFrom?: string
  gradientTo?: string
  iconColor?: string
  trend?: {
    value: number
    label?: string
  }
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  variant = 'orange',
  gradientFrom,
  gradientTo,
  iconColor,
  trend,
}: StatsCardProps) {
  // Use custom colors if provided, otherwise use variant
  const colors = gradientFrom && gradientTo && iconColor
    ? { gradientFrom, gradientTo, iconColor }
    : statsCardVariants[variant]

  const isPositive = trend ? trend.value >= 0 : true
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight

  return (
    <Card className="overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] dark:bg-gray-900 rounded-[2rem] hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-2 pt-6 px-7">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[10px] uppercase tracking-[0.1em] font-extrabold text-gray-400 dark:text-gray-500">
            {title}
          </CardTitle>
          <div className={`w-9 h-9 bg-gradient-to-br ${colors.gradientFrom} ${colors.gradientTo} rounded-xl flex items-center justify-center shadow-sm`}>
            <Icon className={`w-4.5 h-4.5 ${colors.iconColor}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-6 px-7">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50">
            {value}
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isPositive 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              <TrendIcon className="w-3 h-3" />
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
