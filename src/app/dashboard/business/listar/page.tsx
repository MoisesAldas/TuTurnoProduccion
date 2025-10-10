'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet, FileBarChart, Loader2, Calendar, Users, Search as SearchIcon, RotateCcw, List as ListIcon, User, Clock, DollarSign, Briefcase } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import type { Employee, Service } from '@/types/database'

type AppointmentRow = {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  total_price: number
  employee_id: string | null
  employee_name: string | null
  client_id: string | null
  client_name: string | null
  client_phone: string | null
  is_walk_in: boolean
  service_names: string[] | null
  total_count: number
}

export default function ListarPage() {
  const supabase = createClient()
  const { authState } = useAuth()
  const { toast } = useToast()

  const [businessId, setBusinessId] = useState<string>('')

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
        .select('id')
        .eq('owner_id', authState.user!.id)
        .single()
      if (error) throw error
      setBusinessId(data!.id)
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

  const handleExportCSV = () => {
    const header = ['Fecha','Hora Inicio','Hora Fin','Estado','Precio','Empleado','Cliente','Teléfono','Walk-in','Servicios']
    const lines = rows.map(r => [
      r.appointment_date,
      r.start_time?.substring(0,5),
      r.end_time?.substring(0,5),
      r.status,
      r.total_price,
      r.employee_name ?? '',
      r.client_name ?? '',
      r.client_phone ?? '',
      r.is_walk_in ? 'Sí' : 'No',
      (r.service_names || []).join(' | ')
    ])
    const csv = [header, ...lines].map(cols => cols.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'citas.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: 'Exportación exitosa',
      description: 'El archivo CSV se ha descargado correctamente'
    })
  }

  const handleExportExcel = () => {
    const data = [
      ['Fecha','Hora Inicio','Hora Fin','Estado','Precio','Empleado','Cliente','Teléfono','Walk-in','Servicios'],
      ...rows.map(r => [
        r.appointment_date,
        r.start_time?.substring(0,5),
        r.end_time?.substring(0,5),
        r.status,
        Number(r.total_price || 0),
        r.employee_name ?? '',
        r.client_name ?? '',
        r.client_phone ?? '',
        r.is_walk_in ? 'Sí' : 'No',
        (r.service_names || []).join(' | ')
      ])
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 8 }, { wch: 40 }
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Citas')
    const ts = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `citas-${ts}.xlsx`)
    toast({
      title: 'Exportación exitosa',
      description: 'El archivo Excel se ha descargado correctamente'
    })
  }

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4')
    doc.setFontSize(14)
    doc.text('Listado de Citas', 14, 12)
    const period = (dateFrom && dateTo) ? `Período: ${dateFrom} a ${dateTo}` : ''
    if (period) { doc.setFontSize(10); doc.text(period, 14, 18) }

    autoTable(doc, {
      startY: 22,
      head: [[ 'Fecha','Inicio','Fin','Estado','Precio','Empleado','Cliente','Teléfono','Walk-in','Servicios' ]],
      body: rows.map(r => [
        r.appointment_date,
        r.start_time?.substring(0,5),
        r.end_time?.substring(0,5),
        r.status.replace('_',' '),
        new Intl.NumberFormat('es-EC',{ style:'currency', currency:'USD' }).format(Number(r.total_price||0)),
        r.employee_name ?? '',
        r.client_name ?? '',
        r.client_phone ?? '',
        r.is_walk_in ? 'Sí' : 'No',
        (r.service_names || []).join(' • ')
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [234,88,12], textColor: 255 },
      columnStyles: { 9: { cellWidth: 70 } },
      theme: 'striped',
      margin: { left: 10, right: 10 }
    })

    const ts = new Date().toISOString().split('T')[0]
    doc.save(`citas-${ts}.pdf`)
    toast({
      title: 'Exportación exitosa',
      description: 'El archivo PDF se ha descargado correctamente'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  const statusOptions = ['pending','confirmed','in_progress','completed','cancelled','no_show']

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pendiente' },
      confirmed: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Confirmada' },
      in_progress: { className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'En Progreso' },
      completed: { className: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Completada' },
      cancelled: { className: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelada' },
      no_show: { className: 'bg-orange-100 text-orange-800 border-orange-200', label: 'No Asistió' },
    }
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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Listado de Citas</h1>
          <p className="text-sm text-gray-600 mt-1">Consulta, filtra y exporta tus citas</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase">
              Formato de Exportación
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
              <FileText className="w-4 h-4 mr-3 text-blue-600" />
              <span>Exportar como CSV</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 mr-3 text-green-600" />
              <span>Exportar como Excel</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
              <FileBarChart className="w-4 h-4 mr-3 text-red-600" />
              <span>Exportar como PDF</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filtros */}
      <Card className="overflow-hidden border-gray-200 hover:shadow-lg transition-shadow">
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <SearchIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl font-semibold">Filtros Avanzados</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Personaliza tu búsqueda de citas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Empleado */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-orange-600" />
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el equipo</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Servicio */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-orange-600" />
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los servicios</SelectItem>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <ListIcon className="w-4 h-4 text-orange-600" />
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {statusOptions.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace('_',' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo cliente */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <User className="w-4 h-4 text-orange-600" />
                Tipo de Cliente
              </label>
              <Select value={walkinFilter} onValueChange={(v: any) => { setWalkinFilter(v); setPage(1) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Todos</SelectItem>
                  <SelectItem value="only">Solo Walk-in</SelectItem>
                  <SelectItem value="exclude">Excluir Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha desde */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-600" />
                Desde
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                className="w-full"
              />
            </div>

            {/* Fecha hasta */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-600" />
                Hasta
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                className="w-full"
              />
            </div>

            {/* Búsqueda */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <SearchIcon className="w-4 h-4 text-orange-600" />
                Buscar Cliente
              </label>
              <Input
                placeholder="Nombre o teléfono..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full"
              />
            </div>

            {/* Ordenar por */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Ordenar por</label>
              <Select value={sortBy} onValueChange={(v: any) => { setSortBy(v); setPage(1) }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              <label className="text-sm font-medium text-gray-700">Dirección</label>
              <Select value={sortDir} onValueChange={(v: any) => { setSortDir(v); setPage(1) }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascendente</SelectItem>
                  <SelectItem value="desc">Descendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limpiar filtros */}
            <div className="sm:col-span-2 flex items-end">
              <Button
                variant="outline"
                className="w-full hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors"
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

      {/* Resultados */}
      <Card className="overflow-hidden border-gray-200 hover:shadow-lg transition-shadow">
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-semibold">Resultados</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {totalCount} {totalCount === 1 ? 'cita encontrada' : 'citas encontradas'}
                </CardDescription>
              </div>
            </div>
            {fetching && (
              <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {fetching && rows.length === 0 ? (
            <div className="text-center py-16">
              <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando citas...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-b from-gray-50 to-white">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Calendar className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay citas</h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                No se encontraron citas con los filtros seleccionados. Intenta ajustar los criterios de búsqueda.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left">Fecha</th>
                      <th className="px-4 py-2 text-left">Hora</th>
                      <th className="px-4 py-2 text-left">Cliente</th>
                      <th className="px-4 py-2 text-left">Empleado</th>
                      <th className="px-4 py-2 text-left">Servicios</th>
                      <th className="px-4 py-2 text-left">Estado</th>
                      <th className="px-4 py-2 text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b">
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900">{formatDate(row.appointment_date)}</div>
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {row.start_time?.substring(0,5)} - {row.end_time?.substring(0,5)}
                        </td>
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900">{row.client_name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            {row.client_phone}
                            {row.is_walk_in && (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-xs">Walk-in</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{row.employee_name}</td>
                        <td className="px-4 py-2 text-gray-600 max-w-xs">
                          <div className="truncate" title={(row.service_names || []).join(', ')}>
                            {(row.service_names || []).join(', ')}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {getStatusBadge(row.status)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">
                          {formatPrice(Number(row.total_price || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-200">
                {rows.map((row) => (
                  <div key={row.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-gray-900">{row.client_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{row.client_phone}</div>
                      </div>
                      {getStatusBadge(row.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <span>{formatDate(row.appointment_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span>{row.start_time?.substring(0,5)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4 text-orange-600" />
                        <span className="truncate">{row.employee_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="w-4 h-4 text-orange-600" />
                        <span className="font-medium text-gray-900">{formatPrice(Number(row.total_price || 0))}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <Briefcase className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{(row.service_names || []).join(', ')}</span>
                      </div>
                    </div>

                    {row.is_walk_in && (
                      <div className="mt-2">
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-xs">Walk-in</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-medium text-gray-900">{(page-1)*limit+1}</span> a{' '}
            <span className="font-medium text-gray-900">{Math.min(page*limit, totalCount)}</span> de{' '}
            <span className="font-medium text-gray-900">{totalCount}</span> resultados
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Por página:</span>
              <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="px-4 py-1.5 text-sm font-medium text-gray-700">
                {page} / {totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
