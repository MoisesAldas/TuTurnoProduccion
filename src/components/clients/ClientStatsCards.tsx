import { StatsCard } from '@/components/StatsCard'
import { LucideIcon } from 'lucide-react'
import { StatsCardVariant } from '@/components/StatsCard.variants'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: number | string
  variant: StatsCardVariant
}

export default function ClientStatsCards({ stats }: { stats: StatCardProps[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.label}
          value={stat.value}
          description={stat.label}
          icon={stat.icon}
          variant={stat.variant}
        />
      ))}
    </div>
  )
}
