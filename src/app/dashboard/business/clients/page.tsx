'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Building, Users, UserPlus, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { clientFormSchema, type ClientFormData } from '@/lib/validation'
import BusinessClientsTab from '@/components/clients/BusinessClientsTab'
import RegisteredClientsTab from '@/components/clients/RegisteredClientsTab'
import UnblockClientDialog from '@/components/UnblockClientDialog'
import { PDFPreviewModal } from '@/components/pdf'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PDF_COLORS } from '@/lib/export/utils/pdfStyles'

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
}

export default function ClientsPage() {
  const supabase = createClient()
  const { authState } = useAuth()
  const { toast } = useToast()

  const [businessId, setBusinessId] = useState<string>('')
  const [businessName, setBusinessName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('business')

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false)
  const [editing, setEditing] = useState<BusinessClient | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<string | null>(null)
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false)
  const [clientToUnblock, setClientToUnblock] = useState<{ id: string; name: string } | null>(null)

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    mode: 'onBlur',
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      notes: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (authState.user?.id) {
      loadBusiness()
    }
  }, [authState.user?.id])

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
        description: 'No se pudo cargar el negocio',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditing(null)
    reset({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      notes: '',
      is_active: true,
    })
  }

  const handleAddClient = () => {
    resetForm()
    setOpenDialog(true)
  }

  const handleEditClient = (client: BusinessClient) => {
    setEditing(client)
    reset({
      first_name: client.first_name,
      last_name: client.last_name || '',
      email: client.email || '',
      phone: client.phone || '',
      notes: client.notes || '',
      is_active: !!client.is_active,
    })
    setOpenDialog(true)
  }

  const onSubmit = async (formData: ClientFormData) => {
    try {
      setSubmitting(true)
      const { data, error } = await supabase.rpc('upsert_business_client', {
        p_business_id: businessId,
        p_first_name: formData.first_name,
        p_last_name: formData.last_name,
        p_phone: formData.phone || null,
        p_email: formData.email || null,
        p_notes: formData.notes || null,
        p_is_active: formData.is_active,
        p_client_id: editing?.id || null,
      })

      if (error) throw error

      toast({
        title: editing ? 'Cliente actualizado' : 'Cliente creado',
        description: editing
          ? 'El cliente se actualizó correctamente'
          : 'El cliente se creó correctamente',
      })

      setOpenDialog(false)
      resetForm()
      
      // Trigger refresh in BusinessClientsTab
      if ((window as any).refreshBusinessClients) {
        (window as any).refreshBusinessClients()
      }
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'No se pudo guardar el cliente',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClient = async () => {
    if (!clientToDelete) return

    try {
      const { error } = await supabase.rpc('delete_business_client', {
        p_client_id: clientToDelete,
        p_business_id: businessId,
      })

      if (error) throw error

      toast({
        title: 'Cliente eliminado',
        description: 'El cliente se eliminó correctamente',
      })

      setDeleteDialogOpen(false)
      setClientToDelete(null)
      
      // Trigger refresh
      if ((window as any).refreshBusinessClients) {
        (window as any).refreshBusinessClients()
      }
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'No se pudo eliminar el cliente',
        variant: 'destructive',
      })
    }
  }

  // PDF Preview state
  const [showPDFPreview, setShowPDFPreview] = useState(false)
  const [pdfDocument, setPdfDocument] = useState<jsPDF | null>(null)

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      // Fetch all clients for export
      const { data, error } = await supabase.rpc('list_business_clients', {
        p_business_id: businessId,
        p_search: null,
        p_only_active: false,
        p_limit: 10000,
        p_offset: 0,
        p_sort_by: 'first_name',
        p_sort_dir: 'asc',
      })

      if (error) throw error

      if (format === 'excel') {
        await exportToExcel(data as any)
        toast({
          title: 'Exportación exitosa',
          description: 'Los clientes se exportaron a Excel',
        })
      } else {
        // Generate PDF and show preview
        const doc = generateClientsPDF(data as any)
        setPdfDocument(doc)
        setShowPDFPreview(true)
      }
    } catch (e: any) {
      toast({
        title: 'Error',
        description: 'No se pudo exportar',
        variant: 'destructive',
      })
    }
  }

  const handlePDFDownload = () => {
    if (!pdfDocument) return

    try {
      pdfDocument.save(`clientes-${businessName}-${new Date().toISOString().split('T')[0]}.pdf`)
      
      toast({
        title: 'Descarga exitosa',
        description: 'El PDF de clientes se descargó correctamente',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo descargar el PDF',
        variant: 'destructive',
      })
    }
  }

  const exportToExcel = async (clients: any[]) => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Clientes')

    worksheet.columns = [
      { header: 'Nombre', key: 'first_name', width: 20 },
      { header: 'Apellido', key: 'last_name', width: 20 },
      { header: 'Teléfono', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Notas', key: 'notes', width: 40 },
      { header: 'Estado', key: 'is_active', width: 10 },
    ]

    clients.forEach((client) => {
      worksheet.addRow({
        first_name: client.first_name,
        last_name: client.last_name || '',
        phone: client.phone || '',
        email: client.email || '',
        notes: client.notes || '',
        is_active: client.is_active ? 'Activo' : 'Inactivo',
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clientes-${businessName}-${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
  }

  const generateClientsPDF = (clients: any[]): jsPDF => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height

    // ========================================
    // MAIN HEADER - Gray
    // ========================================
    doc.setFillColor(...PDF_COLORS.GRAY_900)
    doc.rect(0, 0, pageWidth, 30, 'F')

    // Title in white with business name
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(`LISTADO DE CLIENTES - ${businessName}`, 15, 18)

    // Date
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const today = new Date()
    const dateStr = today.toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    doc.text(`Generado el ${dateStr}`, 15, 25)

    let currentY = 30

    // ========================================
    // INFORMATION SECTION
    // ========================================
    doc.setFillColor(...PDF_COLORS.GRAY_900)
    doc.rect(0, currentY, pageWidth, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMACIÓN DEL REPORTE', pageWidth / 2, currentY + 6.5, {
      align: 'center',
    })

    currentY += 10

    // Summary info
    const totalClients = clients.length
    const activeClients = clients.filter(c => c.is_active).length

    autoTable(doc, {
      startY: currentY,
      margin: { left: 0, right: 0 },
      tableWidth: pageWidth,
      head: [['Total de clientes', 'Clientes activos', 'Clientes inactivos']],
      body: [
        [
          String(totalClients),
          String(activeClients),
          String(totalClients - activeClients),
        ],
      ],
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        halign: 'center',
        valign: 'middle',
        lineColor: [209, 213, 219],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [229, 231, 235],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [31, 41, 55],
      },
    })

    currentY = (doc as any).lastAutoTable.finalY + 8

    // ========================================
    // CLIENT DETAILS HEADER
    // ========================================
    doc.setFillColor(...PDF_COLORS.GRAY_900)
    doc.rect(0, currentY, pageWidth, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('DETALLE DE CLIENTES', pageWidth / 2, currentY + 6.5, {
      align: 'center',
    })

    currentY += 10

    // ========================================
    // CLIENTS TABLE
    // ========================================
    autoTable(doc, {
      startY: currentY,
      head: [['Nombre', 'Apellido', 'Teléfono', 'Email', 'Estado']],
      body: clients.map((c) => [
        c.first_name,
        c.last_name || '-',
        c.phone || '-',
        c.email || '-',
        c.is_active ? 'Activo' : 'Inactivo',
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle',
        lineColor: [209, 213, 219],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: [31, 41, 55],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [243, 244, 246],
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 60 },
        4: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: 15, right: 15 },
    })

    // ========================================
    // FOOTER
    // ========================================
    const totalPages = (doc as any).internal.getNumberOfPages()

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)

      // Gray decorative line
      doc.setDrawColor(...PDF_COLORS.GRAY_700)
      doc.setLineWidth(0.5)
      doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15)

      // Page numbers
      doc.setTextColor(107, 114, 128)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, {
        align: 'center',
      })

      // Generated by TuTurno
      doc.setFontSize(8)
      doc.setTextColor(156, 163, 175)
      doc.text('Generado por TuTurno', pageWidth - 15, pageHeight - 10, {
        align: 'right',
      })
    }

    return doc
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6">
      <div className="w-full space-y-8">
        {/* Premium Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="relative pl-6 flex-shrink-0">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(251,146,60,0.3)]" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-orange-600 dark:text-orange-500 mb-1">
                {businessName || 'Administración'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-gray-50">
                Gestión de Clientes
              </h1>
            </div>
          </div>
          
          <Button
            onClick={handleAddClient}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 shadow-md hover:shadow-lg transition-all rounded-2xl h-11 px-6 font-bold"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>

        {/* Tabs - Premium Style */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex h-12 items-center justify-center rounded-3xl bg-gray-100/80 dark:bg-gray-800/50 p-1.5 backdrop-blur-sm shadow-inner overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
            <TabsTrigger
              value="business"
              className="rounded-2xl px-6 py-2 text-xs font-bold tracking-wider uppercase transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:shadow-lg"
            >
              <Users className="w-4 h-4 mr-2" />
              Negocio
            </TabsTrigger>
            <TabsTrigger
              value="registered"
              className="rounded-2xl px-6 py-2 text-xs font-bold tracking-wider uppercase transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:shadow-lg"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Registrados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="mt-6">
            <BusinessClientsTab
              businessId={businessId}
              onAddClient={handleAddClient}
              onEditClient={handleEditClient}
              onDeleteClient={(id) => {
                setClientToDelete(id)
                setDeleteDialogOpen(true)
              }}
              onExport={handleExport}
            />
          </TabsContent>

          <TabsContent value="registered" className="mt-6">
            <RegisteredClientsTab
              businessId={businessId}
              onUnblockClient={(id, name) => {
                setClientToUnblock({ id, name })
                setUnblockDialogOpen(true)
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Client Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent
          className="max-w-2xl"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Nombre *</Label>
                <Input
                  id="first_name"
                  {...register('first_name')}
                  placeholder="Juan"
                  className={errors.first_name ? 'border-red-500' : ''}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-500 mt-1">{errors.first_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="last_name">Apellido</Label>
                <Input id="last_name" {...register('last_name')} placeholder="Pérez" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" {...register('phone')} placeholder="0999999999" />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" {...register('email')} placeholder="cliente@ejemplo.com" />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Información adicional..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" {...register('is_active')} />
              <Label htmlFor="is_active" className="cursor-pointer">
                Cliente activo
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenDialog(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="bg-orange-600 hover:bg-orange-700">
                {submitting ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <AlertDialogTitle>
                ¿Estás seguro?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este cliente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false)
                setClientToDelete(null)
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-red-600 hover:bg-red-700 shadow-red-600/20"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unblock Client Dialog */}
      {clientToUnblock && (
        <UnblockClientDialog
          open={unblockDialogOpen}
          onOpenChange={setUnblockDialogOpen}
          clientId={clientToUnblock.id}
          clientName={clientToUnblock.name}
          businessId={businessId}
          unblockedBy={authState.user?.id || ''}
          onSuccess={() => {
            // Refresh registered clients list
            if ((window as any).refreshRegisteredClients) {
              (window as any).refreshRegisteredClients()
            }
            setClientToUnblock(null)
          }}
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
        filename={`clientes-${businessName}`}
        onDownload={handlePDFDownload}
        title="Previsualización de Clientes"
      />
    </div>
  )
}
