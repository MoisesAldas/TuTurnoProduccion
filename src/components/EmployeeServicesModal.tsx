'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Save, Briefcase, Clock, DollarSign, Loader2, AlertCircle, Search, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getServicesWithAssignment, updateEmployeeServices } from '@/lib/employeeServicesApi'
import type { ServiceWithAssignment } from '@/types/employee-services'
import { Input } from '@/components/ui/input'

interface EmployeeServicesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  employeeName: string
  businessId: string
  onSuccess?: () => void
}

export default function EmployeeServicesModal({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  businessId,
  onSuccess
}: EmployeeServicesModalProps) {
  const [services, setServices] = useState<ServiceWithAssignment[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchServices()
    }
  }, [open, employeeId, businessId])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const { data, error } = await getServicesWithAssignment(businessId, employeeId)

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Error al cargar los servicios'
        })
        return
      }

      if (data) {
        setServices(data)
        // Inicializar servicios seleccionados
        const assigned = new Set(data.filter(s => s.is_assigned).map(s => s.id))
        setSelectedServiceIds(assigned)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al cargar los servicios'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleService = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId)
      } else {
        newSet.add(serviceId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const activeServices = filteredServices.filter(s => s.is_active)
    setSelectedServiceIds(new Set(activeServices.map(s => s.id)))
  }

  const handleDeselectAll = () => {
    setSelectedServiceIds(new Set())
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)

      const result = await updateEmployeeServices(
        employeeId,
        Array.from(selectedServiceIds)
      )

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Error al actualizar los servicios'
        })
        return
      }

      // Mensaje de éxito con detalles
      let message = 'Servicios actualizados correctamente'
      if (result.added > 0 || result.removed > 0) {
        const parts = []
        if (result.added > 0) parts.push(`${result.added} agregado${result.added > 1 ? 's' : ''}`)
        if (result.removed > 0) parts.push(`${result.removed} eliminado${result.removed > 1 ? 's' : ''}`)
        message = `${parts.join(', ')}`
      }

      toast({
        title: 'Éxito',
        description: message,
        duration: 3000
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error updating services:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al actualizar los servicios'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  // Filtrar servicios por búsqueda
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedCount = selectedServiceIds.size
  const totalActiveServices = services.filter(s => s.is_active).length
  const hasChanges = services.some(s => s.is_assigned !== selectedServiceIds.has(s.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl h-[90vh] sm:h-[85vh] p-0 gap-0 flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Servicios de {employeeName}
            </DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Selecciona los servicios que puede realizar este empleado
            </DialogDescription>
          </DialogHeader>

          {/* Stats Badge */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800 text-xs">
              {selectedCount} de {totalActiveServices} seleccionados
            </Badge>
            {hasChanges && (
              <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Sin guardar
              </Badge>
            )}
          </div>
        </div>

        {/* Search and Actions - Fixed */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <Input
                type="text"
                placeholder="Buscar servicios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs h-9 flex-1 sm:flex-none"
                disabled={loading}
              >
                Todos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="text-xs h-9 flex-1 sm:flex-none"
                disabled={loading}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </div>

        {/* Services List - Scrollable */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-4 sm:px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-600 dark:text-orange-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Cargando servicios...</p>
                  </div>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-1">
                    {searchQuery ? 'No se encontraron servicios' : 'No hay servicios disponibles'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {searchQuery
                      ? `No hay servicios que coincidan con "${searchQuery}"`
                      : 'Crea servicios primero para poder asignarlos'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredServices.map((service) => {
                    const isSelected = selectedServiceIds.has(service.id)
                    const isActive = service.is_active

                    return (
                      <div
                        key={service.id}
                        className={`
                          flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer
                          ${isSelected
                            ? 'bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700'
                            : 'bg-white border-gray-200 hover:border-orange-200 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-orange-800'
                          }
                          ${!isActive ? 'opacity-50' : ''}
                        `}
                        onClick={() => isActive && handleToggleService(service.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => isActive && handleToggleService(service.id)}
                          disabled={!isActive}
                          className="mt-0.5"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-50 truncate">
                                {service.name}
                              </h4>
                              {service.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mt-0.5">
                                  {service.description}
                                </p>
                              )}
                            </div>
                            {!isActive && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Inactivo
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                              <span className="font-semibold text-orange-600 dark:text-orange-400">
                                {formatPrice(service.price)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatDuration(service.duration_minutes)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none h-9 sm:h-10"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 sm:flex-none h-9 sm:h-10 bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              disabled={submitting || loading || !hasChanges}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
