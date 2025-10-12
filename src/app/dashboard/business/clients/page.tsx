'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Edit,
  Search as SearchIcon,
  Download,
  XCircle,
  User,
  Phone,
  Mail,
  FileText,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Users,
  RotateCcw,
  Loader2,
  FileSpreadsheet,
  FileBarChart
} from 'lucide-react'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

export default function ClientsPage() {
  const supabase = createClient()
  const { authState } = useAuth()
  const { toast } = useToast()

  const [businessId, setBusinessId] = useState<string>('')

  const [rows, setRows] = useState<BusinessClient[]>([])
  const totalCount = rows?.[0]?.total_count ?? 0

  const [search, setSearch] = useState('')
  const [onlyActive, setOnlyActive] = useState<'true' | 'false'>('true')
  const [sortBy, setSortBy] = useState('first_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [limit, setLimit] = useState(25)
  const [page, setPage] = useState(1)
  const totalPages = useMemo(() => Math.max(1, Math.ceil((totalCount || 0) / limit)), [totalCount, limit])

  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false)
  const [editing, setEditing] = useState<BusinessClient | null>(null)

  // Form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (authState.user) loadBusiness()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.user?.id])

  useEffect(() => {
    if (businessId) fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, search, onlyActive, sortBy, sortDir, limit, page])

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

  const fetchList = async () => {
    try {
      setFetching(true)
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
      setRows((data as any) || [])
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes',
        variant: 'destructive'
      })
    } finally {
      setFetching(false)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setFirstName('')
    setLastName('')
    setPhone('')
    setEmail('')
    setNotes('')
    setIsActive(true)
  }

  const openCreate = () => {
    resetForm()
    setOpenDialog(true)
  }

  const openEdit = async (row: BusinessClient) => {
    try {
      const { data, error } = await supabase.rpc('get_business_client', {
        p_business_id: businessId,
        p_client_id: row.id,
      })
      if (error) throw error
      const r = data as BusinessClient
      setEditing(r)
      setFirstName(r.first_name || '')
      setLastName(r.last_name || '')
      setPhone(r.phone || '')
      setEmail(r.email || '')
      setNotes(r.notes || '')
      setIsActive(!!r.is_active)
      setOpenDialog(true)
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el cliente',
        variant: 'destructive'
      })
    }
  }

  const saveClient = async () => {
    if (!firstName.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'El nombre es obligatorio',
        variant: 'destructive'
      })
      return
    }

    try {
      const { data, error } = await supabase.rpc('upsert_business_client', {
        p_business_id: businessId,
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim() || null,
        p_phone: phone.trim() || null,
        p_email: email.trim() || null,
        p_notes: notes.trim() || null,
        p_is_active: isActive,
        p_client_id: editing?.id ?? null,
      })
      if (error) throw error

      toast({
        title: editing ? 'Cliente actualizado' : 'Cliente creado',
        description: editing ? 'El cliente fue actualizado correctamente' : 'El cliente fue agregado correctamente'
      })

      setOpenDialog(false)
      resetForm()
      fetchList()
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el cliente',
        variant: 'destructive'
      })
    }
  }

  const deactivateClient = async (row: BusinessClient) => {
    try {
      const { error } = await supabase.rpc('deactivate_business_client', {
        p_business_id: businessId,
        p_client_id: row.id,
      })
      if (error) throw error

      toast({
        title: 'Cliente desactivado',
        description: 'El cliente fue desactivado correctamente'
      })

      fetchList()
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudo desactivar el cliente',
        variant: 'destructive'
      })
    }
  }

  const exportCSV = () => {
    const header = ['Nombre','Apellido','Teléfono','Email','Notas','Estado']
    const lines = rows.map(r => [
      r.first_name,
      r.last_name || '',
      r.phone || '',
      r.email || '',
      r.notes || '',
      r.is_active ? 'Activo' : 'Inactivo'
    ])
    const csv = [header, ...lines].map(cols => cols.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clientes.csv'
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Exportación exitosa',
      description: 'El archivo CSV se ha descargado correctamente'
    })
  }

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Clientes')

    const today = new Date()
    const dateStr = today.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // ========================================
    // TÍTULO PRINCIPAL (Fila 1)
    // ========================================
    worksheet.mergeCells('A1:F1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'LISTADO DE CLIENTES'
    titleCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEA580C' } // orange-600
    }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getRow(1).height = 30

    // ========================================
    // METADATA (Filas 2-3)
    // ========================================
    const metadataRows = [
      `Generado el: ${dateStr}`,
      `Total de clientes: ${totalCount}`
    ]

    metadataRows.forEach((text, index) => {
      const rowNum = index + 2
      worksheet.mergeCells(`A${rowNum}:F${rowNum}`)
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

    // Línea vacía (Fila 4)
    worksheet.getRow(4).height = 5

    // ========================================
    // HEADERS DE COLUMNAS (Fila 5)
    // ========================================
    const headers = ['Nombre', 'Apellido', 'Teléfono', 'Email', 'Notas', 'Estado']
    const headerRow = worksheet.getRow(5)
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
    // DATOS (Desde fila 6)
    // ========================================
    rows.forEach((row, index) => {
      const rowNum = index + 6
      const dataRow = worksheet.getRow(rowNum)

      dataRow.values = [
        row.first_name,
        row.last_name || '-',
        row.phone || '-',
        row.email || '-',
        row.notes || '-',
        row.is_active ? 'Activo' : 'Inactivo'
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

        // Color para estados en columna 6
        if (colNum === 6) {
          const isActive = cell.value === 'Activo'
          cell.font = {
            bold: true,
            color: { argb: isActive ? 'FF16A34A' : 'FF6B7280' } // green-600 : gray-500
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
      })
    })

    // ========================================
    // CONFIGURAR ANCHOS DE COLUMNAS
    // ========================================
    worksheet.columns = [
      { width: 18 },  // Nombre
      { width: 18 },  // Apellido
      { width: 16 },  // Teléfono
      { width: 32 },  // Email
      { width: 45 },  // Notas
      { width: 12 }   // Estado
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
    a.download = `clientes-${ts}.xlsx`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Exportación exitosa',
      description: 'El archivo Excel se ha descargado correctamente'
    })
  }

  const exportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Fecha actual
    const today = new Date()
    const dateStr = today.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Header con gradiente naranja (simulado con rectángulo)
    doc.setFillColor(234, 88, 12) // orange-600
    doc.rect(0, 0, pageWidth, 35, 'F')

    // Título principal
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont(undefined, 'bold')
    doc.text('LISTADO DE CLIENTES', 15, 15)

    // Subtítulo
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), 15, 23)

    // Información del reporte
    doc.setFillColor(251, 191, 36) // amber-400
    doc.rect(0, 35, pageWidth, 12, 'F')

    doc.setTextColor(120, 53, 15) // amber-900
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text(`Total de clientes: ${totalCount}`, 15, 42)

    // Filtros aplicados (si hay)
    const filters = []
    if (search) filters.push(`Búsqueda: "${search}"`)
    if (onlyActive === 'true') filters.push('Solo activos')
    if (filters.length > 0) {
      doc.text(`Filtros: ${filters.join(' | ')}`, pageWidth - 15, 42, { align: 'right' })
    }

    // Resetear color de texto
    doc.setTextColor(0, 0, 0)

    // Tabla con autoTable
    autoTable(doc, {
      startY: 52,
      head: [['Nombre', 'Apellido', 'Teléfono', 'Email', 'Notas', 'Estado']],
      body: rows.map(r => [
        r.first_name,
        r.last_name || '-',
        r.phone || '-',
        r.email || '-',
        (r.notes || '-').substring(0, 100) + ((r.notes?.length || 0) > 100 ? '...' : ''), // Limitar notas
        r.is_active ? 'Activo' : 'Inactivo'
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [226, 232, 240], // gray-200
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [234, 88, 12], // orange-600
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: [255, 251, 235], // amber-50
      },
      columnStyles: {
        0: { cellWidth: 35 },  // Nombre
        1: { cellWidth: 35 },  // Apellido
        2: { cellWidth: 30 },  // Teléfono
        3: { cellWidth: 55 },  // Email
        4: { cellWidth: 70 },  // Notas
        5: { cellWidth: 20, halign: 'center' },  // Estado
      },
      didDrawCell: (data) => {
        // Colorear estados
        if (data.column.index === 5 && data.cell.section === 'body') {
          const isActive = data.cell.raw === 'Activo'
          if (isActive) {
            doc.setTextColor(22, 163, 74) // green-600
            doc.setFont(undefined, 'bold')
          } else {
            doc.setTextColor(107, 114, 128) // gray-500
          }
        }
      },
      margin: { left: 15, right: 15 },
      theme: 'plain',
    })

    // Footer con número de página
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(107, 114, 128) // gray-500
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
      // Línea decorativa en el footer
      doc.setDrawColor(234, 88, 12) // orange-600
      doc.setLineWidth(0.5)
      doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15)
    }

    const ts = today.toISOString().split('T')[0]
    doc.save(`clientes-${ts}.pdf`)

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-amber-50/30">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Clientes del Negocio
            </h1>
            <p className="text-sm text-gray-600 mt-1.5">Gestiona tu base de datos de clientes</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-all duration-300 hover:scale-105 hover:shadow-md"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 animate-in slide-in-from-top-2 duration-200">
                <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase">
                  Formato de Exportación
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* CSV Option */}
                <DropdownMenuItem onClick={exportCSV} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors">
                  <FileText className="w-4 h-4 mr-3 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">CSV</p>
                    <p className="text-xs text-gray-500">Valores separados por comas</p>
                  </div>
                </DropdownMenuItem>

                {/* Excel Option */}
                <DropdownMenuItem onClick={exportExcel} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors">
                  <FileSpreadsheet className="w-4 h-4 mr-3 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">Excel</p>
                    <p className="text-xs text-gray-500">Hoja de cálculo con múltiples pestañas</p>
                  </div>
                </DropdownMenuItem>

                {/* PDF Option */}
                <DropdownMenuItem onClick={exportPDF} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors">
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
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  onClick={openCreate}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    {editing ? 'Editar cliente' : 'Nuevo cliente'}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-orange-600" />
                      Nombre *
                    </label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Ej: Juan"
                      className="focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Apellido</label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Ej: Pérez"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-orange-600" />
                      Teléfono
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej: 0991234567"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-orange-600" />
                      Email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ej: juan@email.com"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-orange-600" />
                      Notas
                    </label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas adicionales..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Estado</label>
                    <Select value={isActive ? 'true' : 'false'} onValueChange={(v: any) => setIsActive(v === 'true')}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Activo</SelectItem>
                        <SelectItem value="false">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpenDialog(false)}
                    className="hover:bg-gray-100"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={saveClient}
                    className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white"
                  >
                    Guardar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros */}
        <Card className="overflow-hidden border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow-md">
                <SearchIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Filtros de Búsqueda</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-600">Encuentra clientes rápidamente</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Búsqueda */}
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <SearchIcon className="w-4 h-4 text-orange-600" />
                  Buscar Cliente
                </label>
                <Input
                  placeholder="Nombre, teléfono o email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="w-full"
                />
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Estado</label>
                <Select value={onlyActive} onValueChange={(v: any) => { setOnlyActive(v); setPage(1) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Solo Activos</SelectItem>
                    <SelectItem value="false">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ordenar por */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Ordenar por</label>
                <Select value={sortBy} onValueChange={(v: any) => { setSortBy(v); setPage(1) }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_name">Nombre</SelectItem>
                    <SelectItem value="last_name">Apellido</SelectItem>
                    <SelectItem value="phone">Teléfono</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="created_at">Fecha de creación</SelectItem>
                    <SelectItem value="updated_at">Última actualización</SelectItem>
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
                    setSearch('')
                    setOnlyActive('true')
                    setSortBy('first_name')
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
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">Resultados</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-gray-600">
                    {totalCount} {totalCount === 1 ? 'cliente encontrado' : 'clientes encontrados'}
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
                <p className="text-gray-600">Cargando clientes...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-b from-gray-50 to-white">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Users className="w-10 h-10 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay clientes</h3>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  No se encontraron clientes con los filtros seleccionados. Intenta ajustar los criterios de búsqueda.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-hidden rounded-lg border border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rows.map((row) => (
                          <tr
                            key={row.id}
                            className="hover:bg-gray-50 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                                  <User className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {row.first_name} {row.last_name}
                                  </div>
                                  {row.notes && (
                                    <div className="text-xs text-gray-500 truncate max-w-xs" title={row.notes}>
                                      {row.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{row.phone || '-'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 truncate max-w-xs" title={row.email || undefined}>
                                {row.email || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {row.is_active ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200 border">Activo</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800 border-gray-200 border">Inactivo</Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase">
                                    Acciones
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />

                                  {/* Editar */}
                                  <DropdownMenuItem
                                    onClick={() => openEdit(row)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="w-4 h-4 mr-2 text-orange-600" />
                                    <span>Editar</span>
                                  </DropdownMenuItem>

                                  {/* Desactivar */}
                                  {row.is_active && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => deactivateClient(row)}
                                        className="cursor-pointer text-red-600"
                                      >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        <span>Desactivar</span>
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                              <h3 className="font-semibold text-gray-900 truncate">
                                {row.first_name} {row.last_name}
                              </h3>
                            </div>
                            {row.notes && (
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {row.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {row.is_active ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 border text-[10px] px-1.5 py-0">
                                Activo
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 border-gray-200 border text-[10px] px-1.5 py-0">
                                Inactivo
                              </Badge>
                            )}

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

                                {/* Editar */}
                                <DropdownMenuItem
                                  onClick={() => openEdit(row)}
                                  className="cursor-pointer"
                                >
                                  <Edit className="w-4 h-4 mr-2 text-orange-600" />
                                  <span>Editar</span>
                                </DropdownMenuItem>

                                {/* Desactivar */}
                                {row.is_active && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => deactivateClient(row)}
                                      className="cursor-pointer text-red-600"
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      <span>Desactivar</span>
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
                        {/* Phone & Email Row */}
                        {(row.phone || row.email) && (
                          <div className="space-y-2">
                            {row.phone && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                                <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-900">{row.phone}</span>
                              </div>
                            )}
                            {row.email && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                                <Mail className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-900 truncate">{row.email}</span>
                              </div>
                            )}
                          </div>
                        )}
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm text-gray-600">
              Mostrando <span className="font-semibold text-gray-900">{(page-1)*limit+1}</span> a{' '}
              <span className="font-semibold text-gray-900">{Math.min(page*limit, totalCount)}</span> de{' '}
              <span className="font-semibold text-gray-900">{totalCount}</span> resultados
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
    </div>
  )
}
