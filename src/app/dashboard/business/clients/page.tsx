'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  FileBarChart,
  LayoutGrid,
  Table as TableIcon,
  Building,
  CheckCircle2,
  Clock,
  Trash2
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
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'

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
  const [businessName, setBusinessName] = useState<string>('')

  const [rows, setRows] = useState<BusinessClient[]>([])
  const totalCount = rows?.[0]?.total_count ?? 0

  const [search, setSearch] = useState('')
  const [onlyActive, setOnlyActive] = useState<'true' | 'false'>('true')
  const [sortBy, setSortBy] = useState('first_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const [limit, setLimit] = useState(25)
  const [page, setPage] = useState(1)
  const totalPages = useMemo(() => Math.max(1, Math.ceil((totalCount || 0) / limit)), [totalCount, limit])

  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false)
  const [editing, setEditing] = useState<BusinessClient | null>(null)

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<string | null>(null)

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

  const handleDeleteClient = async () => {
    if (!clientToDelete) return

    try {
      const { error } = await supabase
        .from('business_clients')
        .delete()
        .eq('id', clientToDelete)
        .eq('business_id', businessId)

      if (error) throw error

      // Close dialog and reset state
      setDeleteDialogOpen(false)
      setClientToDelete(null)

      toast({
        title: 'Cliente eliminado',
        description: 'El cliente fue eliminado permanentemente'
      })

      // Small delay to ensure DB has processed the deletion
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check if we need to go back to page 1
      const remainingOnPage = rows.length - 1
      if (remainingOnPage === 0 && page > 1) {
        // If this was the last item on a page that's not page 1, go back one page
        setPage(page - 1)
      } else {
        // Otherwise just refresh the current page
        await fetchList()
      }
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el cliente',
        variant: 'destructive'
      })
      setDeleteDialogOpen(false)
      setClientToDelete(null)
    }
  }

  const confirmDeleteClient = (clientId: string) => {
    setClientToDelete(clientId)
    setDeleteDialogOpen(true)
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
    doc.setFont('helvetica', 'bold')
    doc.text('LISTADO DE CLIENTES', 15, 15)

    // Subtítulo
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), 15, 23)

    // Información del reporte
    doc.setFillColor(251, 191, 36) // amber-400
    doc.rect(0, 35, pageWidth, 12, 'F')

    doc.setTextColor(120, 53, 15) // amber-900
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
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
            doc.setFont('helvetica', 'bold')
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

  // Memoize statistics (must be before any early returns)
  const stats = useMemo(() => ({
    total: totalCount,
    active: rows.filter(r => r.is_active).length,
    withPhone: rows.filter(r => r.phone).length,
    withEmail: rows.filter(r => r.email).length
  }), [rows, totalCount])

  // Define columns for DataTable (must be before any early returns)
  const columns: ColumnDef<BusinessClient>[] = useMemo(() => [
    {
      accessorKey: 'first_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cliente" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900">
                {row.getValue('first_name')} {row.original.last_name || ''}
              </div>
              {row.original.notes && (
                <div className="text-xs text-gray-500 truncate max-w-xs">
                  {row.original.notes}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Teléfono" />
      ),
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string | null
        return phone ? (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-sm">{phone}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => {
        const email = row.getValue('email') as string | null
        return email ? (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-sm truncate max-w-xs">{email}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
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
        const client = row.original

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEdit(client)}
              className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-700"
            >
              <span className="sr-only">Editar</span>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => confirmDeleteClient(client.id)}
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-700"
            >
              <span className="sr-only">Eliminar</span>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ], [openEdit, confirmDeleteClient])

  // Loading state check (after hooks to comply with Rules of Hooks)
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Sticky Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">Clientes</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gestiona tu base de datos de clientes
              </p>
            </div>
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
                  <DropdownMenuItem onClick={exportCSV} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors dark:focus:bg-orange-900/50 dark:focus:text-orange-400">
                    <FileText className="w-4 h-4 mr-3 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium">CSV</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Valores separados por comas</p>
                    </div>
                  </DropdownMenuItem>

                  {/* Excel Option */}
                  <DropdownMenuItem onClick={exportExcel} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors dark:focus:bg-orange-900/50 dark:focus:text-orange-400">
                    <FileSpreadsheet className="w-4 h-4 mr-3 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium">Excel</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Hoja de cálculo con múltiples pestañas</p>
                    </div>
                  </DropdownMenuItem>

                  {/* PDF Option */}
                  <DropdownMenuItem onClick={exportPDF} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors dark:focus:bg-orange-900/50 dark:focus:text-orange-400">
                    <FileBarChart className="w-4 h-4 mr-3 text-red-600" />
                    <div className="flex-1">
                      <p className="font-medium">PDF</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Reporte profesional con tablas</p>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <div className="px-2 py-1.5 text-xs text-gray-400 dark:text-gray-500 text-center">
                    Los datos se descargarán automáticamente
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all"
                    onClick={openCreate}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-50">
                      {editing ? 'Editar cliente' : 'Nuevo cliente'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-orange-600 dark:text-orange-400" />
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
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Apellido</label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Ej: Pérez"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        Teléfono
                      </label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ej: 0991234567"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400" />
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
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        Notas
                      </label>
                      <Input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notas adicionales..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
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
                      className="hover:bg-gray-100 dark:hover:bg-gray-800"
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
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Clients */}
          <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Clientes</CardTitle>
                <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats.total}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Todos los registros</p>
            </CardContent>
          </Card>

          {/* Active Clients */}
          <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Activos</CardTitle>
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats.active}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Clientes habilitados</p>
            </CardContent>
          </Card>

          {/* Clients with Phone */}
          <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Con Teléfono</CardTitle>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats.withPhone}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Contacto telefónico</p>
            </CardContent>
          </Card>

          {/* Clients with Email */}
          <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Con Email</CardTitle>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats.withEmail}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Contacto por email</p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar with Filters and Toggle */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Buscar por nombre, teléfono o email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={onlyActive} onValueChange={(v: any) => { setOnlyActive(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Solo Activos</SelectItem>
                <SelectItem value="false">Todos</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-1 shadow-sm">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50'
                }
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Cuadrícula</span>
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={viewMode === 'table'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-700 hover:to-amber-700'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50'
                }
              >
                <TableIcon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Tabla</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Conditional Grid/Table View */}
        {fetching && rows.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-16 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando clientes...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Users className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">No hay clientes</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
              No se encontraron clientes. Intenta ajustar los criterios de búsqueda.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <DataTable
                columns={columns}
                data={rows}
              />
            </div>

            {/* Tablet Horizontal Scroll */}
            <div className="hidden md:block lg:hidden">
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <div className="min-w-[800px]">
                  <DataTable
                    columns={columns}
                    data={rows}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {rows.map((row) => (
                <Card
                  key={row.id}
                  className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  <CardHeader className="pb-3 bg-gradient-to-br from-orange-50/50 via-amber-50/30 to-transparent dark:from-orange-900/10 dark:via-amber-900/10 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-50 truncate">
                            {row.first_name} {row.last_name || ''}
                          </h3>
                          <Badge
                            className={row.is_active
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 text-xs mt-1 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-gray-200 text-gray-600 border-gray-300 text-xs mt-1 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                            }
                          >
                            {row.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 flex-1 flex flex-col">
                    <div className="space-y-3">
                      {row.phone && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg min-w-0">
                          <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{row.phone}</span>
                        </div>
                      )}
                      {row.email && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg min-w-0">
                          <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate" title={row.email}>{row.email}</span>
                        </div>
                      )}
                      {row.notes && (
                        <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/20 rounded-lg min-w-0">
                          <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{row.notes}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-4 mt-auto border-t border-gray-100 dark:border-gray-800">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(row)}
                        className="flex-1 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors group-hover:border-orange-200 shadow-sm hover:shadow-md dark:hover:bg-orange-900/50 dark:hover:text-orange-400 dark:hover:border-orange-700 dark:group-hover:border-orange-800"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmDeleteClient(row.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm hover:shadow-md dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-900/50 dark:hover:border-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rows.map((row) => (
              <Card
                key={row.id}
                className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col"
              >
                <CardHeader className="pb-3 bg-gradient-to-br from-orange-50/50 via-amber-50/30 to-transparent dark:from-orange-900/10 dark:via-amber-900/10 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-50 truncate">
                          {row.first_name} {row.last_name || ''}
                        </h3>
                        <Badge
                          className={row.is_active
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 text-xs mt-1 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-gray-200 text-gray-600 border-gray-300 text-xs mt-1 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                          }
                        >
                          {row.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col">
                  <div className="space-y-3">
                    {row.phone && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg min-w-0">
                        <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{row.phone}</span>
                      </div>
                    )}
                    {row.email && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg min-w-0">
                        <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate" title={row.email}>{row.email}</span>
                      </div>
                    )}
                    {row.notes && (
                      <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/20 rounded-lg min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{row.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4 mt-auto border-t border-gray-100 dark:border-gray-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(row)}
                      className="flex-1 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors group-hover:border-orange-200 shadow-sm hover:shadow-md dark:hover:bg-orange-900/50 dark:hover:text-orange-400 dark:hover:border-orange-700 dark:group-hover:border-orange-800"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => confirmDeleteClient(row.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm hover:shadow-md dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-900/50 dark:hover:border-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-200 dark:bg-gray-800/80 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
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
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este cliente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false)
              setClientToDelete(null)
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
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
