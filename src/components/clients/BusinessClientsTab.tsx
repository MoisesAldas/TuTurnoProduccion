'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
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

      {/* Filters and Actions - Premium Style */}
      <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] p-4 border-0">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 group">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-all group-focus-within:text-orange-500 group-focus-within:scale-110" />
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-11 bg-gray-50/50 dark:bg-gray-800/30 border-0 rounded-2xl h-11 focus-visible:ring-1 focus-visible:ring-orange-500/30 transition-all"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Select value={onlyActive} onValueChange={(v: 'true' | 'false') => setOnlyActive(v)}>
                <SelectTrigger className="w-[140px] rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 border-0 h-11 focus:ring-1 focus:ring-orange-500/30 font-semibold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-xl">
                  <SelectItem value="true" className="rounded-xl">Solo Activos</SelectItem>
                  <SelectItem value="false" className="rounded-xl">Todos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 border-0 h-11 focus:ring-1 focus:ring-orange-500/30 font-semibold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-xl">
                  <SelectItem value="first_name" className="rounded-xl">Nombre</SelectItem>
                  <SelectItem value="created_at" className="rounded-xl">Fecha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-2xl border-gray-100 dark:border-gray-800 h-11 px-5 font-bold text-xs hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-all">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-xl p-1.5" align="end">
                  <DropdownMenuItem onClick={() => onExport('excel')} className="rounded-xl py-2.5 cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                    <span className="font-semibold">Excel (XLSX)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('pdf')} className="rounded-xl py-2.5 cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-red-600" />
                    <span className="font-semibold">PDF (Reporte)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Grid - Premium Style */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Cargando clientes...</p>
            </div>
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-[2.5rem] p-12 text-center border-0 shadow-sm">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-50 mb-2">Sin Clientes</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
              No hay clientes registrados que coincidan con los filtros actuales.
            </p>
            <Button onClick={onAddClient} className="bg-orange-600 hover:bg-orange-700 rounded-2xl h-11 px-8 font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Agregar primer cliente
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clients.map((client) => {
                const count = appointmentCounts[client.id] ?? 0
                return (
                  <Card
                    key={client.id}
                    className={`
                      overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] dark:bg-gray-900 rounded-[2.25rem] hover:shadow-xl transition-all duration-300 group flex flex-col
                      ${!client.is_active ? 'opacity-75 grayscale-[0.5]' : ''}
                    `}
                  >
                    <CardHeader className="pb-3 pt-5 px-6 bg-gradient-to-br from-orange-50/50 via-transparent to-transparent dark:from-orange-900/5 dark:via-transparent dark:to-transparent relative">
                      {/* Vertical Accent */}
                      <div className="absolute left-0 top-6 w-1.5 h-8 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(251,146,60,0.3)] transition-transform group-hover:scale-y-110" />
                      
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="w-11 h-11 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-[1rem] flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                            <User className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600 dark:text-orange-500 mb-0.5 truncate">
                              Cliente del Negocio
                            </p>
                            <h3 className="text-sm font-black tracking-tight text-gray-900 dark:text-gray-50 truncate">
                              {client.first_name} {client.last_name || ''}
                            </h3>
                          </div>
                        </div>
                        <Badge
                          variant={client.is_active ? "default" : "secondary"}
                          className={client.is_active
                            ? 'bg-emerald-100 text-emerald-700 border-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold dark:bg-emerald-900/40 dark:text-emerald-400 flex-shrink-0'
                            : 'bg-gray-100 text-gray-500 border-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold dark:bg-gray-800 dark:text-gray-400 flex-shrink-0'
                          }
                        >
                          {client.is_active ? '● Activo' : '○ Inactivo'}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-1 pb-5 px-6 flex-1 flex flex-col">
                      <div className="space-y-2">
                        {client.phone && (
                          <div className="flex items-center gap-2.5 p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl min-w-0 border border-transparent hover:border-orange-100 dark:hover:border-orange-900/30 transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-blue-100/50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                              <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{client.phone}</span>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2.5 p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl min-w-0 border border-transparent hover:border-orange-100 dark:hover:border-orange-900/30 transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-purple-100/50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                              <Mail className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate" title={client.email}>{client.email}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between gap-2.5 p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-transparent hover:border-orange-100 dark:hover:border-orange-900/30 transition-colors">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="w-7 h-7 rounded-lg bg-orange-100/50 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Total Citas</span>
                          </div>
                          <span className="text-xs font-black text-orange-600 dark:text-orange-400">{count}</span>
                        </div>

                        {client.notes && (
                          <div className="flex items-start gap-2.5 p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl min-w-0">
                            <span className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-1 italic">
                              "{client.notes}"
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-4 mt-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditClient(client)}
                          className="rounded-xl border-gray-200 dark:border-gray-800 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-all font-bold text-[11px] h-9 dark:hover:bg-orange-900/40"
                        >
                          <Edit className="w-3 h-3 mr-1.5" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteClient(client.id)}
                          className="rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition-all font-bold text-[11px] h-9 dark:hover:bg-red-900/40"
                        >
                          <Trash2 className="w-3 h-3 mr-1.5" />
                          Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Pagination - Premium Style */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">
                  Página {page} de {totalPages} <span className="mx-2 opacity-30">|</span> {totalCount} clientes
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-xl h-9 w-9 p-0 border-gray-200 dark:border-gray-800 transition-all hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-xl h-9 w-9 p-0 border-gray-200 dark:border-gray-800 transition-all hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
