'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet, FileBarChart, Loader2 } from 'lucide-react'
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
      console.error('Error loading business:', e)
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
      console.error('Error loading filters:', e)
    }
  }

  const fetchData = async () => {
    try {
      setFetching(true)
      const offset = (page - 1) * limit
      const { data, error } = await supabase.rpc('get_appointments_list', {
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
      console.error('Error fetching appointments list:', e)
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
  }

  if (loading) {
    return (
      <div className="p-6">Cargando...</div>
    )
  }

  const statusOptions = ['pending','confirmed','in_progress','completed','cancelled','no_show']

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Listar citas</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white">
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase">Formato de Exportación</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600">
              <FileText className="w-4 h-4 mr-3 text-blue-600" />
              <span>CSV</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600">
              <FileSpreadsheet className="w-4 h-4 mr-3 text-green-600" />
              <span>Excel</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600">
              <FileBarChart className="w-4 h-4 mr-3 text-red-600" />
              <span>PDF</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Empleados (simple: uno) -> podemos cambiar a multi con UI custom si hace falta */}
          <div>
            <label className="text-sm text-gray-600">Empleado</label>
            <Select
              value={employeeIds.length === employees.length ? 'all' : (employeeIds[0] || 'all')}
              onValueChange={(val) => {
                if (val === 'all') setEmployeeIds(employees.map(e => e.id))
                else setEmployeeIds([val])
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el equipo</SelectItem>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Servicios (simple: uno) */}
          <div>
            <label className="text-sm text-gray-600">Servicio</label>
            <Select
              value={serviceIds.length === 0 ? 'all' : (serviceIds[0])}
              onValueChange={(val) => {
                if (val === 'all') setServiceIds([])
                else setServiceIds([val])
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado (simple: uno) */}
          <div>
            <label className="text-sm text-gray-600">Estado</label>
            <Select
              value={statuses.length === 0 ? 'all' : (statuses[0])}
              onValueChange={(val) => {
                if (val === 'all') setStatuses([])
                else setStatuses([val])
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {statusOptions.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Walk-in */}
          <div>
            <label className="text-sm text-gray-600">Tipo cliente</label>
            <Select value={walkinFilter} onValueChange={(v: any) => { setWalkinFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Todos</SelectItem>
                <SelectItem value="only">Solo Walk-in</SelectItem>
                <SelectItem value="exclude">Excluir Walk-in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fechas */}
          <div>
            <label className="text-sm text-gray-600">Desde</label>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Hasta</label>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
          </div>

          {/* Búsqueda */}
          <div className="md:col-span-3 lg:col-span-2">
            <label className="text-sm text-gray-600">Buscar (cliente/teléfono)</label>
            <Input placeholder="Ej: Juan, 099..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>

          {/* Orden */}
          <div>
            <label className="text-sm text-gray-600">Ordenar por</label>
            <Select value={sortBy} onValueChange={(v: any) => { setSortBy(v); setPage(1) }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
          <div>
            <label className="text-sm text-gray-600">Dirección</label>
            <Select value={sortDir} onValueChange={(v: any) => { setSortDir(v); setPage(1) }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascendente</SelectItem>
                <SelectItem value="desc">Descendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Limpiar */}
          <div className="md:col-span-3 lg:col-span-1 flex items-end">
            <Button variant="outline" onClick={() => { setEmployeeIds(employees.map(e => e.id)); setServiceIds([]); setStatuses([]); setDateFrom(''); setDateTo(''); setSearch(''); setWalkinFilter('any'); setSortBy('appointment_date,start_time'); setSortDir('asc'); setPage(1); }}>Limpiar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
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
              {fetching ? (
                <tr><td className="px-4 py-6" colSpan={7}>Cargando...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan={7}>Sin resultados</td></tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-2 whitespace-nowrap">{r.appointment_date}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{r.start_time?.substring(0,5)} - {r.end_time?.substring(0,5)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{r.client_name}</span>
                        {r.is_walk_in && <Badge variant="secondary">Walk-in</Badge>}
                      </div>
                      <div className="text-xs text-gray-500">{r.client_phone}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{r.employee_name}</td>
                    <td className="px-4 py-2 max-w-[280px]">
                      <div className="truncate" title={(r.service_names||[]).join(' • ')}>
                        {(r.service_names || []).join(' • ')}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Badge className="capitalize">{r.status.replace('_',' ')}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right">{
                      new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(r.total_price || 0))
                    }</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Mostrando {(rows.length > 0) ? ((page-1)*limit+1) : 0} - {Math.min(page*limit, totalCount)} de {totalCount}</div>
        <div className="flex items-center gap-2">
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm">{page} / {totalPages}</div>
          <Button variant="outline" disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
