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

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedCount = selectedServiceIds.size
  const totalActiveServices = services.filter(s => s.is_active).length
  const hasChanges = services.some(s => s.is_assigned !== selectedServiceIds.has(s.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl h-[90vh] sm:h-[85vh] p-0 gap-0 flex flex-col border-none shadow-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden">
        <div className="flex-shrink-0 px-6 py-6 sm:px-8 sm:py-8 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <DialogHeader>
            <div className="flex flex-col gap-0.5 relative pl-5">
              <div className="absolute left-0 w-1 h-6 bg-primary rounded-full mt-0.5" />
              <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-primary italic">Asignación de Especialidades</span>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white italic">
                {employeeName}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm font-medium text-gray-500 dark:text-gray-400 pl-5 mt-1">
              Marca los servicios que este profesional está capacitado para realizar
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 mt-5 pl-5">
            <Badge className="bg-orange-50 dark:bg-orange-950/30 text-primary border border-orange-100 dark:border-orange-900/50 text-[10px] font-black uppercase tracking-widest px-3 py-1 shadow-sm">
              {selectedCount} de {totalActiveServices} servicios activos
            </Badge>
            {hasChanges && (
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 animate-pulse">
                <AlertCircle className="w-3 h-3 mr-1.5" />
                Cambios pendientes
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 px-6 py-4 sm:px-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
              <Input
                type="text"
                placeholder="Buscar servicios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 font-bold focus-visible:ring-primary shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-[10px] font-black uppercase tracking-widest h-11 px-4 rounded-xl border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                disabled={loading}
              >
                Todos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="text-[10px] font-black uppercase tracking-widest h-11 px-4 rounded-xl border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                disabled={loading}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-gray-900">
          <ScrollArea className="h-full">
            <div className="px-6 py-6 sm:px-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Consultando Servicios...</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2.5rem] bg-gray-50/50 dark:bg-gray-800/30">
                  <Briefcase className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">
                    Sin coincidencias
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                  {filteredServices.map((service) => {
                    const isSelected = selectedServiceIds.has(service.id)
                    const isActive = service.is_active

                    return (
                      <div
                        key={service.id}
                        className={`
                          flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer group/item
                          ${isSelected
                            ? 'bg-orange-50/30 dark:bg-orange-950/10 border-primary shadow-lg shadow-orange-500/5'
                            : 'bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-primary/30'
                          }
                          ${!isActive ? 'opacity-50 grayscale' : ''}
                        `}
                        onClick={() => isActive && handleToggleService(service.id)}
                      >
                        <div className="pt-0.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => isActive && handleToggleService(service.id)}
                            disabled={!isActive}
                            className="h-5 w-5 rounded-lg border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-sm text-gray-900 dark:text-white truncate tracking-tight">
                                {service.name}
                              </h4>
                              {service.description && (
                                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5 italic">
                                  {service.description}
                                </p>
                              )}
                            </div>
                            {!isActive && (
                              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700">
                                Inactivo
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                            <div className="flex items-center gap-1.5 text-primary">
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>{formatPrice(service.price)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
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

        <div className="flex-shrink-0 px-6 py-5 sm:px-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div className="hidden sm:block">
               <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest italic">
                 Cambios guardados al confirmar
               </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-12 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                className="h-12 sm:px-10 bg-primary hover:bg-orange-600 text-white rounded-xl shadow-xl shadow-orange-500/20 font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                disabled={submitting || loading || !hasChanges}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    <span>Confirmar Servicios</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
