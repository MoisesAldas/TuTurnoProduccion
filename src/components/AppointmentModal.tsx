'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { X, User, Phone, Mail, Clock, DollarSign, Calendar, FileText, AlertCircle, Edit, Check, MoreVertical, FileImage } from 'lucide-react'
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
import { AppointmentActionTooltip } from './AppointmentActionTooltip'
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
    services?: {
      name: string
      duration_minutes: number
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
  const supabase = createClient()
  const { toast } = useToast()

  // Verificar si la cita ya ha comenzado
  const canTakeAction = useAppointmentStarted(
    appointment.appointment_date,
    appointment.start_time
  )

  // Check if appointment needs payment (confirmed, in_progress, or completed without payment)
  useEffect(() => {
    const checkPaymentStatus = async () => {
      // Only check for confirmed, in_progress, or completed appointments
      if (['confirmed', 'in_progress', 'completed'].includes(appointment.status)) {
        setCheckingPayment(true)
        try {
          // Get invoice for this appointment
          const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('id, status')
            .eq('appointment_id', appointment.id)
            .maybeSingle()

          // If no invoice exists yet, or invoice is pending, can register payment
          if (!invoice || (invoice && invoice.status === 'pending')) {
            setHasPendingPayment(true)
          } else {
            setHasPendingPayment(false)
          }

          // If invoice exists, check for payment receipt
          if (invoice) {
            const { data: paymentData } = await supabase
              .from('payments')
              .select('payment_method, transfer_reference, receipt_url')
              .eq('invoice_id', invoice.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            console.log('🧾 Payment Receipt Debug:', {
              hasPaymentData: !!paymentData,
              receipt_url: paymentData?.receipt_url,
              transfer_reference: paymentData?.transfer_reference,
              payment_method: paymentData?.payment_method
            })

            if (paymentData && paymentData.receipt_url) {
              setPaymentReceipt({
                url: paymentData.receipt_url,
                reference: paymentData.transfer_reference || ''
              })
              console.log('✅ Receipt found! Button should appear.')
            } else {
              setPaymentReceipt(null)
              console.log('❌ No receipt_url found. Button will NOT appear.')
            }
          }
        } catch (error) {
          console.error('Error checking payment status:', error)
          setHasPendingPayment(true) // Show button by default on error
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
      pending: {
        label: 'Pendiente',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        dotColor: 'bg-yellow-500'
      },
      confirmed: {
        label: 'Confirmada',
        className: 'bg-green-50 text-green-700 border-green-200',
        dotColor: 'bg-green-500'
      },
      in_progress: {
        label: 'En Progreso',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500'
      },
      completed: {
        label: 'Completada',
        className: 'bg-gray-50 text-gray-700 border-gray-200',
        dotColor: 'bg-gray-500'
      },
      cancelled: {
        label: 'Cancelada',
        className: 'bg-red-50 text-red-700 border-red-200',
        dotColor: 'bg-red-500'
      },
      no_show: {
        label: 'No Asistió',
        className: 'bg-orange-50 text-orange-700 border-orange-200',
        dotColor: 'bg-orange-500'
      }
    }

    return configs[status as keyof typeof configs] || configs.pending
  }

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setUpdating(true)

      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointment.id)

      if (error) throw error

      // Send no-show email if status is 'no_show'
      if (newStatus === 'no_show') {
        try {
          await fetch('/api/send-no-show-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointmentId: appointment.id })
          })
        } catch (emailError) {
          console.warn('⚠️ Failed to send no-show email:', emailError)
          // Don't block the operation if email fails
        }
      }

      toast({
        title: 'Estado actualizado',
        description: 'El estado de la cita ha sido actualizado correctamente.',
      })
      onUpdate()
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: 'No se pudo actualizar el estado de la cita.',
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleCancel = async () => {
    try {
      setUpdating(true)

      // Get business owner ID
      const ownerId = await getBusinessOwnerId(appointment.business_id)
      if (!ownerId) {
        throw new Error('No se pudo obtener el ID del propietario del negocio')
      }

      // Use modular cancellation adapter
      await handleBusinessCancellation({
        appointmentId: appointment.id,
        businessOwnerId: ownerId,
        cancelReason: 'Cancelada por el negocio',
        onSuccess: () => {
          toast({
            title: 'Cita cancelada',
            description: 'La cita ha sido cancelada correctamente.',
          })
          onUpdate()
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Error al cancelar',
            description: error.message || 'No se pudo cancelar la cita.',
          })
        }
      })
    } catch (error) {
      console.error('Error canceling appointment:', error)
      toast({
        variant: 'destructive',
        title: 'Error al cancelar',
        description: 'No se pudo cancelar la cita.',
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleReactivate = async () => {
    try {
      setUpdating(true)

      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointment.id)

      if (error) throw error

      toast({
        title: 'Cita reactivada',
        description: 'La cita ha sido reactivada y confirmada.',
      })
      onUpdate()
    } catch (error) {
      console.error('Error reactivating appointment:', error)
      toast({
        variant: 'destructive',
        title: 'Error al reactivar',
        description: 'No se pudo reactivar la cita.',
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleCheckoutSuccess = async () => {
    // CheckoutModal now handles marking appointment as completed and creating invoice
    // Just close modals and refresh
    setShowCheckout(false)
    onClose()
    onUpdate()
  }

  const handleOpenCheckout = () => {
    setShowCheckout(true)
  }

  const handleCloseCheckout = () => {
    setShowCheckout(false)
  }

  const formatDate = (date: string) => {
    return formatSpanishDate(date, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const statusConfig = getStatusConfig(appointment.status)

  // Debug: Log avatar URL
  useEffect(() => {
    console.log('🖼️ Avatar Debug:', {
      hasUsers: !!appointment.users,
      avatar_url: appointment.users?.avatar_url,
      firstName: appointment.users?.first_name,
      lastName: appointment.users?.last_name,
    })
  }, [appointment])

  // If checkout is open, render it instead
  if (showCheckout) {
    return (
      <CheckoutModal
        appointmentId={appointment.id}
        totalAmount={appointment.total_price}
        services={
          appointment.appointment_services?.map((service) => ({
            name: service.services?.name || 'Servicio',
            price: service.price
          })) || []
        }
        onClose={handleCloseCheckout}
        onSuccess={handleCheckoutSuccess}
      />
    )
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 border-none bg-transparent shadow-none" showCloseButton={false}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con color sólido Premium - Ultra Compacto */}
          <div className="relative overflow-hidden pt-4 pb-3 sm:pt-6 sm:pb-4 px-5 sm:px-8 bg-primary shadow-lg sm:shadow-xl rounded-t-2xl">
            {/* Patrón de fondo sutil */}
          

            {/* Botón Cerrar Premium - Ultra Ajustado */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-black/10 hover:bg-black/20 text-white border-none transition-all duration-300 z-10"
            >
              <X className="w-3.5 h-3.5" />
            </Button>

            <div className="relative flex items-center gap-3 sm:gap-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/20 flex-shrink-0">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-[8px] sm:text-[9px] font-black text-white/80 uppercase tracking-[0.2em]">
                    Cita #{appointment.id.substring(0, 8)}
                  </span>
                </div>
                
                <h2 className="text-lg sm:text-2xl font-black text-white leading-none tracking-tight mb-2">
                  Información Cita
                </h2>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Badge className={`${statusConfig.className} border shadow-lg px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-white text-gray-900 border-white`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${statusConfig.dotColor} shadow-[0_0_8px_currentColor]`} />
                    {statusConfig.label}
                  </Badge>
                  <p className="text-white text-[10px] sm:text-xs font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {formatDate(appointment.appointment_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cliente */}
              <div className="md:col-span-2 bg-gray-50 rounded-xl p-5 border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-gray-900">Cliente</h3>
                  {appointment.business_client_id && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      Cliente del Negocio
                    </span>
                  )}
                  {(appointment.walk_in_client_name || appointment.walk_in_client_phone) && (
                    <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                      Sin cita previa
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-orange-500">
                    {appointment.users?.avatar_url && (
                      <AvatarImage
                        src={appointment.users.avatar_url}
                        alt={`${appointment.users.first_name} ${appointment.users.last_name}`}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-orange-600 hover:bg-orange-700 text-white text-lg">
                      {appointment.users
                        ? getInitials(appointment.users.first_name, appointment.users.last_name)
                        : appointment.business_clients
                        ? getInitials(appointment.business_clients.first_name, appointment.business_clients.last_name || 'C')
                        : appointment.walk_in_client_name
                        ? getInitials(
                            appointment.walk_in_client_name.split(' ')[0] || 'C',
                            appointment.walk_in_client_name.split(' ')[1] || 'W'
                          )
                        : '👤'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-lg truncate">
                      {appointment.users
                        ? `${appointment.users.first_name} ${appointment.users.last_name}`
                        : appointment.business_clients
                        ? `${appointment.business_clients.first_name} ${appointment.business_clients.last_name || ''}`.trim()
                        : appointment.walk_in_client_name || 'Cliente Sin cita previa'}
                    </p>
                    <div className="space-y-1 mt-2">
                      {(appointment.users?.phone || appointment.business_clients?.phone || appointment.walk_in_client_phone) && (
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5" />
                          {appointment.users?.phone || appointment.business_clients?.phone || appointment.walk_in_client_phone}
                        </p>
                      )}
                      {(appointment.users?.email || appointment.business_clients?.email) && (
                        <p className="text-sm text-gray-600 flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{appointment.users?.email || appointment.business_clients?.email}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Empleado */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">Empleado</h3>
                </div>
                <p className="text-gray-700 font-medium">
                  {appointment.employees?.first_name} {appointment.employees?.last_name}
                </p>
              </div>

              {/* Horario */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">Horario</h3>
                </div>
                <p className="text-gray-900 text-lg font-semibold">
                  {appointment.start_time.substring(0, 5)} - {appointment.end_time.substring(0, 5)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {appointment.appointment_services?.[0]?.services?.duration_minutes || 0} minutos
                </p>
              </div>

              {/* Servicios */}
              <div className="md:col-span-2 bg-gray-50 rounded-xl p-5 border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">Servicios</h3>
                </div>
                <div className="space-y-3">
                  {appointment.appointment_services?.map((service, index) => (
                    <div key={index} className="flex justify-between items-center pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-gray-700 font-medium">{service.services?.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{formatPrice(service.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="md:col-span-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-5 border-2 border-orange-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                  </div>
                  <span className="text-3xl font-bold bg-orange-600 hover:bg-orange-700 bg-clip-text text-transparent">
                    {formatPrice(appointment.total_price)}
                  </span>
                </div>
              </div>

              {/* Notas */}
              {(appointment.notes || appointment.client_notes) && (
                <div className="md:col-span-2 bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <h3 className="font-semibold text-gray-900">Notas</h3>
                  </div>
                  <div className="space-y-3">
                    {appointment.client_notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Notas del cliente:</p>
                        <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">{appointment.client_notes}</p>
                      </div>
                    )}
                    {appointment.notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Notas internas:</p>
                        <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <TooltipProvider>
            <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50 rounded-b-2xl">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Menú desplegable con acciones secundarias */}
                {appointment.status !== 'cancelled' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 flex-shrink-0 rounded-lg hover:bg-gray-100 transition-all hover:scale-105"
                        disabled={updating}
                      >
                        <MoreVertical className="h-5 w-5 text-gray-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-48 z-[110] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
                    >
                      {/* Editar */}
                      {onEdit && appointment.status !== 'completed' && (
                        <>
                          <DropdownMenuItem
                            onClick={onEdit}
                            className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50 transition-colors"
                          >
                            <Edit className="w-4 h-4 mr-2 text-orange-600" />
                            <span>Editar cita</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}

                      {/* Confirmar */}
                      {appointment.status === 'pending' && (
                        <DropdownMenuItem
                          onClick={() => handleUpdateStatus('confirmed')}
                          className="cursor-pointer hover:bg-green-50 focus:bg-green-50 transition-colors"
                        >
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          <span>Confirmar</span>
                        </DropdownMenuItem>
                      )}

                      {/* En Progreso */}
                      {appointment.status === 'confirmed' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenuItem
                                onClick={() => canTakeAction && handleUpdateStatus('in_progress')}
                                disabled={!canTakeAction}
                                className={`cursor-pointer transition-colors ${
                                  canTakeAction
                                    ? 'hover:bg-blue-50 focus:bg-blue-50'
                                    : 'opacity-50 cursor-not-allowed'
                                }`}
                              >
                                <Clock className="w-4 h-4 mr-2 text-blue-600" />
                                <span>En Progreso</span>
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          {!canTakeAction && (
                            <TooltipContent side="right">
                              <p className="text-xs">Esta acción estará disponible cuando comience la cita</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      )}

                      {/* No Asistió */}
                      {(['confirmed', 'pending'].includes(appointment.status)) && (
                        <>
                          <DropdownMenuSeparator />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <DropdownMenuItem
                                  onClick={() => canTakeAction && handleUpdateStatus('no_show')}
                                  disabled={!canTakeAction}
                                  className={`cursor-pointer transition-colors ${
                                    canTakeAction
                                      ? 'hover:bg-orange-50 focus:bg-orange-50'
                                      : 'opacity-50 cursor-not-allowed'
                                  }`}
                                >
                                  <AlertCircle className="w-4 h-4 mr-2 text-orange-600" />
                                  <span>No Asistió</span>
                                </DropdownMenuItem>
                              </div>
                            </TooltipTrigger>
                            {!canTakeAction && (
                              <TooltipContent side="right">
                                <p className="text-xs">Esta acción estará disponible cuando comience la cita</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Botones principales - Premium Style */}
                <div className="flex-1 flex flex-wrap gap-3">
                  {/* Botón Ver Comprobante */}
                  {paymentReceipt && (
                    <Button
                      onClick={() => setReceiptViewerOpen(true)}
                      variant="outline"
                      className="flex-1 min-w-[140px] h-11 rounded-xl border-orange-100 shadow-sm font-black text-[9px] uppercase tracking-widest text-orange-600 hover:bg-orange-50/50 hover:text-orange-700 hover:border-orange-200 transition-all active:scale-95"
                    >
                      <FileImage className="w-4 h-4 mr-2" />
                      <span className="truncate">Comprobante</span>
                    </Button>
                  )}

                  {/* Botón principal: Finalizar y Cobrar / Registrar Pago */}
                  {hasPendingPayment && !checkingPayment && ['confirmed', 'in_progress', 'completed'].includes(appointment.status) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-1 min-w-[180px]">
                          <Button
                            onClick={handleOpenCheckout}
                            disabled={updating || !canTakeAction}
                            data-checkout-trigger
                            className={`w-full h-11 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all duration-300 active:scale-95 ${
                              canTakeAction && !updating
                                ? 'bg-gray-900 hover:bg-black text-white'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed border-none shadow-none'
                            }`}
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            <span className="truncate">{appointment.status === 'completed' ? 'Registrar Pago' : 'Finalizar y Cobrar'}</span>
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!canTakeAction && (
                        <TooltipContent>
                          <p className="text-xs">Esta acción estará disponible cuando comience la cita</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}

                  {/* Botón Reactivar cita - Solo visible para citas canceladas */}
                  {appointment.status === 'cancelled' && (
                    <Button
                      onClick={handleReactivate}
                      disabled={updating}
                      className="flex-1 min-w-[160px] h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      <span className="truncate">Reactivar Cita</span>
                    </Button>
                  )}

                  {/* Botón Cancelar cita */}
                  {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                    <Button
                      onClick={handleCancel}
                      disabled={updating}
                      variant="outline"
                      className="flex-1 min-w-[120px] h-11 rounded-xl border-red-50 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-100 font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
                    >
                      <span className="truncate">Cancelar</span>
                    </Button>
                  )}

                  {/* Botón Cerrar */}
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1 min-w-[100px] h-11 rounded-xl border-gray-100 shadow-sm font-black text-[9px] uppercase tracking-widest text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all active:scale-95"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          </TooltipProvider>

          {/* Receipt Viewer Modal */}
          {paymentReceipt && (
            <ReceiptViewer
              isOpen={receiptViewerOpen}
              onClose={() => setReceiptViewerOpen(false)}
              receiptUrl={paymentReceipt.url}
              transferReference={paymentReceipt.reference}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
