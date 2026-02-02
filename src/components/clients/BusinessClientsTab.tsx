'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Phone,
  Mail,
  User,
  Calendar,
  Plus,
  Search as SearchIcon,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import ClientStatsCards from './ClientStatsCards'

interface BusinessClient {
  id: string
  first_name: string
  last_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  total_count?: number
}

interface BusinessClientsTabProps {
  businessId: string
  onAddClient: () => void
  onEditClient: (client: BusinessClient) => void
  onDeleteClient: (clientId: string) => void
  onExport: (format: 'excel' | 'pdf') => void
}

export default function BusinessClientsTab({
  businessId,
  onAddClient,
  onEditClient,
  onDeleteClient,
  onExport,
}: BusinessClientsTabProps) {
  const [clients, setClients] = useState<BusinessClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [onlyActive, setOnlyActive] = useState<'true' | 'false'>('true')
  const [sortBy, setSortBy] = useState('first_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [appointmentCounts, setAppointmentCounts] = useState<Record<string, number>>({})
  const limit = 20

  const supabase = createClient()
  const { toast } = useToast()

  const totalCount = clients?.[0]?.total_count ?? 0
  const totalPages = Math.ceil(totalCount / limit)

  // Statistics
  const stats = [
    {
      icon: Users,
      label: 'Total Clientes',
      value: totalCount,
      variant: 'orange' as const,
    },
    {
      icon: CheckCircle2,
      label: 'Activos',
      value: clients.filter((c) => c.is_active).length,
      variant: 'green' as const,
    },
    {
      icon: Phone,
      label: 'Con Teléfono',
      value: clients.filter((c) => c.phone).length,
      variant: 'blue' as const,
    },
    {
      icon: Mail,
      label: 'Con Email',
      value: clients.filter((c) => c.email).length,
      variant: 'purple' as const,
    },
  ]

  useEffect(() => {
    if (businessId) {
      fetchClients()
    }
  }, [businessId, search, onlyActive, sortBy, sortDir, page])

  // Expose refresh function for parent to call
  useEffect(() => {
    ;(window as any).refreshBusinessClients = fetchClients
    return () => {
      delete (window as any).refreshBusinessClients
    }
  }, [businessId, search, onlyActive, sortBy, sortDir, page])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const offset = (page - 1) * limit
      const { data, error } = await supabase.rpc('list_business_clients', {
        p_business_id: businessId,
        p_search: search.trim() || null,
        p_only_active: onlyActive === 'true',
        p_limit: limit,
        p_offset: offset,
        p_sort_by: sortBy,
        p_sort_dir: sortDir,
      })
      if (error) throw error
      setClients((data as any) || [])

      // Fetch appointment counts
      if (data && data.length > 0) {
        await fetchAppointmentCounts(data.map((client: any) => client.id))
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAppointmentCounts = async (clientIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('business_client_id')
        .eq('business_id', businessId)
        .in('business_client_id', clientIds)
        .not('business_client_id', 'is', null)

      if (error) throw error

      const counts: Record<string, number> = {}
      clientIds.forEach((id) => (counts[id] = 0))

      data?.forEach((appointment: any) => {
        if (appointment.business_client_id) {
          counts[appointment.business_client_id] =
            (counts[appointment.business_client_id] || 0) + 1
        }
      })

      setAppointmentCounts(counts)
    } catch (e) {
      console.error('Error fetching appointment counts:', e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <ClientStatsCards stats={stats} />

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Active Filter */}
            <Select value={onlyActive} onValueChange={(v: 'true' | 'false') => setOnlyActive(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Solo Activos</SelectItem>
                <SelectItem value="false">Todos</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first_name">Nombre</SelectItem>
                <SelectItem value="created_at">Fecha</SelectItem>
              </SelectContent>
            </Select>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onExport('excel')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('pdf')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add Client */}
            <Button
              onClick={onAddClient}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cliente
            </Button>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Cargando clientes...</p>
            </div>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay clientes registrados</p>
            <Button onClick={onAddClient} className="mt-4" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Agregar primer cliente
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Contacto
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Citas
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Estado
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => {
                    const count = appointmentCounts[client.id] ?? 0
                    return (
                      <tr
                        key={client.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {client.first_name} {client.last_name || ''}
                              </div>
                              {client.notes && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                  {client.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {client.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{client.phone}</span>
                              </div>
                            )}
                            {client.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Mail className="w-3.5 h-3.5" />
                                <span className="truncate max-w-xs">{client.email}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{count}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {client.is_active ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactivo
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditClient(client)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDeleteClient(client.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Página {page} de {totalPages} • {totalCount} clientes
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
