'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Phone,
  Mail,
  Calendar,
  Search as SearchIcon,
  Ban,
  CheckCircle,
  Unlock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import ClientStatsCards from './ClientStatsCards'

interface RegisteredClient {
  id: string
  first_name: string
  last_name: string | null
  phone: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  appointment_count: number
  is_blocked: boolean
  blocked_at: string | null
  blocked_reason: string | null
  current_month_cancellations: number | null
}

interface RegisteredClientsTabProps {
  businessId: string
  onUnblockClient: (clientId: string, clientName: string) => void
}

export default function RegisteredClientsTab({
  businessId,
  onUnblockClient,
}: RegisteredClientsTabProps) {
  const [clients, setClients] = useState<RegisteredClient[]>([])
  const [filteredClients, setFilteredClients] = useState<RegisteredClient[]>([])
  const [paginatedClients, setPaginatedClients] = useState<RegisteredClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all')
  const [page, setPage] = useState(1)
  const limit = 20

  const supabase = createClient()
  const { toast } = useToast()

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / limit))

  // Statistics
  const totalCancellations = clients.reduce(
    (sum, c) => sum + (c.current_month_cancellations || 0),
    0
  )

  const stats = [
    {
      icon: Users,
      label: 'Total Registrados',
      value: clients.length,
      variant: 'blue' as const,
    },
    {
      icon: CheckCircle,
      label: 'Activos',
      value: clients.filter((c) => !c.is_blocked).length,
      variant: 'green' as const,
    },
    {
      icon: Ban,
      label: 'Bloqueados',
      value: clients.filter((c) => c.is_blocked).length,
      variant: 'red' as const,
    },
    {
      icon: AlertCircle,
      label: 'Cancelaciones',
      value: totalCancellations,
      variant: 'yellow' as const,
    },
  ]

  useEffect(() => {
    if (businessId) {
      fetchClients()
    }
  }, [businessId])

  useEffect(() => {
    // Apply filters
    let filtered = clients

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((c) => !c.is_blocked)
    } else if (statusFilter === 'blocked') {
      filtered = filtered.filter((c) => c.is_blocked)
    }

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.first_name?.toLowerCase().includes(searchLower) ||
          c.last_name?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower) ||
          c.phone?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredClients(filtered)
  }, [clients, statusFilter, search])

  // Apply pagination
  useEffect(() => {
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    setPaginatedClients(filteredClients.slice(startIndex, endIndex))
  }, [filteredClients, page, limit])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const fetchClients = async () => {
    try {
      setLoading(true)

      // Fetch app users who have booked
      const { data: appUsersData, error: appUsersError } = await supabase
        .from('appointments')
        .select(`
          client_id,
          users!appointments_client_id_fkey(id, first_name, last_name, email, phone, avatar_url, created_at)
        `)
        .eq('business_id', businessId)
        .not('client_id', 'is', null)

      if (appUsersError) throw appUsersError

      // Get unique app users
      const uniqueAppUsers = Array.from(
        new Map(
          (appUsersData || [])
            .filter((apt) => apt.users)
            .map((apt) => {
              const user = apt.users as any
              return [user.id, user]
            })
        ).values()
      )

      // Fetch blocking status for app users
      const appUserIds = uniqueAppUsers.map((u: any) => u.id)
      let blockingData: any[] = []
      let cancellationData: any[] = []
      let appointmentCountsData: Record<string, number> = {}

      if (appUserIds.length > 0) {
        const { data: blocks } = await supabase
          .from('client_business_blocks')
          .select('client_id, is_active, blocked_at, blocked_reason')
          .eq('business_id', businessId)
          .in('client_id', appUserIds)
          .eq('is_active', true)

        blockingData = blocks || []

        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()

        const { data: cancellations } = await supabase
          .from('client_cancellation_tracking')
          .select('client_id, cancellation_count')
          .eq('business_id', businessId)
          .in('client_id', appUserIds)
          .eq('month', currentMonth)
          .eq('year', currentYear)

        cancellationData = cancellations || []

        // Fetch appointment counts for app users
        const { data: appts } = await supabase
          .from('appointments')
          .select('client_id')
          .eq('business_id', businessId)
          .in('client_id', appUserIds)
          .not('client_id', 'is', null)

        appts?.forEach((apt: any) => {
          if (apt.client_id) {
            appointmentCountsData[apt.client_id] =
              (appointmentCountsData[apt.client_id] || 0) + 1
          }
        })
      }

      // Map app users to RegisteredClient interface
      const appUsersFormatted: RegisteredClient[] = uniqueAppUsers.map((user: any) => {
        const block = blockingData.find((b) => b.client_id === user.id)
        const cancellation = cancellationData.find((c) => c.client_id === user.id)

        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          appointment_count: appointmentCountsData[user.id] || 0,
          is_blocked: !!block,
          blocked_at: block?.blocked_at || null,
          blocked_reason: block?.blocked_reason || null,
          current_month_cancellations: cancellation?.cancellation_count || 0,
        }
      })

      setClients(appUsersFormatted)
    } catch (e) {
      console.error('Error fetching app users:', e)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes registrados',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Expose refresh function
  useEffect(() => {
    // Store refresh function in window for parent to call
    ;(window as any).refreshRegisteredClients = fetchClients
    return () => {
      delete (window as any).refreshRegisteredClients
    }
  }, [businessId])

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <ClientStatsCards stats={stats} />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(v: 'all' | 'active' | 'blocked') => setStatusFilter(v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Solo Activos</SelectItem>
              <SelectItem value="blocked">Solo Bloqueados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">Cargando clientes...</p>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {search || statusFilter !== 'all'
                ? 'No se encontraron clientes con los filtros aplicados'
                : 'No hay clientes registrados aún'}
            </p>
          </div>
        ) : (
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
                    Cancelaciones
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
                {paginatedClients.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={user.avatar_url || undefined} alt={user.first_name} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400">
                            {user.first_name?.charAt(0)}
                            {user.last_name?.charAt(0) || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.first_name} {user.last_name || ''}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Usuario de la app
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {user.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate max-w-xs">{user.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{user.appointment_count || 0}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {user.current_month_cancellations || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {user.is_blocked ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
                          <Ban className="w-3.5 h-3.5" />
                          <span>Bloqueado</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Activo</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {user.is_blocked && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onUnblockClient(
                              user.id,
                              `${user.first_name} ${user.last_name || ''}`
                            )
                          }
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                        >
                          <Unlock className="w-4 h-4 mr-1" />
                          Desbloquear
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Página {page} de {totalPages} • {filteredClients.length} clientes
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
          </div>
        )}
      </div>
    </div>
  )
}
