'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, ArrowLeft, Users, Lightbulb, Calendar } from 'lucide-react'
import EmployeeServiceInfo from './EmployeeServiceInfo'

interface Service {
  id: string
  name: string
}

interface NoEmployeesAvailableAlertProps {
  selectedServices: Service[]
  onGoBack: () => void
  onBookSeparately?: () => void
}

export default function NoEmployeesAvailableAlert({
  selectedServices,
  onGoBack,
  onBookSeparately
}: NoEmployeesAvailableAlertProps) {
  return (
    <div className="space-y-4">
      {/* Header con icono y título */}
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-amber-900 dark:text-amber-100 mb-1">
                No hay empleados disponibles
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Los servicios seleccionados requieren empleados diferentes
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Servicios seleccionados */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              Servicios seleccionados ({selectedServices.length})
            </h4>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedServices.map((service, index) => (
            <div key={service.id}>
              <EmployeeServiceInfo
                serviceId={service.id}
                serviceName={service.name}
              />
              {index < selectedServices.length - 1 && (
                <Separator className="mt-3" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sugerencia */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg h-fit">
              <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700">
                  Sugerencia
                </Badge>
              </div>
              <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                Puedes reservar estos servicios en <strong>citas separadas</strong> para que cada 
                empleado los realice en horarios diferentes. Esto te permite acceder a todos 
                los servicios que necesitas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={onGoBack}
          variant="outline"
          size="lg"
          className="flex-1 text-gray-700 border-gray-300 bg-white hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cambiar servicios
        </Button>
        
        {onBookSeparately && (
          <Button
            onClick={onBookSeparately}
            size="lg"
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Reservar por separado
          </Button>
        )}
      </div>
    </div>
  )
}
