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
        <div className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50">
          {value}
        </div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
