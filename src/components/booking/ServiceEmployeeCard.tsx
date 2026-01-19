'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Clock, DollarSign, User, AlertCircle, Loader2 } from 'lucide-react'
import { getEmployeesForService } from '@/lib/employeeServicesApi'

interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  position?: string
  avatar_url?: string
}

interface ServiceEmployeeCardProps {
  service: Service
  selectedEmployee: Employee | null
  onEmployeeSelect: (employee: Employee) => void
  onServiceToggle: () => void
  isSelected: boolean
  isDisabled: boolean
  disabledReason?: string
}

export default function ServiceEmployeeCard({
  service,
  selectedEmployee,
  onEmployeeSelect,
  onServiceToggle,
  isSelected,
  isDisabled,
  disabledReason
}: ServiceEmployeeCardProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadEmployees()
  }, [service.id])

  const loadEmployees = async () => {
    setLoading(true)
    const { data } = await getEmployeesForService(service.id)
    setEmployees(data || [])
    
    // Auto-seleccionar si solo hay un empleado
    if (data?.length === 1 && !selectedEmployee && !isDisabled) {
      onEmployeeSelect(data[0])
    }
    setLoading(false)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
  }

  return (
    <Card 
      className={`
        transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''}
        ${isDisabled ? 'opacity-60' : 'hover:shadow-md'}
      `}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-1">
              {service.name}
            </h3>
            {service.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                {service.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(service.duration_minutes)}
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {formatPrice(service.price)}
              </div>
            </div>
          </div>
          
          {isDisabled && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400">
              Incompatible
            </Badge>
          )}
          
          {isSelected && !isDisabled && (
            <Badge className="bg-blue-600">
              ✓ Seleccionado
            </Badge>
          )}
        </div>

        {/* Disabled Reason */}
        {isDisabled && disabledReason && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300">{disabledReason}</p>
            </div>
          </div>
        )}

        {/* Employee Selector */}
        {!isDisabled && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <User className="w-4 h-4" />
              Seleccionar empleado:
            </label>
            
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : employees.length > 0 ? (
              <Select
                value={selectedEmployee?.id}
                onValueChange={(employeeId) => {
                  const employee = employees.find(e => e.id === employeeId)
                  if (employee) onEmployeeSelect(employee)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elige un empleado..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex items-center gap-3 py-1">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={employee.avatar_url} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs dark:bg-blue-900 dark:text-blue-300">
                            {employee.first_name[0]}{employee.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {employee.first_name} {employee.last_name}
                          </span>
                          {employee.position && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {employee.position}
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                No hay empleados disponibles para este servicio
              </p>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4">
          <Button
            onClick={onServiceToggle}
            disabled={isDisabled || (!isSelected && !selectedEmployee)}
            className={`w-full ${
              isSelected 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSelected ? 'Quitar servicio' : 'Agregar servicio'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
