'use client'

import { useState, useEffect } from 'react'
import { getEmployeesForService } from '@/lib/employeeServicesApi'
import { Loader2 } from 'lucide-react'

interface EmployeeServiceInfoProps {
  serviceId: string
  serviceName: string
}

export default function EmployeeServiceInfo({
  serviceId,
  serviceName
}: EmployeeServiceInfoProps) {
  const [employees, setEmployees] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEmployees()
  }, [serviceId])

  const loadEmployees = async () => {
    setLoading(true)
    const { data } = await getEmployeesForService(serviceId)
    const names = (data || []).map(emp => `${emp.first_name} ${emp.last_name}`)
    setEmployees(names)
    setLoading(false)
  }

  return (
    <div className="flex justify-between items-center text-sm">
      <span className="font-medium text-gray-900 dark:text-gray-100">
        {serviceName}
      </span>
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
      ) : (
        <span className="text-gray-600 dark:text-gray-400">
          {employees.length > 0 ? employees.join(', ') : 'Sin empleados'}
        </span>
      )}
    </div>
  )
}
