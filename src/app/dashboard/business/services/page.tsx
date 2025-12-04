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
import { Plus, Search, Edit, Trash2, Clock, DollarSign, CheckCircle2, Building, X, LayoutGrid, Table as TableIcon } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Service, Business } from '@/types/database'
import CreateServiceModal from '@/components/CreateServiceModal'
import EditServiceModal from '@/components/EditServiceModal'
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
            <span className="font-medium text-gray-900">{row.getValue('name')}</span>
            {row.original.description && (
              <span className="text-xs text-gray-500 line-clamp-1 mt-0.5">
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
          <span className="font-semibold text-orange-600">
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
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm">{formatDuration(duration)}</span>
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
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : 'bg-gray-200 text-gray-600 border-gray-300'
            }
          >
            {isActive ? 'Activo' : 'Inactivo'}
          </Badge>
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
              className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-700"
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
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-700"
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cargando servicios</h3>
          <p className="text-sm text-gray-600">Obteniendo tu catálogo de servicios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Servicios</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Gestiona los servicios de tu negocio
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {business && (
                <Badge className="hidden sm:flex bg-orange-100 text-orange-700 border-orange-200">
                  <Building className="w-4 h-4 mr-2" />
                  {business.name}
                </Badge>
              )}
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Servicio
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Servicios</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Servicios Activos</p>
                  <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% activos` : ''}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Precio Promedio</p>
                  <p className="text-2xl font-bold text-blue-600">{formatPrice(stats.averagePrice)}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Duración Promedio</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatDuration(parseFloat(stats.averageDuration.toFixed(2)))}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar with View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Buscar servicios por nombre o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`h-10 ${
                viewMode === 'grid'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-sm'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Cuadrícula</span>
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={`h-10 ${
                viewMode === 'table'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-sm'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <TableIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Tabla</span>
            </Button>
          </div>
        </div>

        {/* Services Grid/Table or Empty State */}
        {filteredServices.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {services.length === 0 ? 'No tienes servicios registrados' : 'No se encontraron servicios'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {services.length === 0
                  ? 'Los servicios son la base de tu negocio. Comienza creando tu primer servicio para que los clientes puedan hacer reservas.'
                  : `No encontramos servicios que coincidan con "${searchQuery}". Intenta con una búsqueda diferente.`
                }
              </p>
              {services.length === 0 && (
                <Link href="/dashboard/business/services/new">
                  <Button className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primer Servicio
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          /* Table View */
          <DataTable
            columns={columns}
            data={filteredServices}
          />
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <Card
                key={service.id}
                className={`
                  hover:shadow-lg transition-all duration-200 group
                  ${!service.is_active ? 'bg-gray-50 opacity-75' : ''}
                `}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {service.name}
                    </CardTitle>
                    <Badge
                      variant={service.is_active ? "default" : "secondary"}
                      className={service.is_active
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0'
                        : 'bg-gray-200 text-gray-600 border border-gray-300 flex-shrink-0'
                      }
                    >
                      {service.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  {service.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Price - Simplified */}
                  <div className="flex items-baseline justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium">Precio</span>
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      {formatPrice(service.price)}
                    </span>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>Duración</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {formatDuration(service.duration_minutes)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedService(service)
                        setEditModalOpen(true)
                      }}
                      className="flex-1 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors group-hover:border-orange-200 shadow-sm hover:shadow-md"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setServiceToDelete(service.id)
                        setDeleteDialogOpen(true)
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm hover:shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
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
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este servicio. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false)
              setServiceToDelete(null)
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
