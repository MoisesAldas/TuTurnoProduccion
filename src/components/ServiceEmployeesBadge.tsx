'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Loader2, AlertCircle } from 'lucide-react'
import { getEmployeesForService } from '@/lib/employeeServicesApi'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Employee {
  id: string
  first_name: string
  last_name: string
  position?: string
  avatar_url?: string
}

interface ServiceEmployeesBadgeProps {
  serviceId: string
  className?: string
  variant?: 'compact' | 'full'
}

export default function ServiceEmployeesBadge({
  serviceId,
  className = '',
  variant = 'compact'
}: ServiceEmployeesBadgeProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [serviceId])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      setError(false)
      const { data, error: fetchError } = await getEmployeesForService(serviceId)
      
      if (fetchError) {
        setError(true)
        setEmployees([])
      } else {
        setEmployees(data || [])
      }
    } catch (err) {
      console.error('Error fetching employees for service:', err)
      setError(true)
      setEmployees([])
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

  if (error) {
    return (
      <Badge variant="outline" className={`text-xs border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 ${className}`}>
        <AlertCircle className="w-3 h-3 mr-1" />
        Error
      </Badge>
    )
  }

  if (employees.length === 0) {
    return (
      <Badge
        variant="outline"
        className={`text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 ${className}`}
      >
        <AlertCircle className="w-3 h-3 mr-1" />
        Sin empleados
      </Badge>
    )
  }

  // Variant: Compact - Solo mostrar contador con tooltip
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              className={`text-xs bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800 cursor-help ${className}`}
            >
              <Users className="w-3 h-3 mr-1" />
              {employees.length} empleado{employees.length !== 1 ? 's' : ''}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold text-xs mb-2">Empleados asignados:</p>
              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span>{emp.first_name} {emp.last_name}</span>
                  {emp.position && (
                    <span className="text-gray-500">({emp.position})</span>
                  )}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Variant: Full - Mostrar avatares + nombres
  const displayEmployees = employees.slice(0, 3)
  const remainingCount = employees.length - 3

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center -space-x-2">
        {displayEmployees.map((emp) => (
          <TooltipProvider key={emp.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="w-6 h-6 border-2 border-white dark:border-gray-800 cursor-help">
                  <AvatarImage src={emp.avatar_url} alt={`${emp.first_name} ${emp.last_name}`} />
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400">
                    {emp.first_name[0]}{emp.last_name[0]}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-semibold">{emp.first_name} {emp.last_name}</p>
                {emp.position && <p className="text-xs text-gray-500">{emp.position}</p>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {remainingCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-white dark:border-gray-800 flex items-center justify-center cursor-help">
                  <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                    +{remainingCount}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-xs mb-2">Otros empleados:</p>
                  {employees.slice(3).map((emp) => (
                    <div key={emp.id} className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      <span>{emp.first_name} {emp.last_name}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {employees.length} empleado{employees.length !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
