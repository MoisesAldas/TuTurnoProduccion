'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
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
  User,
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

      {/* Filters - Premium Style */}
      <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] p-4 border-0">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 group">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-all group-focus-within:text-orange-500 group-focus-within:scale-110" />
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 bg-gray-50/50 dark:bg-gray-800/30 border-0 rounded-2xl h-11 focus-visible:ring-1 focus-visible:ring-orange-500/30 transition-all"
              />
            </div>
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(v: 'all' | 'active' | 'blocked') => setStatusFilter(v)}
          >
            <SelectTrigger className="w-full lg:w-[180px] rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 border-0 h-11 focus:ring-1 focus:ring-orange-500/30 font-semibold text-xs transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-gray-100 dark:border-gray-800 shadow-xl">
              <SelectItem value="all" className="rounded-xl">Todos los estados</SelectItem>
              <SelectItem value="active" className="rounded-xl">Solo Activos</SelectItem>
              <SelectItem value="blocked" className="rounded-xl">Solo Bloqueados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clients Grid - Premium Style */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Cargando registrados...</p>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-[2.5rem] p-12 text-center border-0 shadow-sm">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-50 mb-2">Sin Clientes</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {search || statusFilter !== 'all'
                ? 'No se encontraron clientes con los filtros aplicados'
                : 'No hay clientes registrados en la plataforma aún'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedClients.map((user) => (
                <Card
                  key={user.id}
                  className={`
                    overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] dark:bg-gray-900 rounded-[2.25rem] hover:shadow-xl transition-all duration-300 group flex flex-col
                    ${user.is_blocked ? 'opacity-75 grayscale-[0.5]' : ''}
                  `}
                >
                  <CardHeader className="pb-3 pt-5 px-6 bg-gradient-to-br from-blue-50/50 via-transparent to-transparent dark:from-blue-900/5 dark:via-transparent dark:to-transparent relative">
                    {/* Vertical Accent */}
                    <div className={`absolute left-0 top-6 w-1.5 h-8 bg-gradient-to-b ${user.is_blocked ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600'} rounded-full shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-transform group-hover:scale-y-110`} />
                    
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <Avatar className="w-11 h-11 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-[1rem] flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                          <AvatarImage src={user.avatar_url || undefined} className="object-cover" />
                          <AvatarFallback className="bg-transparent text-blue-600 dark:text-blue-400 font-bold">
                            {user.first_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-blue-600 dark:text-blue-500 mb-0.5 truncate">
                            Usuario Global
                          </p>
                          <h3 className="text-sm font-black tracking-tight text-gray-900 dark:text-gray-50 truncate">
                            {user.first_name} {user.last_name || ''}
                          </h3>
                        </div>
                      </div>
                      <Badge
                        variant={user.is_blocked ? "destructive" : "default"}
                        className={user.is_blocked
                          ? 'bg-red-100 text-red-700 border-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold dark:bg-red-900/40 dark:text-red-400 flex-shrink-0'
                          : 'bg-emerald-100 text-emerald-700 border-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold dark:bg-emerald-900/40 dark:text-emerald-400 flex-shrink-0'
                        }
                      >
                        {user.is_blocked ? '● Bloqueado' : '● Activo'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-1 pb-5 px-6 flex-1 flex flex-col">
                    <div className="space-y-2">
                      {user.email && (
                        <div className="flex items-center gap-2.5 p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl min-w-0 border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 transition-colors">
                          <div className="w-7 h-7 rounded-lg bg-purple-100/50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                            <Mail className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate" title={user.email}>{user.email}</span>
                        </div>
                      )}
                      {user.phone && (
                        <div className="flex items-center gap-2.5 p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl min-w-0 border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 transition-colors">
                          <div className="w-7 h-7 rounded-lg bg-blue-100/50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{user.phone}</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between gap-1 p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-transparent hover:border-orange-100 dark:hover:border-orange-900/30 transition-colors">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Citas</span>
                          </div>
                          <span className="text-xs font-black text-orange-600 dark:text-orange-400">{user.appointment_count || 0}</span>
                        </div>
                        <div className="flex items-center justify-between gap-1 p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-transparent hover:border-red-100 dark:hover:border-red-900/30 transition-colors">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Canc.</span>
                          </div>
                          <span className="text-xs font-black text-red-600 dark:text-red-400">{user.current_month_cancellations || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 mt-auto">
                      {user.is_blocked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onUnblockClient(user.id, `${user.first_name} ${user.last_name || ''}`)}
                          className="w-full rounded-xl border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-[11px] h-9 transition-all"
                        >
                          <Unlock className="w-3 h-3 mr-1.5" />
                          Desbloquear
                        </Button>
                      ) : (
                        <div className="text-[10px] text-center font-bold text-gray-400 uppercase tracking-widest py-2">
                          Usuario Activo
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination - Premium Style */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">
                  Página {page} de {totalPages} <span className="mx-2 opacity-30">|</span> {filteredClients.length} clientes
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-xl h-9 w-9 p-0 border-gray-200 dark:border-gray-800 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-xl h-9 w-9 p-0 border-gray-200 dark:border-gray-800 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"
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
