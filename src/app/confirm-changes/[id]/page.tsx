'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, Calendar, Clock, User, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { formatSpanishDate } from '@/lib/dateUtils'
import Link from 'next/link'

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  total_price: number
  status: string
  business: {
    name: string
    address?: string
  }
  appointment_services: {
    service: {
      name: string
    }
    price: number
  }[]
  employee: {
    first_name: string
    last_name: string
  }
}

export default function ConfirmChangesPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  const appointmentId = params.id as string
  const action = searchParams.get('action') as 'accept' | 'cancel' | 'reschedule' | null
  const token = searchParams.get('token')

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (appointmentId) {
      fetchAppointment()
    }
  }, [appointmentId])

  const fetchAppointment = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          business:businesses(name, address),
          appointment_services(
            service:services(name),
            price
          ),
          employee:employees(first_name, last_name)
        `)
        .eq('id', appointmentId)
        .single()

      if (fetchError) {
        console.error('Error fetching appointment:', fetchError)
        setError('No se pudo cargar la información de la cita')
        return
      }

      setAppointment(data)
    } catch (err) {
      console.error('Error:', err)
      setError('Ocurrió un error al cargar la cita')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!action || !token) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Faltan parámetros requeridos'
      })
      return
    }

    try {
      setProcessing(true)

      const response = await fetch(`/api/appointments/${appointmentId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, token })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: '✓ Éxito',
          description: result.message
        })

        // Esperar un momento antes de redirigir
        setTimeout(() => {
          if (action === 'reschedule') {
            router.push(result.redirectUrl)
          } else {
            router.push('/dashboard/client/appointments')
          }
        }, 1500)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'No se pudo procesar la solicitud'
        })
      }
    } catch (err) {
      console.error('Error confirming action:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error al procesar tu solicitud'
      })
    } finally {
      setProcessing(false)
    }
  }

  const getActionConfig = () => {
    switch (action) {
      case 'accept':
        return {
          title: '✓ Confirmar Cambios',
          description: '¿Estás seguro de que deseas aceptar los cambios realizados por el negocio?',
          buttonText: 'Sí, aceptar cambios',
          buttonClass: 'bg-green-600 hover:bg-green-700',
          icon: <CheckCircle className="w-12 h-12 text-green-600" />
        }
      case 'cancel':
        return {
          title: '✕ Cancelar Cita',
          description: '¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.',
          buttonText: 'Sí, cancelar cita',
          buttonClass: 'bg-red-600 hover:bg-red-700',
          icon: <XCircle className="w-12 h-12 text-red-600" />
        }
      case 'reschedule':
        return {
          title: '📅 Reprogramar Cita',
          description: 'Serás redirigido a la página de tu cita donde podrás modificar la fecha y hora.',
          buttonText: 'Continuar a reprogramación',
          buttonClass: 'bg-orange-600 hover:bg-orange-700',
          icon: <Calendar className="w-12 h-12 text-orange-600" />
        }
      default:
        return null
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-slate-900 mx-auto mb-4" />
          <p className="text-gray-600">Cargando información de la cita...</p>
        </div>
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error || 'No se pudo cargar la cita'}</p>
            <Link href="/dashboard/client/appointments">
              <Button className="w-full bg-slate-900 hover:bg-slate-800">
                Volver a mis citas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!action || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              Enlace Inválido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Este enlace no es válido o ha expirado.</p>
            <Link href="/dashboard/client/appointments">
              <Button className="w-full bg-slate-900 hover:bg-slate-800">
                Volver a mis citas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const actionConfig = getActionConfig()

  if (!actionConfig) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            {actionConfig.icon}
          </div>
          <CardTitle className="text-2xl">{actionConfig.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {actionConfig.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Detalles de la cita */}
          <div className="bg-slate-50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-lg text-slate-900 mb-4">Detalles de la Cita</h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-slate-600 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Negocio</p>
                  <p className="font-semibold text-slate-900">{appointment.business.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-slate-600 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Fecha</p>
                  <p className="font-semibold text-slate-900">
                    {formatSpanishDate(appointment.appointment_date, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-slate-600 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Hora</p>
                  <p className="font-semibold text-slate-900">
                    {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-slate-600 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Profesional</p>
                  <p className="font-semibold text-slate-900">
                    {appointment.employee.first_name} {appointment.employee.last_name}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <p className="text-sm text-slate-600 mb-2">Servicios</p>
                {appointment.appointment_services.map((appService, index) => (
                  <div key={index} className="flex justify-between items-center mb-1">
                    <span className="text-slate-900">{appService.service.name}</span>
                    <span className="font-semibold text-slate-900">{formatPrice(appService.price)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="font-bold text-lg text-slate-900">{formatPrice(appointment.total_price)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Advertencia para cancelación */}
          {action === 'cancel' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Advertencia:</strong> Esta acción no se puede deshacer. El negocio será notificado de la cancelación.
              </AlertDescription>
            </Alert>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleConfirm}
              disabled={processing}
              className={`flex-1 ${actionConfig.buttonClass} text-white`}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                actionConfig.buttonText
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={processing}
              className="flex-1 border-2"
            >
              Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
