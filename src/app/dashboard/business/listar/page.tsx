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
import { ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet, FileBarChart, Loader2, Calendar, Users, Search as SearchIcon, RotateCcw, List as ListIcon, User, Clock, DollarSign, Briefcase, MoreVertical, Eye, Edit, Check, XCircle, AlertCircle, CreditCard, Building, CheckCircle2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import AppointmentModal from '@/components/AppointmentModal'
import CreateAppointmentModal from '@/components/CreateAppointmentModal'
import { parseDateString } from '@/lib/dateUtils'
import { createColumns, type AppointmentTableCallbacks } from './columns'
import { DataTable } from '@/components/ui/data-table'

import type { Employee, Service, Appointment } from '@/types/database'

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

  const fetchFullAppointment = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          users(first_name, last_name, phone, avatar_url, email),
          employees(first_name, last_name),
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

  const handleRowClick = async (appointmentId: string) => {
    const fullAppointment = await fetchFullAppointment(appointmentId)
    if (fullAppointment) {
      setSelectedAppointment(fullAppointment)
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

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Citas')

    const today = new Date()
    const dateStr = today.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Calcular totales - solo citas completadas generan ingresos
    const totalRevenue = rows
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + Number(r.total_price || 0), 0)
    const totalAppointments = totalCount

    // Período de fechas (si aplica)
    const period = (dateFrom && dateTo)
      ? `${new Date(dateFrom + 'T00:00:00').toLocaleDateString('es-ES')} - ${new Date(dateTo + 'T00:00:00').toLocaleDateString('es-ES')}`
      : 'Todas las fechas'

    // ========================================
    // TÍTULO PRINCIPAL (Fila 1)
    // ========================================
    worksheet.mergeCells('A1:J1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'LISTADO DE CITAS'
    titleCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEA580C' } // orange-600
    }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getRow(1).height = 30

    // ========================================
    // METADATA (Filas 2-5)
    // ========================================
    const metadataRows = [
      `Generado el: ${dateStr}`,
      `Período: ${period}`,
      `Total de citas: ${totalAppointments}`,
      `Ingresos totales (solo completadas): $${totalRevenue.toFixed(2)}`
    ]

    metadataRows.forEach((text, index) => {
      const rowNum = index + 2
      worksheet.mergeCells(`A${rowNum}:J${rowNum}`)
      const cell = worksheet.getCell(`A${rowNum}`)
      cell.value = text
      cell.font = { bold: true, size: 11, color: { argb: 'FF78350F' } } // amber-900
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFBBF24' } // amber-400
      }
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
      worksheet.getRow(rowNum).height = 20
    })

    // Línea vacía (Fila 6)
    worksheet.getRow(6).height = 5

    // ========================================
    // HEADERS DE COLUMNAS (Fila 7)
    // ========================================
    const headers = ['Fecha', 'Hora Inicio', 'Hora Fin', 'Estado', 'Precio', 'Empleado', 'Cliente', 'Teléfono', 'Walk-in', 'Servicios']
    const headerRow = worksheet.getRow(7)
    headerRow.values = headers
    headerRow.height = 25

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEA580C' } // orange-600
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD97706' } },
        bottom: { style: 'thin', color: { argb: 'FFD97706' } },
        left: { style: 'thin', color: { argb: 'FFD97706' } },
        right: { style: 'thin', color: { argb: 'FFD97706' } }
      }
    })

    // ========================================
    // DATOS (Desde fila 8)
    // ========================================
    rows.forEach((row, index) => {
      const rowNum = index + 8
      const dataRow = worksheet.getRow(rowNum)

      dataRow.values = [
        new Date(row.appointment_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        row.start_time?.substring(0,5) || '-',
        row.end_time?.substring(0,5) || '-',
        row.status.replace('_', ' '),
        Number(row.total_price || 0),
        row.employee_name || '-',
        row.client_name || '-',
        row.client_phone || '-',
        row.is_walk_in ? 'Sí' : 'No',
        (row.service_names || []).join(' | ') || '-'
      ]

      // Estilo alternado para filas
      const isEven = index % 2 === 0
      const fillColor = isEven ? 'FFFFFBEB' : 'FFFFFFFF' // amber-50 : white

      dataRow.eachCell((cell, colNum) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        }
        cell.alignment = { vertical: 'middle' }

        // Formato especial para precio (columna 5)
        if (colNum === 5) {
          cell.numFmt = '"$"#,##0.00'
          cell.alignment = { horizontal: 'right', vertical: 'middle' }
        }

        // Centrar Walk-in (columna 9)
        if (colNum === 9) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
      })
    })

    // ========================================
    // CONFIGURAR ANCHOS DE COLUMNAS
    // ========================================
    worksheet.columns = [
      { width: 12 },  // Fecha
      { width: 10 },  // Hora Inicio
      { width: 10 },  // Hora Fin
      { width: 14 },  // Estado
      { width: 12 },  // Precio
      { width: 22 },  // Empleado
      { width: 22 },  // Cliente
      { width: 15 },  // Teléfono
      { width: 10 },  // Walk-in
      { width: 45 }   // Servicios
    ]

    // ========================================
    // EXPORTAR ARCHIVO
    // ========================================
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ts = today.toISOString().split('T')[0]
    a.download = `citas-${ts}.xlsx`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Exportación exitosa',
      description: 'El archivo Excel se ha descargado correctamente'
    })
  }

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height

    // ========================================
    // PROFESSIONAL HEADER - Orange Gradient
    // ========================================
    doc.setFillColor(234, 88, 12) // orange-600
    doc.rect(0, 0, pageWidth, 35, 'F')

    // Title in white
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('LISTADO DE CITAS', 15, 15)

    // Subtitle
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const today = new Date()
    const dateStr = today.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    doc.text(`Generado el ${dateStr}`, 15, 25)

    // ========================================
    // AMBER INFO BAR - Metadata
    // ========================================
    doc.setFillColor(251, 191, 36) // amber-400
    doc.rect(0, 35, pageWidth, 12, 'F')

    doc.setTextColor(120, 53, 15) // amber-900
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')

    // Calculate totals - solo citas completadas generan ingresos
    const totalRevenue = rows
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + Number(r.total_price || 0), 0)
    const totalAppointments = totalCount

    // Period
    const period = (dateFrom && dateTo)
      ? `${new Date(dateFrom + 'T00:00:00').toLocaleDateString('es-ES')} - ${new Date(dateTo + 'T00:00:00').toLocaleDateString('es-ES')}`
      : 'Todas las fechas'

    // Active filters summary
    const filtersSummary = []
    if (statuses.length > 0 && statuses.length < 6) {
      filtersSummary.push(`Estados: ${statuses.map(s => s.replace('_', ' ')).join(', ')}`)
    }
    if (walkinFilter !== 'any') {
      filtersSummary.push(walkinFilter === 'only' ? 'Solo Walk-in' : 'Sin Walk-in')
    }

    const infoText = `Período: ${period}  |  Total de citas: ${totalAppointments}  |  Ingresos totales: $${totalRevenue.toFixed(2)}`
    doc.text(infoText, 15, 42)

    // ========================================
    // PROFESSIONAL TABLE
    // ========================================
    autoTable(doc, {
      startY: 52,
      head: [[
        'Fecha',
        'Inicio',
        'Fin',
        'Estado',
        'Precio',
        'Empleado',
        'Cliente',
        'Teléfono',
        'Walk-in',
        'Servicios'
      ]],
      body: rows.map(r => [
        new Date(r.appointment_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        r.start_time?.substring(0,5) || '-',
        r.end_time?.substring(0,5) || '-',
        r.status.replace('_',' '),
        new Intl.NumberFormat('es-EC',{ style:'currency', currency:'USD' }).format(Number(r.total_price||0)),
        r.employee_name || '-',
        r.client_name || '-',
        r.client_phone || '-',
        r.is_walk_in ? 'Sí' : 'No',
        (r.service_names || []).join(' • ') || '-'
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: [234, 88, 12], // orange-600
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [255, 251, 235] // amber-50
      },
      columnStyles: {
        0: { cellWidth: 24 },  // Fecha
        1: { cellWidth: 15 },  // Inicio
        2: { cellWidth: 15 },  // Fin
        3: { cellWidth: 22 },  // Estado
        4: { cellWidth: 20, halign: 'right' },  // Precio
        5: { cellWidth: 30 },  // Empleado
        6: { cellWidth: 30 },  // Cliente
        7: { cellWidth: 24 },  // Teléfono
        8: { cellWidth: 16, halign: 'center' },  // Walk-in
        9: { cellWidth: 50 }   // Servicios
      },
      margin: { left: 10, right: 10 },

      // Color-code appointment states
      didDrawCell: (data) => {
        if (data.column.index === 3 && data.cell.section === 'body') {
          const status = data.cell.raw as string

          // Map status to colors
          const statusColors: Record<string, [number, number, number]> = {
            'pending': [234, 179, 8],      // yellow-600
            'confirmed': [22, 163, 74],    // green-600
            'in progress': [37, 99, 235],  // blue-600
            'completed': [107, 114, 128],  // gray-500
            'cancelled': [220, 38, 38],    // red-600
            'no show': [234, 88, 12]       // orange-600
          }

          const color = statusColors[status.toLowerCase()] || [107, 114, 128]
          doc.setTextColor(color[0], color[1], color[2])
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
        }
      }
    })

    // ========================================
    // FOOTER - Page numbers and decorative line
    // ========================================
    const totalPages = (doc as any).internal.pages.length - 1

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)

      // Orange decorative line
      doc.setDrawColor(234, 88, 12) // orange-600
      doc.setLineWidth(0.5)
      doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15)

      // Page numbers
      doc.setTextColor(107, 114, 128) // gray-500
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )

      // Generated by TuTurno
      doc.setFontSize(8)
      doc.setTextColor(156, 163, 175) // gray-400
      doc.text(
        'Generado por TuTurno',
        pageWidth - 15,
        pageHeight - 10,
        { align: 'right' }
      )
    }

    const ts = new Date().toISOString().split('T')[0]
    doc.save(`citas-${ts}.pdf`)

    toast({
      title: 'Exportación exitosa',
      description: 'El archivo PDF se ha descargado correctamente'
    })
  }

  // ============================================
  // CALLBACKS FOR TABLE ACTIONS (BEFORE EARLY RETURNS!)
  // ============================================

  const handleView = useCallback(async (id: string) => {
    const fullAppointment = await fetchFullAppointment(id)
    if (fullAppointment) {
      setSelectedAppointment(fullAppointment)
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
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id)

      if (error) throw error

      // Send cancellation email
      try {
        await fetch('/api/send-cancellation-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: id,
            cancellationReason: 'Cancelada por el negocio',
          }),
        })
      } catch (e) {
        console.warn('Failed to send cancellation email')
      }

      toast({
        title: 'Cita cancelada',
        description: 'La cita fue cancelada correctamente',
      })
      fetchData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la cita',
        variant: 'destructive',
      })
    }
  }, [supabase, toast, fetchData])

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Sticky Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Título */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">
                Listado de Citas
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Consulta, filtra y exporta tus citas
              </p>
            </div>

            {/* Badge + Exportar */}
            <div className="flex items-center gap-2 sm:gap-3">
              {businessName && (
                <Badge className="hidden sm:flex bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800">
                  <Building className="w-4 h-4 mr-2" />
                  {businessName}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 dark:hover:bg-orange-900/50 dark:hover:text-orange-400 dark:hover:border-orange-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 animate-in slide-in-from-top-2 duration-200">
                  <DropdownMenuLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Formato de Exportación
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* CSV Option */}
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors">
                <FileText className="w-4 h-4 mr-3 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium">CSV</p>
                  <p className="text-xs text-gray-500">Valores separados por comas</p>
                </div>
              </DropdownMenuItem>

              {/* Excel Option */}
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors">
                <FileSpreadsheet className="w-4 h-4 mr-3 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium">Excel</p>
                  <p className="text-xs text-gray-500">Hoja de cálculo con múltiples pestañas</p>
                </div>
              </DropdownMenuItem>

              {/* PDF Option */}
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors">
                <FileBarChart className="w-4 h-4 mr-3 text-red-600" />
                <div className="flex-1">
                  <p className="font-medium">PDF</p>
                  <p className="text-xs text-gray-500">Reporte profesional con tablas</p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <div className="px-2 py-1.5 text-xs text-gray-400 text-center">
                Los datos se descargarán automáticamente
              </div>
            </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Appointments */}
          <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Citas
                </CardTitle>
                <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {stats.total}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Todas las citas
              </p>
            </CardContent>
          </Card>

          {/* Completed Appointments */}
          <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Completadas
                </CardTitle>
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {stats.completed}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Finalizadas exitosamente
              </p>
            </CardContent>
          </Card>

          {/* Pending Appointments */}
          <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pendientes
                </CardTitle>
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900 dark:to-amber-900 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {stats.pending}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Por confirmar/completar
              </p>
            </CardContent>
          </Card>

          {/* Total Revenue (Only completed) */}
          <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Ingresos Totales
                </CardTitle>
                <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                ${stats.totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Solo citas completadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/20 dark:via-amber-900/20 dark:to-yellow-900/20 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10  bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center justify-center shadow-md">
                <SearchIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-50">Filtros Avanzados</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Personaliza tu búsqueda de citas</CardDescription>
              </div>
            </div>
          </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Empleado */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
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
      <Card className="overflow-hidden border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10  bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center justify-center shadow-md">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Resultados</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-600">
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
              {/* Desktop Table - DataTable Component */}
              <div className="hidden lg:block p-6">
                <DataTable
                  columns={columns}
                  data={rows}
                  manualPagination={true}
                />
              </div>


              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3 p-3">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="p-4 bg-gradient-to-br from-orange-50/50 via-amber-50/30 to-transparent border-b border-gray-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-orange-600 flex-shrink-0" />
                            <h3 className="font-semibold text-gray-900 truncate">{row.client_name}</h3>
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <span className="font-mono">{row.client_phone}</span>
                            {row.is_walk_in && (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-[10px] px-1.5 py-0">
                                Walk-in
                              </Badge>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {getStatusBadge(row.status)}

                          {/* Mobile Actions Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase">
                                Acciones
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {/* Ver detalles */}
                              <DropdownMenuItem
                                onClick={() => handleRowClick(row.id)}
                                className="cursor-pointer"
                              >
                                <Eye className="w-4 h-4 mr-2 text-blue-600" />
                                <span>Ver detalles</span>
                              </DropdownMenuItem>

                              {/* Editar */}
                              {row.status !== 'completed' && row.status !== 'cancelled' && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    const apt = await fetchFullAppointment(row.id)
                                    if (apt) setEditingAppointment(apt)
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Edit className="w-4 h-4 mr-2 text-orange-600" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {/* Finalizar y Cobrar */}
                              {['confirmed', 'in_progress'].includes(row.status) && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    const apt = await fetchFullAppointment(row.id)
                                    if (apt) {
                                      setSelectedAppointment(apt)
                                      setTimeout(() => {
                                        const checkoutBtn = document.querySelector('[data-checkout-trigger]') as HTMLButtonElement
                                        checkoutBtn?.click()
                                      }, 100)
                                    }
                                  }}
                                  className="cursor-pointer"
                                >
                                  <CreditCard className="w-4 h-4 mr-2 text-green-600" />
                                  <span>Finalizar y Cobrar</span>
                                </DropdownMenuItem>
                              )}

                              {/* Confirmar */}
                              {row.status === 'pending' && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', row.id)

                                      toast({ title: 'Cita confirmada' })
                                      fetchData()
                                    } catch (error) {
                                      toast({ title: 'Error', variant: 'destructive' })
                                    }
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Check className="w-4 h-4 mr-2 text-green-600" />
                                  <span>Confirmar</span>
                                </DropdownMenuItem>
                              )}

                              {/* En Progreso */}
                              {row.status === 'confirmed' && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await supabase.from('appointments').update({ status: 'in_progress' }).eq('id', row.id)
                                      toast({ title: 'En progreso' })
                                      fetchData()
                                    } catch (error) {
                                      toast({ title: 'Error', variant: 'destructive' })
                                    }
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Clock className="w-4 h-4 mr-2 text-blue-600" />
                                  <span>En Progreso</span>
                                </DropdownMenuItem>
                              )}

                              {/* No Asistió */}
                              {['confirmed', 'pending'].includes(row.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      try {
                                        await supabase.from('appointments').update({ status: 'no_show' }).eq('id', row.id)
                                        try {
                                          await fetch('/api/send-no-show-notification', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ appointmentId: row.id })
                                          })
                                        } catch (e) {}
                                        toast({ title: 'No asistió' })
                                        fetchData()
                                      } catch (error) {
                                        toast({ title: 'Error', variant: 'destructive' })
                                      }
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <AlertCircle className="w-4 h-4 mr-2 text-orange-600" />
                                    <span>No Asistió</span>
                                  </DropdownMenuItem>
                                </>
                              )}

                              {/* Cancelar */}
                              {row.status !== 'cancelled' && row.status !== 'completed' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      try {
                                        await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', row.id)

                                        // Send cancellation email
                                        try {
                                          await fetch('/api/send-cancellation-notification', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              appointmentId: row.id,
                                              cancellationReason: 'Cancelada por el negocio'
                                            })
                                          })
                                        } catch (e) {
                                          console.warn('Failed to send cancellation email')
                                        }

                                        toast({ title: 'Cita cancelada' })
                                        fetchData()
                                      } catch (error) {
                                        toast({ title: 'Error', variant: 'destructive' })
                                      }
                                    }}
                                    className="cursor-pointer text-red-600"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    <span>Cancelar cita</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      {/* Date & Time Row */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex-1">
                          <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{formatDate(row.appointment_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{row.start_time?.substring(0,5)}</span>
                        </div>
                      </div>

                      {/* Employee & Price Row */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{row.employee_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-bold text-green-700 dark:text-green-400">{formatPrice(Number(row.total_price || 0))}</span>
                        </div>
                      </div>

                      {/* Services */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">Servicios</p>
                            <p className="text-sm text-gray-900 dark:text-gray-50 line-clamp-2">{(row.service_names || []).join(', ')}</p>
                          </div>
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

      {/* Paginación */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando <span className="font-semibold text-gray-900 dark:text-gray-50">{(page-1)*limit+1}</span> a{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-50">{Math.min(page*limit, totalCount)}</span> de{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-50">{totalCount}</span> resultados
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Por página:</span>
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
                className="hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 dark:hover:bg-orange-900/50 dark:hover:text-orange-400 dark:hover:border-orange-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-50">
                {page} / {totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 dark:hover:bg-orange-900/50 dark:hover:text-orange-400 dark:hover:border-orange-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
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
    </div>
  </div>
  )
}
