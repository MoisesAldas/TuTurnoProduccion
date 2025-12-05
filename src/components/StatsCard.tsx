import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
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
}: StatsCardProps) {
  // Use custom colors if provided, otherwise use variant
  const colors = gradientFrom && gradientTo && iconColor
    ? { gradientFrom, gradientTo, iconColor }
    : statsCardVariants[variant]
  return (
    <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </CardTitle>
          <div className={`w-8 h-8 bg-gradient-to-br ${colors.gradientFrom} ${colors.gradientTo} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${colors.iconColor}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          {value}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
