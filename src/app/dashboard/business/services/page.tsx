'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Search, Edit, Trash2, Clock, DollarSign, CheckCircle2, Building, X, LayoutGrid, Table as TableIcon, Briefcase, AlertCircle } from 'lucide-react'
import { StatsCard } from '@/components/StatsCard'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Service, Business } from '@/types/database'
import CreateServiceModal from '@/components/CreateServiceModal'
import EditServiceModal from '@/components/EditServiceModal'
import ServiceEmployeesBadge from '@/components/ServiceEmployeesBadge'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null)
  const { authState } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (authState.user) {
      fetchData()
    }
  }, [authState.user])

  const fetchData = async () => {
    if (!authState.user) return

    try {
      setLoading(true)

      // Obtener información del negocio
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', authState.user.id)
        .single()

      if (businessError) {
        console.error('Error fetching business:', businessError)
        router.push('/business/setup')
        return
      }

      setBusiness(businessData)

      // Obtener servicios del negocio
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })

      if (servicesError) {
        console.error('Error fetching services:', servicesError)
      } else {
        setServices(servicesData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteService = async () => {
    if (!serviceToDelete) return

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceToDelete)

      if (error) {
        console.error('Error deleting service:', error)
        alert('Error al eliminar el servicio')
      } else {
        setServices(services.filter(service => service.id !== serviceToDelete))
        setDeleteDialogOpen(false)
        setServiceToDelete(null)
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      alert('Error al eliminar el servicio')
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

  // Memoize filtered services (prevents re-filtering on every render)
  const filteredServices = useMemo(() => {
    return services.filter(service =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [services, searchQuery])

  // Memoize statistics (prevents recalculation on every render)
  const stats = useMemo(() => ({
    total: services.length,
    active: services.filter(s => s.is_active).length,
    averagePrice: services.length > 0 ? services.reduce((sum, s) => sum + s.price, 0) / services.length : 0,
    averageDuration: services.length > 0 ? services.reduce((sum, s) => sum + s.duration_minutes, 0) / services.length : 0
  }), [services])

  // Define columns for DataTable
  const columns: ColumnDef<Service>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Servicio" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 dark:text-gray-50">{row.getValue('name')}</span>
            {row.original.description && (
              <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                {row.original.description}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'price',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Precio" />
      ),
      cell: ({ row }) => {
        const price = parseFloat(row.getValue('price'))
        return (
          <span className="font-semibold text-orange-600 dark:text-orange-400">
            {formatPrice(price)}
          </span>
        )
      },
    },
    {
      accessorKey: 'duration_minutes',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Duración" />
      ),
      cell: ({ row }) => {
        const duration = row.getValue('duration_minutes') as number
        return (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-900 dark:text-gray-50">{formatDuration(duration)}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Estado',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') as boolean
        return (
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={isActive
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-gray-200 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
            }
          >
            {isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'employees',
      header: 'Empleados',
      cell: ({ row }) => {
        return (
          <ServiceEmployeesBadge serviceId={row.original.id} variant="compact" />
        )
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const service = row.original

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedService(service)
                setEditModalOpen(true)
              }}
              className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-900/50 dark:hover:text-orange-400"
            >
              <span className="sr-only">Editar</span>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setServiceToDelete(service.id)
                setDeleteDialogOpen(true)
              }}
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/50 dark:hover:text-red-400"
            >
              <span className="sr-only">Eliminar</span>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ], [formatPrice, formatDuration])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-orange-100 dark:border-orange-900/30 rounded-[2rem]"></div>
            <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-[2rem] animate-spin shadow-[0_0_15px_rgba(234,88,12,0.2)]"></div>
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">
            Configurando Catálogo...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6">
      <div className="w-full space-y-8">
        {/* Premium Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Vertical Accent */}
            <div className="w-1.5 h-10 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(251,146,60,0.3)]" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-orange-600 dark:text-orange-500 mb-0.5">
                {business?.name || 'Catálogo'}
              </p>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                Gestión de Servicios
              </h1>
            </div>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl h-12 px-6 shadow-[0_4px_14px_0_rgba(251,146,60,0.39)] hover:shadow-[0_6px_20px_rgba(251,146,60,0.23)] transition-all duration-300 font-bold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Servicio
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Servicios"
            value={stats.total}
            description="Todos los servicios"
            icon={Briefcase}
            variant="orange"
          />

          <StatsCard
            title="Servicios Activos"
            value={stats.active}
            description={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% activos` : 'Sin servicios'}
            icon={CheckCircle2}
            variant="green"
          />

          <StatsCard
            title="Precio Promedio"
            value={formatPrice(stats.averagePrice)}
            description="Precio medio por servicio"
            icon={DollarSign}
            variant="blue"
          />

          <StatsCard
            title="Duración Promedio"
            value={formatDuration(parseFloat(stats.averageDuration.toFixed(2)))}
            description="Tiempo medio por servicio"
            icon={Clock}
            variant="purple"
          />
        </div>

        {/* Search Bar with View Toggle - Premium Style */}
        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] p-4 border-0">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            {/* Search */}
            <div className="flex-1 group">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-all group-focus-within:text-orange-500 group-focus-within:scale-110" />
                <Input
                  type="text"
                  placeholder="Buscar servicios por nombre o descripción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 bg-gray-50/50 dark:bg-gray-800/30 border-0 rounded-2xl h-11 focus-visible:ring-1 focus-visible:ring-orange-500/30 transition-all shadow-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* View Toggle - Premium Grouped Style */}
            <div className="flex items-center gap-1 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-1 shrink-0 self-center lg:self-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`flex-1 lg:w-auto rounded-xl h-9 px-4 font-bold text-xs transition-all duration-300 ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm font-black'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 mr-2" />
                Cuadrícula
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={`flex-1 lg:w-auto rounded-xl h-9 px-4 font-bold text-xs transition-all duration-300 ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm font-black'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5 mr-2" />
                Tabla
              </Button>
            </div>
          </div>
        </div>

        {/* Services Grid/Table or Empty State */}
        {filteredServices.length === 0 ? (
          <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-[2.5rem] p-16 text-center border-0 shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-orange-100 dark:shadow-none shadow-xl transition-transform hover:scale-110 duration-500">
              <DollarSign className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-50 mb-3">
              {services.length === 0 ? 'Sin Servicios Registrados' : 'Sin Resultados'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
              {services.length === 0
                ? 'Comienza creando tu primer servicio para que los clientes puedan hacer reservas.'
                : `No encontramos servicios que coincidan con "${searchQuery}".`
              }
            </p>
            {services.length === 0 && (
              <Button onClick={() => setCreateModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 rounded-2xl h-12 px-8 font-black shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                Crear Primer Servicio
              </Button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-[2.25rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden border-0">
            <DataTable
              columns={columns}
              data={filteredServices}
              tableContainerClassName="border-0 bg-transparent shadow-none rounded-none"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredServices.map((service) => (
              <Card
                key={service.id}
                className={`
                  overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] dark:bg-gray-900 rounded-[2.25rem] hover:shadow-xl transition-all duration-300 group flex flex-col
                  ${!service.is_active ? 'opacity-75 grayscale-[0.5]' : ''}
                `}
              >
                <CardHeader className="pb-3 pt-5 px-6 bg-gradient-to-br from-orange-50/50 via-transparent to-transparent dark:from-orange-900/5 dark:via-transparent dark:to-transparent relative">
                  {/* Vertical Accent */}
                  <div className="absolute left-0 top-6 w-1.5 h-8 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(251,146,60,0.3)] transition-transform group-hover:scale-y-110" />
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-11 h-11 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-[1rem] flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                        <Briefcase className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600 dark:text-orange-500 mb-0.5 truncate">
                          Servicio Ofrecido
                        </p>
                        <h3 className="text-sm font-black tracking-tight text-gray-900 dark:text-gray-50 truncate">
                          {service.name}
                        </h3>
                      </div>
                    </div>
                    <Badge
                      variant={service.is_active ? "default" : "secondary"}
                      className={service.is_active
                        ? 'bg-emerald-100 text-emerald-700 border-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold dark:bg-emerald-900/40 dark:text-emerald-400 flex-shrink-0'
                        : 'bg-gray-100 text-gray-500 border-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold dark:bg-gray-800 dark:text-gray-400 flex-shrink-0'
                      }
                    >
                      {service.is_active ? '● Activo' : '○ Inactivo'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-1 pb-5 px-6 flex-1 flex flex-col">
                  {service.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4 min-h-[2.5rem]">
                      {service.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between p-2.5 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-transparent group-hover:border-orange-100 dark:group-hover:border-orange-900/30 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-green-100/50 dark:bg-green-900/30 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Precio</span>
                      </div>
                      <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                        {formatPrice(service.price)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-transparent group-hover:border-orange-100 dark:group-hover:border-orange-900/30 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100/50 dark:bg-blue-900/30 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Duración</span>
                      </div>
                      <span className="text-sm font-black text-gray-900 dark:text-gray-50 text-right">
                        {formatDuration(service.duration_minutes)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 p-2.5 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Personal Asignado</span>
                      <ServiceEmployeesBadge serviceId={service.id} variant="compact" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedService(service)
                        setEditModalOpen(true)
                      }}
                      className="rounded-xl border-gray-100 dark:border-gray-800 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-all font-bold text-[11px] h-9 dark:hover:bg-orange-900/40"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setServiceToDelete(service.id)
                        setDeleteDialogOpen(true)
                      }}
                      className="rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition-all font-bold text-[11px] h-9 dark:hover:bg-red-900/40"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Service Modal */}
      {business && (
        <CreateServiceModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          business={business}
          onSuccess={fetchData}
        />
      )}

      {/* Edit Service Modal */}
      <EditServiceModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        service={selectedService}
        onSuccess={fetchData}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <AlertDialogTitle>
                ¿Estás seguro?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este servicio. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false)
              setServiceToDelete(null)
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              className="bg-red-600 hover:bg-red-700 shadow-red-600/20"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
