'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { X, User, Phone, Mail, Clock, DollarSign, Calendar, FileText, AlertCircle, Edit, Check, MoreVertical, FileImage, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabaseClient'
import { formatSpanishDate } from '@/lib/dateUtils'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import ReceiptViewer from './ReceiptViewer'
import { useAppointmentStarted } from '@/hooks/useAppointmentStarted'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
// Modular cancellation components
import { handleBusinessCancellation, getBusinessOwnerId } from '@/lib/appointments/businessCancellationAdapter'

// Lazy load CheckoutModal
const CheckoutModal = dynamic(() => import('./CheckoutModal'), {
  loading: () => <div className="text-center p-4">Cargando...</div>
})
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface Appointment {
  id: string
  business_id: string
  client_id: string | null
  business_client_id: string | null
  employee_id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  total_price: number
  notes?: string
  client_notes?: string
  walk_in_client_name?: string
  walk_in_client_phone?: string
  users?: {
    first_name: string
    last_name: string
    phone?: string
    avatar_url?: string
    email?: string
  }
  business_clients?: {
    first_name: string
    last_name: string | null
    phone?: string | null
    email?: string | null
  }
  employees?: {
    first_name: string
    last_name: string
  }
  appointment_services?: Array<{
    service_id?: string
    employee_id?: string
    services?: {
      name: string
      duration_minutes: number
    }
    employees?: {
      first_name: string
      last_name: string
      avatar_url?: string
      position?: string
    }
    price: number
  }>
}

interface AppointmentModalProps {
  appointment: Appointment
  onClose: () => void
  onUpdate: () => void
  onEdit?: () => void
}

export default function AppointmentModal({ appointment, onClose, onUpdate, onEdit }: AppointmentModalProps) {
  const [updating, setUpdating] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [hasPendingPayment, setHasPendingPayment] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false)
  const [paymentReceipt, setPaymentReceipt] = useState<{url: string, reference: string} | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const isDeletable = appointment.client_id === null

  const canTakeAction = useAppointmentStarted(
    appointment.appointment_date,
    appointment.start_time
  )

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (['confirmed', 'in_progress', 'completed'].includes(appointment.status)) {
        setCheckingPayment(true)
        try {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('id, status')
            .eq('appointment_id', appointment.id)
            .maybeSingle()

          if (!invoice || (invoice && invoice.status === 'pending')) {
            setHasPendingPayment(true)
          } else {
            setHasPendingPayment(false)
          }

          if (invoice) {
            const { data: paymentData } = await supabase
              .from('payments')
              .select('payment_method, transfer_reference, receipt_url')
              .eq('invoice_id', invoice.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (paymentData && paymentData.receipt_url) {
              setPaymentReceipt({
                url: paymentData.receipt_url,
                reference: paymentData.transfer_reference || ''
              })
            } else {
              setPaymentReceipt(null)
            }
          }
        } catch (error) {
          console.error('Error checking payment status:', error)
          setHasPendingPayment(true)
        } finally {
          setCheckingPayment(false)
        }
      } else {
        setHasPendingPayment(false)
        setPaymentReceipt(null)
      }
    }

    checkPaymentStatus()
  }, [appointment.id, appointment.status, supabase])

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { label: 'Pendiente', className: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', dotColor: 'bg-yellow-500' },
      confirmed: { label: 'Confirmada', className: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800', dotColor: 'bg-green-500' },
      in_progress: { label: 'En Progreso', className: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800', dotColor: 'bg-blue-500' },
      completed: { label: 'Completada', className: 'bg-gray-50 dark:bg-gray-800/20 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700', dotColor: 'bg-gray-500' },
      cancelled: { label: 'Cancelada', className: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800', dotColor: 'bg-red-500' },
      no_show: { label: 'No Asistió', className: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800', dotColor: 'bg-orange-500' }
    }
    return configs[status as keyof typeof configs] || configs.pending
  }

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setUpdating(true)
      const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', appointment.id)
      if (error) throw error
      toast({ title: 'Estado actualizado', description: 'El estado de la cita ha sido actualizado correctamente.' })
      onUpdate()
    } catch (error) {
      console.error('Error updating status:', error)
      toast({ variant: 'destructive', title: 'Error al actualizar', description: 'No se pudo actualizar el estado.' })
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await supabase.from('appointment_services').delete().eq('appointment_id', appointment.id)
      await supabase.from('appointments').delete().eq('id', appointment.id)
      toast({ title: 'Cita eliminada', description: 'La cita ha sido eliminada correctamente.' })
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast({ variant: 'destructive', title: 'Error al eliminar', description: 'No se pudo eliminar la cita.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleCancel = async () => {
    try {
      setUpdating(true)
      const ownerId = await getBusinessOwnerId(appointment.business_id)
      if (!ownerId) throw new Error('No owner ID')
      await handleBusinessCancellation({
        appointmentId: appointment.id, businessOwnerId: ownerId, cancelReason: 'Cancelada por el negocio',
        onSuccess: () => { toast({ title: 'Cita cancelada' }); onUpdate(); },
        onError: (err) => { toast({ variant: 'destructive', title: 'Error', description: err.message }); }
      })
    } catch (error) { console.error(error); } finally { setUpdating(false); }
  }

  const handleReactivate = async () => {
    try {
      setUpdating(true)
      await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', appointment.id)
      toast({ title: 'Cita reactivada' }); onUpdate();
    } catch (error) { console.error(error); } finally { setUpdating(false); }
  }

  const handleCheckoutSuccess = async () => {
    setShowCheckout(false)
    onClose()
    onUpdate()
  }

  const formatPrice = (price: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(price)
  const getInitials = (firstName: string, lastName: string) => `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  const statusConfig = getStatusConfig(appointment.status)

  // Extraer lista única de empleados implicados
  const involvedEmployees = Array.from(new Set([
    appointment.employee_id,
    ...(appointment.appointment_services?.map(as => as.employee_id).filter(Boolean) || [])
  ])).map(empId => {
    const as = appointment.appointment_services?.find(s => s.employee_id === empId);
    if (empId === appointment.employee_id && appointment.employees) {
      return { id: empId, name: `${appointment.employees.first_name} ${appointment.employees.last_name}`, avatar: null };
    }
    if (as?.employees) {
      return { id: empId, name: `${as.employees.first_name} ${as.employees.last_name}`, avatar: as.employees.avatar_url };
    }
    return { id: empId, name: 'Profesional', avatar: null };
  });

  if (showCheckout) {
    return (
      <CheckoutModal
        appointmentId={appointment.id}
        totalAmount={appointment.total_price}
        services={appointment.appointment_services?.map((s) => ({ name: s.services?.name || 'Servicio', price: s.price })) || []}
        onClose={() => setShowCheckout(false)}
        onSuccess={handleCheckoutSuccess}
      />
    )
  }

  return (
    <TooltipProvider>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl p-0 border-none bg-transparent shadow-none" showCloseButton={false}>
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            
            {/* Header Premium */}
            <div className="relative overflow-hidden pt-6 pb-5 px-6 sm:px-10 bg-primary shadow-lg rounded-t-[2rem]">
              <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-black/10 hover:bg-black/20 text-white border-none transition-all z-10">
                <X className="w-4 h-4" />
              </Button>
              <div className="relative flex items-center gap-4 sm:gap-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center shadow-lg border border-white/20 flex-shrink-0">
                  <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-black text-white/80 uppercase tracking-[0.2em]">Cita #{appointment.id.substring(0, 8)}</span>
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight mb-2">Detalle de la Cita</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={`${statusConfig.className} border shadow-sm px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white dark:bg-gray-800`}>
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${statusConfig.dotColor} shadow-[0_0_8px_currentColor]`} />
                      {statusConfig.label}
                    </Badge>
                    <p className="text-white text-[11px] font-bold flex items-center gap-1.5 opacity-90">
                      <Clock className="w-3.5 h-3.5" />
                      {formatSpanishDate(appointment.appointment_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin dark:scrollbar-thumb-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Card Cliente */}
                <div className="md:col-span-2 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">Cliente</h3>
                    </div>
                    {appointment.business_client_id && <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800 text-[9px] font-black uppercase">Del Negocio</Badge>}
                    {(appointment.walk_in_client_name || appointment.walk_in_client_phone) && <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/50 text-[9px] font-black uppercase">Walk-in</Badge>}
                  </div>
                  <div className="flex items-center gap-5">
                    <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-white dark:border-gray-700 shadow-xl rounded-[1.5rem]">
                      {appointment.users?.avatar_url && <AvatarImage src={appointment.users.avatar_url} className="object-cover" />}
                      <AvatarFallback className="bg-primary text-white text-xl font-black rounded-[1.5rem]">
                        {appointment.users ? getInitials(appointment.users.first_name, appointment.users.last_name) : appointment.business_clients ? getInitials(appointment.business_clients.first_name, appointment.business_clients.last_name || 'C') : '👤'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 dark:text-white text-xl truncate tracking-tight">
                        {appointment.users ? `${appointment.users.first_name} ${appointment.users.last_name}` : appointment.business_clients ? `${appointment.business_clients.first_name} ${appointment.business_clients.last_name || ''}`.trim() : appointment.walk_in_client_name || 'Cliente sin registro'}
                      </p>
                      <div className="flex flex-wrap gap-4 mt-3">
                        {(appointment.users?.phone || appointment.business_clients?.phone || appointment.walk_in_client_phone) && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-bold bg-white dark:bg-gray-900 px-3 py-1 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <Phone className="w-3.5 h-3.5 text-primary" />
                            {appointment.users?.phone || appointment.business_clients?.phone || appointment.walk_in_client_phone}
                          </div>
                        )}
                        {(appointment.users?.email || appointment.business_clients?.email) && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-bold bg-white dark:bg-gray-900 px-3 py-1 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm truncate">
                            <Mail className="w-3.5 h-3.5 text-primary" />
                            <span className="truncate">{appointment.users?.email || appointment.business_clients?.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Horario - Ajustado para evitar desbordamiento */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-primary" />
                    <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">Horario</h3>
                  </div>
                  <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                    <p className="text-gray-900 dark:text-white text-2xl sm:text-3xl font-black tracking-tighter tabular-nums leading-none">
                      {appointment.start_time.substring(0, 5)}
                    </p>
                    <span className="text-gray-400 font-bold mb-0.5 text-xs sm:text-sm uppercase tracking-widest">a</span>
                    <p className="text-gray-900 dark:text-white text-2xl sm:text-3xl font-black tracking-tighter tabular-nums leading-none">
                      {appointment.end_time.substring(0, 5)}
                    </p>
                  </div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-4 bg-primary/10 inline-block px-2 py-0.5 rounded-lg">
                    {appointment.appointment_services?.[0]?.services?.duration_minutes || 0} MINUTOS
                  </p>
                </div>

                {/* Card Profesionales - Nombres Visibles */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">Equipo</h3>
                  </div>
                  <div className="space-y-3">
                    {involvedEmployees.map((emp, idx) => (
                      <div key={emp.id || idx} className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-800 shadow-sm rounded-xl">
                          {emp.avatar && <AvatarImage src={emp.avatar} className="object-cover" />}
                          <AvatarFallback className="bg-orange-100 dark:bg-orange-950/30 text-primary text-[10px] font-black uppercase">
                            {emp.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">{emp.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Especialista</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Servicios */}
                <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">Servicios Agendados</h3>
                    </div>
                    <Badge className="bg-white dark:bg-gray-800 text-gray-500 border border-gray-100 dark:border-gray-700 text-[10px] font-black uppercase px-3 py-1">
                      {appointment.appointment_services?.length || 0} Items
                    </Badge>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {appointment.appointment_services?.map((service, index) => (
                      <div key={index} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center font-black text-primary text-xs border border-orange-100 dark:border-orange-900/30">
                            {index + 1}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-white font-black text-sm tracking-tight">{service.services?.name}</span>
                            {service.employees && <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-0.5">Por: {service.employees.first_name} {service.employees.last_name}</span>}
                          </div>
                        </div>
                        <span className="font-black text-gray-900 dark:text-white text-lg tracking-tighter">{formatPrice(service.price)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-900 dark:bg-black p-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <span className="text-white text-xs font-black uppercase tracking-[0.2em]">Total Final</span>
                    </div>
                    <span className="text-3xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{formatPrice(appointment.total_price)}</span>
                  </div>
                </div>

                {/* Card Notas */}
                {(appointment.notes || appointment.client_notes) && (
                  <div className="md:col-span-2 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-5">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">Notas y Observaciones</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {appointment.client_notes && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2">Del Cliente</p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 italic shadow-sm">"{appointment.client_notes}"</p>
                        </div>
                      )}
                      {appointment.notes && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2">Internas</p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 italic shadow-sm">"{appointment.notes}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-100 dark:border-gray-800 p-6 bg-gray-50/50 dark:bg-gray-950/50 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row gap-3">
                {appointment.status !== 'cancelled' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-12 px-4 rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm" disabled={updating}>
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 rounded-2xl border-gray-100 dark:border-gray-800 dark:bg-gray-900 shadow-2xl z-[150] p-2">
                      {onEdit && appointment.status !== 'completed' && (
                        <DropdownMenuItem onClick={onEdit} className="rounded-xl py-2.5 cursor-pointer font-bold focus:bg-primary/5 focus:text-primary transition-colors">
                          <Edit className="w-4 h-4 mr-3 text-primary" /> Editar Datos
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-gray-50 dark:bg-gray-800" />
                      {appointment.status === 'pending' && <DropdownMenuItem onClick={() => handleUpdateStatus('confirmed')} className="rounded-xl py-2.5 cursor-pointer font-bold text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30 transition-colors"><Check className="w-4 h-4 mr-3" /> Confirmar Ahora</DropdownMenuItem>}
                      {appointment.status === 'confirmed' && <DropdownMenuItem onClick={() => handleUpdateStatus('in_progress')} disabled={!canTakeAction} className="rounded-xl py-2.5 cursor-pointer font-bold text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-950/30 transition-colors"><Clock className="w-4 h-4 mr-3" /> Iniciar Servicio</DropdownMenuItem>}
                      {['confirmed', 'pending'].includes(appointment.status) && <DropdownMenuItem onClick={() => handleUpdateStatus('no_show')} disabled={!canTakeAction} className="rounded-xl py-2.5 cursor-pointer font-bold text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-950/30 transition-colors"><AlertCircle className="w-4 h-4 mr-3" /> Marcar Inasistencia</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <div className="flex-1 flex flex-wrap gap-3">
                  {paymentReceipt && <Button onClick={() => setReceiptViewerOpen(true)} variant="outline" className="flex-1 min-w-[140px] h-12 rounded-xl border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm"><FileImage className="w-4 h-4 mr-2" /> Comprobante</Button>}
                  {hasPendingPayment && !checkingPayment && ['confirmed', 'in_progress', 'completed'].includes(appointment.status) && (
                    <Button onClick={() => setShowCheckout(true)} disabled={updating || !canTakeAction} className={`flex-[2] min-w-[200px] h-12 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all duration-300 active:scale-95 ${canTakeAction && !updating ? 'bg-gray-900 dark:bg-black hover:opacity-90 text-white shadow-gray-900/20' : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border-none shadow-none'}`}><DollarSign className="w-4 h-4 mr-2" /> {appointment.status === 'completed' ? 'Registrar Pago' : 'Finalizar y Cobrar'}</Button>
                  )}
                  {appointment.status === 'cancelled' && <Button onClick={handleReactivate} disabled={updating} className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"><Check className="w-4 h-4 mr-2" /> Reactivar Cita</Button>}
                  {isDeletable && (
                    <>
                      {showDeleteConfirm ? (
                        <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900/50 rounded-xl px-4 py-1.5 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                          <span className="text-[10px] font-black text-red-800 dark:text-red-400 uppercase tracking-tight flex-1">¿Eliminar?</span>
                          <div className="flex gap-1.5"><Button size="sm" onClick={handleDelete} disabled={deleting} className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase">Sí</Button><Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase dark:text-gray-400">No</Button></div>
                        </div>
                      ) : (
                        <Button onClick={() => setShowDeleteConfirm(true)} variant="outline" className="h-12 w-12 rounded-xl border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all flex-shrink-0"><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </>
                  )}
                  {appointment.status !== 'cancelled' && appointment.status !== 'completed' && <Button onClick={handleCancel} disabled={updating} variant="outline" className="flex-1 min-w-[110px] h-12 rounded-xl text-red-600 border-red-100 dark:border-red-900/30 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950 transition-all">Cancelar</Button>}
                  <Button onClick={onClose} className="flex-1 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-black text-[10px] uppercase tracking-widest transition-all">Cerrar</Button>
                </div>
              </div>
            </div>
          </div>

          {paymentReceipt && (
            <ReceiptViewer isOpen={receiptViewerOpen} onClose={() => setReceiptViewerOpen(false)} receiptUrl={paymentReceipt.url} transferReference={paymentReceipt.reference} />
          )}
    
   
  
  </DialogContent>
    </Dialog>
    </TooltipProvider> 
        
        )

}
