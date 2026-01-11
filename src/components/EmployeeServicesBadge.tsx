'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Loader2 } from 'lucide-react'
import { getEmployeeServicesCount } from '@/lib/employeeServicesApi'

interface EmployeeServicesBadgeProps {
  employeeId: string
  className?: string
}

export default function EmployeeServicesBadge({
  employeeId,
  className = ''
}: EmployeeServicesBadgeProps) {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCount()
  }, [employeeId])

  const fetchCount = async () => {
    try {
      setLoading(true)
      const { count: servicesCount } = await getEmployeeServicesCount(employeeId)
      setCount(servicesCount)
    } catch (error) {
      console.error('Error fetching services count:', error)
      setCount(0)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Badge variant="outline" className={`text-xs ${className}`}>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ...
      </Badge>
    )
  }

  if (count === null || count === 0) {
    return (
      <Badge
        variant="outline"
        className={`text-xs border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400 ${className}`}
      >
        <Briefcase className="w-3 h-3 mr-1" />
        Sin servicios
      </Badge>
    )
  }

  return (
    <Badge
      className={`text-xs bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-400 dark:border-purple-800 ${className}`}
    >
      <Briefcase className="w-3 h-3 mr-1" />
      {count} servicio{count !== 1 ? 's' : ''}
    </Badge>
  )
}
