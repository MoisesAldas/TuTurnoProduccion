'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Clock, Calendar, AlertCircle, CreditCard, Ban, DollarSign,
  CheckCircle, Info, CalendarX
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'

interface BusinessHours {
  day_of_week: number
  is_closed: boolean
  open_time?: string
  close_time?: string
}

interface SpecialHour {
  id: string
  special_date: string
  is_closed: boolean
  open_time?: string
  close_time?: string
  description?: string
  reason: 'holiday' | 'special_event' | 'maintenance' | 'custom'
}

interface BusinessSettings {
  min_booking_hours: number
  max_booking_days: number
  cancellation_policy_hours: number
  cancellation_policy_text?: string
  allow_client_cancellation: boolean
  allow_client_reschedule: boolean
  auto_confirm_appointments: boolean
  require_deposit: boolean
  deposit_percentage?: number
}

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const REASON_LABELS = {
  holiday: { label: 'Feriado', color: 'bg-red-100 text-red-700', icon: '🎉' },
  special_event: { label: 'Evento Especial', color: 'bg-blue-100 text-blue-700', icon: '🎊' },
  maintenance: { label: 'Mantenimiento', color: 'bg-orange-100 text-orange-700', icon: '🔧' },
  custom: { label: 'Otro', color: 'bg-gray-100 text-gray-700', icon: '📅' }
}

export default function BusinessInfoTab({ businessId }: { businessId: string }) {
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([])
  const [specialHours, setSpecialHours] = useState<SpecialHour[]>([])
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchBusinessInfo()
  }, [businessId])

  const fetchBusinessInfo = async () => {
    try {
      setLoading(true)

      // Fetch business hours
      const { data: hoursData } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', businessId)
        .order('day_of_week')

      if (hoursData) {
        setBusinessHours(hoursData)
      }

      // Fetch upcoming special hours
      const today = new Date().toISOString().split('T')[0]
      const { data: specialData } = await supabase
        .from('business_special_hours')
        .select('*')
        .eq('business_id', businessId)
        .gte('special_date', today)
        .order('special_date')
        .limit(10)

      if (specialData) {
        setSpecialHours(specialData)
      }

      // Fetch business settings
      const { data: businessData } = await supabase
        .from('businesses')
        .select(`
          min_booking_hours,
          max_booking_days,
          cancellation_policy_hours,
          cancellation_policy_text,
          allow_client_cancellation,
          allow_client_reschedule,
          auto_confirm_appointments,
          require_deposit,
          deposit_percentage
        `)
        .eq('id', businessId)
        .single()

      if (businessData) {
        setSettings(businessData)
      }

    } catch (error) {
      console.error('Error fetching business info:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time?: string) => {
    if (!time) return 'N/A'
    return time.substring(0, 5) // HH:MM
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Horarios de Atención */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Horarios de Atención
          </CardTitle>
        </CardHeader>
        <CardContent>
          {businessHours.length === 0 ? (
            <p className="text-gray-600">No hay horarios configurados.</p>
          ) : (
            <div className="space-y-2">
              {businessHours.map((hour) => (
                <div
                  key={hour.day_of_week}
                  className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border"
                >
                  <span className="font-medium text-gray-900 min-w-[120px]">
                    {DAYS_ES[hour.day_of_week]}
                  </span>
                  {hour.is_closed ? (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      Cerrado
                    </Badge>
                  ) : (
                    <span className="text-gray-700">
                      {formatTime(hour.open_time)} - {formatTime(hour.close_time)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Días Especiales / Feriados */}
      {specialHours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarX className="w-5 h-5 text-amber-600" />
              Días Especiales Próximos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {specialHours.map((special) => {
                const reasonInfo = REASON_LABELS[special.reason]
                return (
                  <Alert
                    key={special.id}
                    className={special.is_closed ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{reasonInfo.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">
                            {formatDate(special.special_date)}
                          </p>
                          <Badge className={reasonInfo.color}>
                            {reasonInfo.label}
                          </Badge>
                        </div>
                        {special.description && (
                          <p className="text-sm text-gray-700 mb-2">{special.description}</p>
                        )}
                        <p className="text-sm font-medium">
                          {special.is_closed ? (
                            <span className="text-red-700">🔒 Cerrado todo el día</span>
                          ) : (
                            <span className="text-blue-700">
                              Horario especial: {formatTime(special.open_time)} - {formatTime(special.close_time)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Alert>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Políticas de Reserva y Cancelación */}
      {settings && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Políticas de Reserva
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">Reserva Mínima</h4>
                  </div>
                  <p className="text-sm text-gray-700">
                    Debes reservar con al menos <strong>{settings.min_booking_hours} hora{settings.min_booking_hours !== 1 ? 's' : ''}</strong> de anticipación
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-semibold text-gray-900">Reserva Máxima</h4>
                  </div>
                  <p className="text-sm text-gray-700">
                    Puedes reservar hasta <strong>{settings.max_booking_days} día{settings.max_booking_days !== 1 ? 's' : ''}</strong> en el futuro
                  </p>
                </div>
              </div>

              {settings.auto_confirm_appointments && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    <strong>Confirmación Automática:</strong> Tus reservas serán confirmadas inmediatamente
                  </AlertDescription>
                </Alert>
              )}

              {settings.require_deposit && (
                <Alert className="bg-amber-50 border-amber-200">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">
                    <strong>Depósito Requerido:</strong> Se requiere un depósito del {settings.deposit_percentage}% para confirmar tu reserva
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" />
                Políticas de Cancelación y Reprogramación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.cancellation_policy_text && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">
                    {settings.cancellation_policy_text}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border ${
                  settings.allow_client_cancellation
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {settings.allow_client_cancellation ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Ban className="w-4 h-4 text-red-600" />
                    )}
                    <h4 className="font-semibold text-gray-900">Cancelaciones</h4>
                  </div>
                  {settings.allow_client_cancellation ? (
                    <p className="text-sm text-gray-700">
                      Puedes cancelar con al menos <strong>{settings.cancellation_policy_hours} hora{settings.cancellation_policy_hours !== 1 ? 's' : ''}</strong> de anticipación
                    </p>
                  ) : (
                    <p className="text-sm text-gray-700">
                      No se permiten cancelaciones por clientes. Contacta directamente al negocio.
                    </p>
                  )}
                </div>

                <div className={`p-4 rounded-lg border ${
                  settings.allow_client_reschedule
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {settings.allow_client_reschedule ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Ban className="w-4 h-4 text-red-600" />
                    )}
                    <h4 className="font-semibold text-gray-900">Reprogramaciones</h4>
                  </div>
                  {settings.allow_client_reschedule ? (
                    <p className="text-sm text-gray-700">
                      Puedes reprogramar con al menos <strong>{settings.cancellation_policy_hours} hora{settings.cancellation_policy_hours !== 1 ? 's' : ''}</strong> de anticipación
                    </p>
                  ) : (
                    <p className="text-sm text-gray-700">
                      No se permiten reprogramaciones por clientes. Contacta directamente al negocio.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Métodos de Pago */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            Métodos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-gray-50 rounded-lg border text-center">
              <div className="text-3xl mb-2">💵</div>
              <p className="text-sm font-medium text-gray-900">Efectivo</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border text-center">
              <div className="text-3xl mb-2">💳</div>
              <p className="text-sm font-medium text-gray-900">Transferencia</p>
            </div>
            <div className="p-4 bg-gray-100 rounded-lg border text-center opacity-50">
              <div className="text-3xl mb-2">💳</div>
              <p className="text-xs font-medium text-gray-600">Tarjetas</p>
              <p className="text-xs text-gray-500">(Próximamente)</p>
            </div>
            <div className="p-4 bg-gray-100 rounded-lg border text-center opacity-50">
              <div className="text-3xl mb-2">📱</div>
              <p className="text-xs font-medium text-gray-600">Pagos Móviles</p>
              <p className="text-xs text-gray-500">(Próximamente)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información Adicional */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          <strong>Nota:</strong> Esta información es referencial. Para consultas específicas, contacta directamente con el negocio.
        </AlertDescription>
      </Alert>
    </div>
  )
}
