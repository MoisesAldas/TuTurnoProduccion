'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet, FileBarChart, Loader2, Calendar, Users, Search as SearchIcon, RotateCcw, List as ListIcon, User, Clock, DollarSign, Briefcase, MoreVertical, Eye, Edit, Check, XCircle, AlertCircle, CreditCard, Building } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ExportDropdown, ExportFormat as UniversalExportFormat } from '@/components/ui/ExportDropdown'
import { DataTable } from '@/components/ui/data-table'
import AppointmentModal from '@/components/AppointmentModal'
import CreateAppointmentModal from '@/components/CreateAppointmentModal'
import AppointmentDetailModal from '@/components/AppointmentDetailModal'
import { parseDateString } from '@/lib/dateUtils'
import type { AppointmentExportRow } from '@/lib/export/appointments/types'
import { createColumns, type AppointmentTableCallbacks, type AppointmentRow } from './columns'
import { exportAppointmentsExcel } from '@/lib/export/appointments/appointmentsExcel'
import { generateAppointmentsPDF, exportAppointmentsPDF } from '@/lib/export/appointments/appointmentsPDF'
import { exportAppointmentsCSV } from '@/lib/export/appointments/appointmentsCSV'
import { PDFPreviewModal } from '@/components/pdf'
import jsPDF from 'jspdf'
// Modular cancellation components
import { handleBusinessCancellation, getBusinessOwnerId } from '@/lib/appointments/businessCancellationAdapter'
import { StatsCard } from '@/components/StatsCard'

import type { Employee, Service, Appointment } from '@/types/database'



export default function ListarPage() {
  const supabase = createClient()
  const { authState } = useAuth()
  const { toast } = useToast()

  const [businessId, setBusinessId] = useState<string>('')
  const [businessName, setBusinessName] = useState<string>('')

  // Filters
  const [employees, setEmployees] = useState<Pick<Employee, 'id' | 'first_name' | 'last_name'>[]>([])
  const [services, setServices] = useState<Pick<Service, 'id' | 'name'>[]>([])

  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [walkinFilter, setWalkinFilter] = useState<'any' | 'only' | 'exclude'>('any')
  const [search, setSearch] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('appointment_date,start_time')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [limit, setLimit] = useState<number>(25)
  const [page, setPage] = useState<number>(1)

  // Data
  const [rows, setRows] = useState<AppointmentRow[]>([])
  const totalCount = rows?.[0]?.total_count ?? 0
  const totalPages = useMemo(() => Math.max(1, Math.ceil((totalCount || 0) / limit)), [totalCount, limit])

  const [loading, setLoading] = useState<boolean>(true)
  const [fetching, setFetching] = useState<boolean>(false)

  // Appointment management
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // PDF Preview state
  const [showPDFPreview, setShowPDFPreview] = useState(false)
  const [pdfDocument, setPdfDocument] = useState<jsPDF | null>(null)
  useEffect(() => {
    if (authState.user) {
      loadBusiness()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.user?.id])

  useEffect(() => {
    if (businessId) {
      loadFilters()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  useEffect(() => {
    if (businessId) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, employeeIds.join(','), serviceIds.join(','), statuses.join(','), dateFrom, dateTo, walkinFilter, search, sortBy, sortDir, limit, page])

  const loadBusiness = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', authState.user!.id)
        .single()
      if (error) throw error
      setBusinessId(data!.id)
      setBusinessName(data!.name || '')
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información del negocio',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadFilters = async () => {
    try {
      const [{ data: emp, error: e1 }, { data: srv, error: e2 }] = await Promise.all([
        supabase
          .from('employees')
          .select('id, first_name, last_name')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('first_name'),
        supabase
          .from('services')
          .select('id, name')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('name')
      ])
      if (e1) throw e1
      if (e2) throw e2
      setEmployees(emp || [])
      setServices(srv || [])
      // default filters
      setEmployeeIds((emp || []).map(e => e.id))
      setStatuses(['pending','confirmed','in_progress'])
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los filtros',
        variant: 'destructive'
      })
    }
  }

  const fetchData = async () => {
    try {
      setFetching(true)
      const offset = (page - 1) * limit
      const { data, error } = await supabase.rpc('get_appointments_list_v2', {
        p_business_id: businessId,
        p_employee_ids: employeeIds.length ? employeeIds : null,
        p_service_ids: serviceIds.length ? serviceIds : null,
        p_statuses: statuses.length ? statuses : null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
        p_search: search.trim() || null,
        p_walkin_filter: walkinFilter,
        p_sort_by: sortBy,
        p_sort_dir: sortDir,
        p_limit: limit,
        p_offset: offset
      })
      if (error) throw error
      setRows((data as any) || [])
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las citas',
        variant: 'destructive'
      })
    } finally {
      setFetching(false)
    }
  }

  const fetchAllAppointments = async (): Promise<AppointmentRow[]> => {
    try {
      const { data, error } = await supabase.rpc('get_appointments_list_v2', {
        p_business_id: businessId,
        p_employee_ids: employeeIds.length ? employeeIds : null,
        p_service_ids: serviceIds.length ? serviceIds : null,
        p_statuses: statuses.length ? statuses : null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
        p_search: search.trim() || null,
        p_walkin_filter: walkinFilter,
        p_sort_by: sortBy,
        p_sort_dir: sortDir,
        p_limit: 999999, // Get all records
        p_offset: 0
      })
      if (error) throw error
      return (data as any) || []
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar todas las citas para exportar',
        variant: 'destructive'
      })
      return []
    }
  }

  const fetchFullAppointment = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          users!appointments_client_id_fkey(first_name, last_name, phone, avatar_url, email),
          business_clients(first_name, last_name, phone, email),
          employees(first_name, last_name, avatar_url, position),
          appointment_services(
            service_id,
            price,
            services(name, duration_minutes)
          )
        `)
        .eq('id', appointmentId)
        .single()

      if (error) throw error
      return data as Appointment
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información de la cita',
        variant: 'destructive'
      })
      return null
    }
  }


  const handleCloseModal = () => {
    setSelectedAppointment(null)
    setEditingAppointment(null)
  }

  const handleUpdateSuccess = () => {
    fetchData()
    setSelectedAppointment(null)
    setEditingAppointment(null)
  }

  const handleEditAppointment = () => {
    if (selectedAppointment) {
      setEditingAppointment(selectedAppointment)
      setSelectedAppointment(null)
    }
  }

  const handleExportCSV = async () => {
    const allRows = await fetchAllAppointments()
    if (allRows.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay citas para exportar',
        variant: 'destructive'
      })
      return
    }

    await exportAppointmentsCSV({
      data: allRows as AppointmentExportRow[]
    })

    toast({
      title: 'Exportación exitosa',
      description: `Se exportaron ${allRows.length} citas a CSV correctamente`
    })
  }

  const handleExportExcel = async () => {
    const allRows = await fetchAllAppointments()
    if (allRows.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay citas para exportar',
        variant: 'destructive'
      })
      return
    }

    await exportAppointmentsExcel({
      businessName,
      data: allRows as AppointmentExportRow[],
      dateFrom,
      dateTo
    })

    toast({
      title: 'Exportación exitosa',
      description: `Se exportaron ${allRows.length} citas a Excel correctamente`
    })
  }

  const handleExportPDF = async () => {
    const allRows = await fetchAllAppointments()
    if (allRows.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay citas para exportar',
        variant: 'destructive'
      })
      return
    }

    // Generate PDF and show preview
    const doc = generateAppointmentsPDF({
      businessName,
      data: allRows as AppointmentExportRow[],
      dateFrom,
      dateTo
    })
    
    setPdfDocument(doc)
    setShowPDFPreview(true)
  }

  const handlePDFDownload = () => {
    if (!pdfDocument) return

    try {
      const today = new Date()
      const ts = today.toISOString().split('T')[0]
      pdfDocument.save(`citas-${ts}.pdf`)
      
      toast({
        title: 'Descarga exitosa',
        description: 'El PDF de citas se descargó correctamente',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo descargar el PDF',
        variant: 'destructive',
      })
    }
  }

  // ============================================
  // CALLBACKS FOR TABLE ACTIONS (BEFORE EARLY RETURNS!)
  // ============================================

  const handleView = useCallback(async (id: string) => {
    const fullAppointment = await fetchFullAppointment(id)
    if (fullAppointment) {
      setSelectedAppointment(fullAppointment)
      setEditingAppointment(null)
    }
  }, [fetchFullAppointment])

  

  const handleEdit = useCallback(async (id: string) => {
    const fullAppointment = await fetchFullAppointment(id)
    if (fullAppointment) {
      setEditingAppointment(fullAppointment)
    }
  }, [fetchFullAppointment])

  const handleConfirm = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Cita confirmada',
        description: 'El estado se actualizó correctamente',
      })
      fetchData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo confirmar la cita',
        variant: 'destructive',
      })
    }
  }, [supabase, toast, fetchData])

  const handleInProgress = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'in_progress' })
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Estado actualizado',
        description: 'La cita está en progreso',
      })
      fetchData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      })
    }
  }, [supabase, toast, fetchData])

  const handleCheckout = useCallback(async (id: string) => {
    const fullAppointment = await fetchFullAppointment(id)
    if (fullAppointment) {
      setSelectedAppointment(fullAppointment)
      // Trigger checkout immediately
      setTimeout(() => {
        const checkoutBtn = document.querySelector('[data-checkout-trigger]') as HTMLButtonElement
        checkoutBtn?.click()
      }, 100)
    }
  }, [fetchFullAppointment])

  const handleNoShow = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'no_show' })
        .eq('id', id)

      if (error) throw error

      // Send no-show email
      try {
        await fetch('/api/send-no-show-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: id }),
        })
      } catch (e) {
        console.warn('Failed to send no-show email')
      }

      toast({
        title: 'Marcado como no asistió',
        description: 'El cliente no se presentó',
      })
      fetchData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      })
    }
  }, [supabase, toast, fetchData])

  const handleCancel = useCallback(async (id: string) => {
    try {
      // Get business owner ID
      const ownerId = await getBusinessOwnerId(businessId)
      if (!ownerId) {
        throw new Error('No se pudo obtener el ID del propietario del negocio')
      }

      // Use modular cancellation adapter
      await handleBusinessCancellation({
        appointmentId: id,
        businessOwnerId: ownerId,
        cancelReason: 'Cancelada por el negocio',
        onSuccess: () => {
          toast({
            title: 'Cita cancelada',
            description: 'La cita fue cancelada correctamente',
          })
          fetchData()
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'No se pudo cancelar la cita',
            variant: 'destructive',
          })
        }
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la cita',
        variant: 'destructive',
      })
    }
  }, [businessId, toast, fetchData])

  // Memoize callbacks object
  const callbacks: AppointmentTableCallbacks = useMemo(
    () => ({
      onView: handleView,
      onEdit: handleEdit,
      onConfirm: handleConfirm,
      onInProgress: handleInProgress,
      onCheckout: handleCheckout,
      onNoShow: handleNoShow,
      onCancel: handleCancel,
    }),
    [handleView, handleEdit, handleConfirm, handleInProgress, handleCheckout, handleNoShow, handleCancel]
  )

  // Memoize columns with callbacks
  const columns = useMemo(() => createColumns(callbacks), [callbacks])

  // Memoize statistics (must be before early returns)
  const stats = useMemo(() => {
    const total = totalCount
    const completed = rows.filter(r => r.status === 'completed').length
    const pending = rows.filter(r => ['pending', 'confirmed', 'in_progress'].includes(r.status)).length
    const totalRevenue = rows
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + Number(r.total_price || 0), 0)

    return { total, completed, pending, totalRevenue }
  }, [rows, totalCount])

  // Early return for loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-orange-100 dark:border-orange-900/30 rounded-[2rem]"></div>
            <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-[2rem] animate-spin shadow-[0_0_15px_rgba(234,88,12,0.2)]"></div>
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">
            Preparando Listado...
          </p>
        </div>
      </div>
    )
  }

  const statusOptions = ['pending','confirmed','in_progress','completed','cancelled','no_show']

  const statusConfig = {
    pending: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pendiente' },
    confirmed: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Confirmada' },
    in_progress: { className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'En Progreso' },
    completed: { className: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Completada' },
    cancelled: { className: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelada' },
    no_show: { className: 'bg-orange-100 text-orange-800 border-orange-200', label: 'No Asistió' },
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge className={`${config.className} border`}>{config.label}</Badge>
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('es-EC', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }


  return (
    <>
    <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950">
      {/* Premium Header - Integrated */}
      <div className="w-full px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative pl-6">
            <div className="absolute left-0 w-1.5 h-10 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(251,146,60,0.3)]" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-orange-600 mb-1">
                Gestión de Citas
              </span>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                Listado de Citas
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {businessName && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{businessName}</span>
              </div>
            )}
            
            <ExportDropdown
              onExport={async (format: UniversalExportFormat) => {
                if (format === 'excel') await handleExportExcel()
                else if (format === 'pdf') await handleExportPDF()
              }}
              filename={`citas-${new Date().toISOString().split('T')[0]}`}
              pdfTitle="Listado de Citas"
              className="h-11 px-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200"
              triggerLabel="Exportar Datos"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Citas"
            value={stats.total}
            description="Citas encontradas en este periodo"
            icon={Calendar}
            variant="blue"
          />
          <StatsCard
            title="Pendientes"
            value={stats.pending}
            description="Incluye confirmadas y en proceso"
            icon={Clock}
            variant="orange"
          />
          <StatsCard
            title="Completadas"
            value={stats.completed}
            description="Citas finalizadas con éxito"
            icon={Check}
            variant="green"
          />
          <StatsCard
            title="Ingresos Totales"
            value={formatPrice(stats.totalRevenue)}
            description="De las citas completadas"
            icon={DollarSign}
            variant="green"
          />
        </div>

        {/* Filtros Avanzados - Premium Card */}
        <Card className="border-0 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] dark:bg-gray-900 rounded-[2.5rem] overflow-hidden hover:shadow-xl transition-all duration-500">
          <CardHeader className="px-8 pt-8 pb-4">
            <div className="flex flex-col gap-1 relative pl-6">
              <div className="absolute left-0 w-1 h-8 bg-orange-500 rounded-full" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-orange-600">
                Personalización
              </span>
              <CardTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                Filtros Avanzados
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Empleado */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Empleado
                </label>
                <Select
                  value={employeeIds.length === employees.length ? 'all' : (employeeIds[0] || 'all')}
                  onValueChange={(val) => {
                    if (val === 'all') setEmployeeIds(employees.map(e => e.id))
                    else setEmployeeIds([val])
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 px-4 font-bold text-xs ring-offset-transparent focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    <SelectItem value="all">Todo el equipo</SelectItem>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Servicio */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Servicio
                </label>
                <Select
                  value={serviceIds.length === 0 ? 'all' : (serviceIds[0])}
                  onValueChange={(val) => {
                    if (val === 'all') setServiceIds([])
                    else setServiceIds([val])
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 px-4 font-bold text-xs focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    <SelectItem value="all">Todos los servicios</SelectItem>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Estado
                </label>
                <Select
                  value={statuses.length === 0 ? 'all' : (statuses[0])}
                  onValueChange={(val) => {
                    if (val === 'all') setStatuses([])
                    else setStatuses([val])
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 px-4 font-bold text-xs focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {statusOptions.map(s => (
                      <SelectItem key={s} value={s}>
                        {statusConfig[s as keyof typeof statusConfig]?.label || s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo cliente */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Tipo de Cliente
                </label>
                <Select value={walkinFilter} onValueChange={(v: any) => { setWalkinFilter(v); setPage(1) }}>
                  <SelectTrigger className="h-11 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 px-4 font-bold text-xs focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    <SelectItem value="any">Todos</SelectItem>
                    <SelectItem value="only">Solo Walk-in</SelectItem>
                    <SelectItem value="exclude">Excluir Walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha desde */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Desde
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                  className="h-11 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 px-4 font-bold text-xs focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                />
              </div>

              {/* Fecha hasta */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Hasta
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                  className="h-11 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 px-4 font-bold text-xs focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                />
              </div>

              {/* Búsqueda */}
              <div className="space-y-2 lg:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Buscar Cliente
                </label>
                <div className="relative group">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                  <Input
                    placeholder="Escribe nombre o teléfono..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    className="h-11 pl-11 pr-4 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 font-bold text-xs focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>

              {/* Ordenar por */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Ordenar por
                </label>
                <Select value={sortBy} onValueChange={(v: any) => { setSortBy(v); setPage(1) }}>
                  <SelectTrigger className="h-11 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 px-4 font-bold text-xs focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    <SelectItem value="appointment_date,start_time">Fecha y hora</SelectItem>
                    <SelectItem value="appointment_date">Fecha</SelectItem>
                    <SelectItem value="start_time">Hora</SelectItem>
                    <SelectItem value="status">Estado</SelectItem>
                    <SelectItem value="total_price">Precio</SelectItem>
                    <SelectItem value="employee_name">Empleado</SelectItem>
                    <SelectItem value="client_name">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Dirección
                </label>
                <Select value={sortDir} onValueChange={(v: any) => { setSortDir(v); setPage(1) }}>
                  <SelectTrigger className="h-11 rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 px-4 font-bold text-xs focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    <SelectItem value="asc">Ascendente</SelectItem>
                    <SelectItem value="desc">Descendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Limpiar filtros */}
              <div className="lg:col-span-2 flex items-end">
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 font-bold text-xs text-gray-500 hover:text-orange-600 hover:border-orange-100 hover:bg-orange-50/30 transition-all shadow-sm"
                  onClick={() => {
                    setEmployeeIds(employees.map(e => e.id))
                    setServiceIds([])
                    setStatuses([])
                    setDateFrom('')
                    setDateTo('')
                    setSearch('')
                    setWalkinFilter('any')
                    setSortBy('appointment_date,start_time')
                    setSortDir('asc')
                    setPage(1)
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Resultados - Master List */}
      <Card className="border-0 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] dark:bg-gray-900 rounded-[2.5rem] overflow-hidden hover:shadow-xl transition-all duration-500">
        <CardHeader className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1 relative pl-6">
              <div className="absolute left-0 w-1 h-8 bg-orange-500 rounded-full" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-orange-600">
                Listado
              </span>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Resultados</CardTitle>
                <div className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded-full">
                  <span className="text-[10px] font-black text-orange-600 dark:text-orange-400">
                    {totalCount} {totalCount === 1 ? 'cita' : 'citas'}
                  </span>
                </div>
              </div>
            </div>
            {fetching && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <Loader2 className="w-3.5 h-3.5 text-orange-600 animate-spin" />
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Sincronizando</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {fetching && rows.length === 0 ? (
            <div className="text-center py-24">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-orange-100 dark:border-orange-900/30 rounded-2xl"></div>
                <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-2xl animate-spin"></div>
              </div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Buscando citas...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-24 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-800/20">
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100 dark:border-gray-700">
                <Calendar className="w-10 h-10 text-orange-100 dark:text-orange-900" />
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">No se encontraron citas</h3>
              <p className="text-xs font-medium text-gray-500 max-w-[240px] mx-auto">
                Ajusta los filtros o intenta con términos de búsqueda diferentes.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block px-8 pb-8 pt-2">
                <DataTable
                  columns={columns}
                  data={rows}
                  manualPagination={true}
                />
              </div>


              {/* Mobile Cards - Premium Style */}
              <div className="lg:hidden px-6 pb-8 pt-2 space-y-4">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="group relative bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-xl hover:scale-[1.01] transition-all duration-300 overflow-hidden"
                  >
                    <div className="p-5 flex flex-col gap-4">
                      {/* Top row: Status and Action */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full animate-pulse ${
                            row.status === 'completed' ? 'bg-green-500' :
                            row.status === 'cancelled' ? 'bg-red-500' : 'bg-orange-500'
                          }`} />
                          {getStatusBadge(row.status)}
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-9 w-9 p-0 rounded-2xl bg-gray-50 dark:bg-gray-900 hover:bg-white transition-colors border border-transparent hover:border-gray-100 shadow-sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 p-2 rounded-[1.5rem] border-0 shadow-2xl">
                             <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones de Cita</DropdownMenuLabel>
                             <DropdownMenuSeparator className="bg-gray-50" />
                             
                             <DropdownMenuItem onClick={() => handleView(row.id)} className="rounded-xl p-3 cursor-pointer group focus:bg-blue-50">
                               <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-all">
                                   <Eye className="w-5 h-5 text-blue-600" />
                                 </div>
                                 <span className="font-bold text-sm">Ver Detalles</span>
                               </div>
                             </DropdownMenuItem>

                             {row.status !== 'completed' && row.status !== 'cancelled' && (
                               <DropdownMenuItem onClick={() => handleEdit(row.id)} className="rounded-xl p-3 cursor-pointer group focus:bg-orange-50">
                                 <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-all">
                                     <Edit className="w-5 h-5 text-orange-600" />
                                   </div>
                                   <span className="font-bold text-sm">Editar Cita</span>
                                 </div>
                               </DropdownMenuItem>
                             )}

                             {['confirmed', 'in_progress'].includes(row.status) && (
                               <DropdownMenuItem onClick={() => handleCheckout(row.id)} className="rounded-xl p-3 cursor-pointer group focus:bg-green-50">
                                 <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-all">
                                     <CreditCard className="w-5 h-5 text-green-600" />
                                   </div>
                                   <span className="font-bold text-sm">Finalizar y Cobrar</span>
                                 </div>
                               </DropdownMenuItem>
                             )}

                             {row.status === 'pending' && (
                               <DropdownMenuItem onClick={() => handleConfirm(row.id)} className="rounded-xl p-3 cursor-pointer group focus:bg-green-50">
                                 <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-all">
                                     <Check className="w-5 h-5 text-green-600" />
                                   </div>
                                   <span className="font-bold text-sm text-green-600">Confirmar Cita</span>
                                 </div>
                               </DropdownMenuItem>
                             )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Client Info */}
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl flex items-center justify-center shadow-inner border border-white dark:border-gray-700">
                          <User className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white truncate">
                            {row.client_name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 group-hover:text-orange-500 transition-colors uppercase tracking-widest">{row.client_phone}</span>
                            {row.is_walk_in && (
                              <div className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-md">
                                <span className="text-[8px] font-black uppercase tracking-tighter text-gray-500">Walk-in</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Details Strip */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                          <Calendar className="w-3.5 h-3.5 text-orange-600" />
                          <span className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-300">{formatDate(row.appointment_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-300">{row.start_time?.substring(0,5)}</span>
                        </div>
                      </div>

                      {/* Services Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-orange-100 border-2 border-white dark:border-gray-800 flex items-center justify-center z-10 shadow-sm">
                            <Briefcase className="w-3.5 h-3.5 text-orange-600" />
                          </div>
                          <div className="px-3 h-8 bg-gray-50 dark:bg-gray-900 rounded-r-full flex items-center pl-4 border border-l-0 border-gray-100 dark:border-gray-800">
                            <span className="text-[10px] font-bold text-gray-500 truncate max-w-[120px]">
                              {(row.service_names || []).join(', ')}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Total</span>
                          <span className="text-base font-black text-gray-900 dark:text-white">{formatPrice(Number(row.total_price || 0))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Premium Pagination Bar */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl p-4 px-8 rounded-[2rem] border border-white/20 dark:border-gray-800 shadow-[0_10px_40px_rgba(0,0,0,0.04)] mt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
              Mostrando <span className="text-gray-900 dark:text-white">{(page-1)*limit+1} - {Math.min(page*limit, totalCount)}</span> de <span className="text-gray-900 dark:text-white">{totalCount}</span>
            </div>
            
            <div className="flex items-center gap-2 h-9 px-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Página</span>
              <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
                <SelectTrigger className="w-[60px] h-7 border-0 bg-transparent p-0 font-bold text-xs ring-0 ring-offset-0 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-0 shadow-xl">
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="w-10 h-10 p-0 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:text-orange-600 transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </Button>

            <div className="px-5 h-10 flex items-center justify-center bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm min-w-[100px]">
              <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase mr-1">Pág.</span>
              <span className="text-sm font-black text-gray-900 dark:text-white">{page} <span className="text-gray-300 font-normal">/</span> {totalPages}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="w-10 h-10 p-0 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:text-orange-600 transition-all shadow-sm"
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          </div>
        </div>
      )}

      {/* AppointmentModal - solo si no está editando */}
      {selectedAppointment && !editingAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={handleCloseModal}
          onUpdate={handleUpdateSuccess}
          onEdit={handleEditAppointment}
        />
      )}

      {/* CreateAppointmentModal for editing - solo si está editando */}
      {editingAppointment && businessId && (
        <CreateAppointmentModal
          businessId={businessId}
          selectedDate={parseDateString(editingAppointment.appointment_date)}
          appointment={editingAppointment}
          onClose={handleCloseModal}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {/* AppointmentDetailModal - solo cuando está abierto */}
      {detailModalOpen && (
        <AppointmentDetailModal
          appointment={detailAppointment}
          clientName={detailAppointment?.walk_in_client_name}
          clientPhone={detailAppointment?.walk_in_client_phone}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
        />
      )}

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => {
          setShowPDFPreview(false)
          setPdfDocument(null)
        }}
        pdfDocument={pdfDocument}
        filename="citas"
        onDownload={handlePDFDownload}
        title="Previsualización de Citas"
      />
      </div>
      </div>
    </>
  )
}
