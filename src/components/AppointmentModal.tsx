'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Mail, Clock, DollarSign, Calendar, FileText, AlertCircle, Edit, Check, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabaseClient'
import { formatSpanishDate } from '@/lib/dateUtils'
import CheckoutModal from './CheckoutModal'
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
  const supabase = createClient()
  const { toast } = useToast()

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
        } catch (error) {
          console.error('Error checking payment status:', error)
          setHasPendingPayment(true) // Show button by default on error
        } finally {
          setCheckingPayment(false)
        }
      } else {
        setHasPendingPayment(false)
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

      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment.id)

      if (error) throw error

      // Send cancellation email
      try {
        await fetch('/api/send-cancellation-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: appointment.id,
            cancellationReason: 'Cancelada por el negocio'
          })
        })
      } catch (emailError) {
        console.warn('⚠️ Failed to send cancellation email:', emailError)
        // Don't block the operation if email fails
      }

      toast({
        title: 'Cita cancelada',
        description: 'La cita ha sido cancelada correctamente.',
      })
      onUpdate()
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

  const handleCheckoutSuccess = async () => {
    try {
      setUpdating(true)
      setShowCheckout(false)

      // Only mark as completed if not already completed
      if (appointment.status !== 'completed') {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', appointment.id)

        if (error) throw error

        toast({
          title: 'Cita completada',
          description: 'La cita ha sido completada y el pago registrado exitosamente.',
        })
      } else {
        toast({
          title: 'Pago registrado',
          description: 'El pago ha sido registrado exitosamente.',
        })
      }

      // Close the appointment modal and refresh
      onClose()
      onUpdate()
    } catch (error) {
      console.error('Error completing appointment:', error)
      toast({
        variant: 'destructive',
        title: 'Error al procesar',
        description: 'No se pudo completar la operación.',
      })
    } finally {
      setUpdating(false)
    }
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente */}
        <div className="relative bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 rounded-t-2xl p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white">Detalles de la Cita</h2>
              <p className="text-white/90 mt-1 text-sm">{formatDate(appointment.appointment_date)}</p>
              <div className="mt-3 flex items-center gap-2">
                <Badge className={`${statusConfig.className} border`}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${statusConfig.dotColor}`} />
                  {statusConfig.label}
                </Badge>
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
                <User className="w-4 h-4 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Cliente</h3>
                {!appointment.client_id && (
                  <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                    Walk-in
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
                  <AvatarFallback className="bg-gradient-to-br from-orange-600 to-amber-600 text-white text-lg">
                    {appointment.users
                      ? getInitials(appointment.users.first_name, appointment.users.last_name)
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
                      : appointment.walk_in_client_name || 'Cliente Walk-in'}
                  </p>
                  <div className="space-y-1 mt-2">
                    {(appointment.users?.phone || appointment.walk_in_client_phone) && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        {appointment.users?.phone || appointment.walk_in_client_phone}
                      </p>
                    )}
                    {appointment.users?.email && (
                      <p className="text-sm text-gray-600 flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{appointment.users.email}</span>
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
                <span className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
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
        <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50 rounded-b-2xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Menú desplegable con acciones secundarias */}
            {appointment.status !== 'cancelled' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-lg hover:bg-gray-100 transition-all hover:scale-105 self-start sm:self-auto"
                    disabled={updating}
                  >
                    <MoreVertical className="h-5 w-5 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-48 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
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
                    <DropdownMenuItem
                      onClick={() => handleUpdateStatus('in_progress')}
                      className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 transition-colors"
                    >
                      <Clock className="w-4 h-4 mr-2 text-blue-600" />
                      <span>En Progreso</span>
                    </DropdownMenuItem>
                  )}

                  {/* No Asistió */}
                  {(['confirmed', 'pending'].includes(appointment.status)) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleUpdateStatus('no_show')}
                        className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50 transition-colors"
                      >
                        <AlertCircle className="w-4 h-4 mr-2 text-orange-600" />
                        <span>No Asistió</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Botones principales */}
            <div className="flex-1 flex flex-col sm:flex-row items-stretch gap-3">
              {/* Botón principal: Finalizar y Cobrar / Registrar Pago */}
              {hasPendingPayment && !checkingPayment && ['confirmed', 'in_progress', 'completed'].includes(appointment.status) && (
                <Button
                  onClick={handleOpenCheckout}
                  disabled={updating}
                  data-checkout-trigger
                  className="w-full sm:flex-1 bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span className="truncate">{appointment.status === 'completed' ? 'Registrar Pago' : 'Finalizar y Cobrar'}</span>
                </Button>
              )}

              {/* Botón Cancelar cita */}
              {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                <Button
                  onClick={handleCancel}
                  disabled={updating}
                  variant="outline"
                  className="w-full sm:flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all hover:scale-105"
                >
                  <span className="truncate">Cancelar Cita</span>
                </Button>
              )}

              {/* Botón Cerrar */}
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full sm:flex-1 hover:bg-gray-100 transition-all hover:scale-105"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
