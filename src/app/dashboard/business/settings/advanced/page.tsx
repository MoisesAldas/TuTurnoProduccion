'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Save, Settings, Clock, Calendar, Bell, Shield, X, Plus,
  AlertCircle, Info, CheckCircle2, Receipt
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Business } from '@/types/database'
import SpecialHoursManager from '@/components/SpecialHoursManager'
import InvoiceConfigSection from '@/components/InvoiceConfigSection'
import { useToast } from '@/hooks/use-toast'
import { advancedSettingsSchema, type AdvancedSettingsData } from '@/lib/validation'

interface SpecialHour {
  id: string
  special_date: string
  is_closed: boolean
  open_time: string | null
  close_time: string | null
  reason: string
  description: string | null
}

export default function AdvancedSettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('policies')
  const [specialHours, setSpecialHours] = useState<SpecialHour[]>([])
  const [loadingSpecialHours, setLoadingSpecialHours] = useState(false)

  const { authState } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<AdvancedSettingsData>({
    resolver: zodResolver(advancedSettingsSchema),
    mode: 'onSubmit',
    defaultValues: {
      cancellation_policy_hours: 24,
      cancellation_policy_text: 'Las citas deben ser canceladas con al menos 24 horas de anticipación.',
      allow_client_cancellation: true,
      allow_client_reschedule: true,
      min_booking_hours: 1,
      max_booking_days: 90,
      enable_reminders: true,
      reminder_hours_before: 24,
      reminder_email_enabled: true,
      reminder_sms_enabled: false,
      reminder_push_enabled: true,
      require_deposit: false,
      deposit_percentage: 0,
      auto_confirm_appointments: false,
    }
  })

  const enableReminders = watch('enable_reminders')
  const requireDeposit = watch('require_deposit')

  useEffect(() => {
    if (authState.user) {
      fetchBusiness()
      fetchSpecialHours()
    }
  }, [authState.user])

  const fetchBusiness = async () => {
    if (!authState.user) return

    try {
      setLoading(true)

      const { data: businessData, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', authState.user.id)
        .single()

      if (error) {
        console.error('Error fetching business:', error)
        router.push('/business/setup')
        return
      }

      setBusiness(businessData)

      // Llenar el formulario con los datos existentes
      reset({
        cancellation_policy_hours: businessData.cancellation_policy_hours || 24,
        cancellation_policy_text: businessData.cancellation_policy_text || 'Las citas deben ser canceladas con al menos 24 horas de anticipación.',
        allow_client_cancellation: businessData.allow_client_cancellation ?? true,
        allow_client_reschedule: businessData.allow_client_reschedule ?? true,
        min_booking_hours: businessData.min_booking_hours || 1,
        max_booking_days: businessData.max_booking_days || 90,
        enable_reminders: businessData.enable_reminders ?? true,
        reminder_hours_before: businessData.reminder_hours_before || 24,
        reminder_email_enabled: businessData.reminder_email_enabled ?? true,
        reminder_sms_enabled: businessData.reminder_sms_enabled ?? false,
        reminder_push_enabled: businessData.reminder_push_enabled ?? true,
        require_deposit: businessData.require_deposit ?? false,
        deposit_percentage: businessData.deposit_percentage || 0,
        auto_confirm_appointments: businessData.auto_confirm_appointments ?? false,
      })

    } catch (error) {
      console.error('Error fetching business:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSpecialHours = async () => {
    if (!authState.user) return

    try {
      setLoadingSpecialHours(true)

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', authState.user.id)
        .single()

      if (businessError || !businessData) return

      const { data, error } = await supabase
        .from('business_special_hours')
        .select('*')
        .eq('business_id', businessData.id)
        .order('special_date', { ascending: true })

      if (!error && data) {
        setSpecialHours(data)
      }
    } catch (error) {
      console.error('Error fetching special hours:', error)
    } finally {
      setLoadingSpecialHours(false)
    }
  }

  const onSubmit = async (data: AdvancedSettingsData) => {
    if (!business) return

    try {
      setSubmitting(true)

      const { error } = await supabase
        .from('businesses')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', business.id)

      if (error) throw error

      toast({
        title: '¡Configuraciones actualizadas!',
        description: 'Los ajustes avanzados han sido guardados exitosamente.',
      })
      await fetchBusiness()

    } catch (error) {
      console.error('Error updating settings:', error)
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: 'No se pudieron guardar las configuraciones. Intenta de nuevo.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración avanzada...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Configuraciones Avanzadas
            </h1>
            <p className="text-lg text-gray-600">
              Gestiona políticas, horarios especiales y recordatorios
            </p>
          </div>
          <Badge className="bg-orange-100 text-orange-700 border border-orange-200 w-fit px-4 py-2">
            <Settings className="w-4 h-4 mr-2" />
            {business?.name}
          </Badge>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              Estas configuraciones te ayudan a automatizar tu negocio y mejorar la experiencia de tus clientes.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Navegación fija en móvil */}
          <div className="lg:hidden sticky top-0 z-10 bg-white border-b shadow-sm mb-4">
            <div className="px-4 py-2">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una sección">
                    {activeTab === 'policies' && (
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>Políticas</span>
                      </div>
                    )}
                    {activeTab === 'booking' && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Restricciones</span>
                      </div>
                    )}
                    {activeTab === 'special-hours' && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Horarios Especiales</span>
                      </div>
                    )}
                    {activeTab === 'reminders' && (
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <span>Recordatorios</span>
                      </div>
                    )}
                    {activeTab === 'invoicing' && (
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        <span>Facturación</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policies">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>Políticas</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="booking">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Restricciones</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="special-hours">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Horarios Especiales</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="reminders">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      <span>Recordatorios</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="invoicing">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      <span>Facturación</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Tabs desktop */}
            <div className="hidden lg:block bg-white rounded-lg border shadow-sm p-1">
              <TabsList className="grid w-full grid-cols-5 gap-1 bg-transparent">
                <TabsTrigger
                  value="policies"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=inactive]:text-gray-700 transition-all duration-300 flex items-center justify-center gap-2 py-3"
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Políticas</span>
                </TabsTrigger>
                <TabsTrigger
                  value="booking"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=inactive]:text-gray-700 transition-all duration-300 flex items-center justify-center gap-2 py-3"
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Restricciones</span>
                </TabsTrigger>
                <TabsTrigger
                  value="special-hours"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=inactive]:text-gray-700 transition-all duration-300 flex items-center justify-center gap-2 py-3"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Horarios Especiales</span>
                </TabsTrigger>
                <TabsTrigger
                  value="reminders"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=inactive]:text-gray-700 transition-all duration-300 flex items-center justify-center gap-2 py-3"
                >
                  <Bell className="w-4 h-4" />
                  <span className="text-sm font-medium">Recordatorios</span>
                </TabsTrigger>
                <TabsTrigger
                  value="invoicing"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=inactive]:text-gray-700 transition-all duration-300 flex items-center justify-center gap-2 py-3"
                >
                  <Receipt className="w-4 h-4" />
                  <span className="text-sm font-medium">Facturación</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab 1: Políticas de Cancelación */}
            <TabsContent value="policies" className="space-y-6">
              <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
                <CardHeader className="border-b bg-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-orange-600" />
                    </div>
                    <span>Políticas de Cancelación</span>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Define las reglas para cancelar y reagendar citas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Horas de anticipación */}
                  <div className="space-y-2">
                    <Label htmlFor="cancellation_policy_hours">
                      Horas de anticipación requeridas
                    </Label>
                    <Input
                      id="cancellation_policy_hours"
                      type="number"
                      min="0"
                      max="168"
                      {...register('cancellation_policy_hours', { valueAsNumber: true })}
                      className="max-w-xs"
                    />
                    <p className="text-sm text-gray-500">
                      Tiempo mínimo antes de la cita para poder cancelar (máximo 7 días / 168 horas)
                    </p>
                    {errors.cancellation_policy_hours && (
                      <p className="text-sm text-red-600">{errors.cancellation_policy_hours.message}</p>
                    )}
                  </div>

                  {/* Texto de política */}
                  <div className="space-y-2">
                    <Label htmlFor="cancellation_policy_text">
                      Texto de la política de cancelación
                    </Label>
                    <Textarea
                      id="cancellation_policy_text"
                      {...register('cancellation_policy_text')}
                      rows={3}
                      placeholder="Describe tu política de cancelación..."
                    />
                    <p className="text-sm text-gray-500">
                      Este texto se mostrará a los clientes cuando reserven
                    </p>
                    {errors.cancellation_policy_text && (
                      <p className="text-sm text-red-600">{errors.cancellation_policy_text.message}</p>
                    )}
                  </div>

                  {/* Checkboxes de permisos */}
                  <div className="space-y-4 border-t pt-6">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="allow_client_cancellation"
                        {...register('allow_client_cancellation')}
                        className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <Label htmlFor="allow_client_cancellation" className="cursor-pointer font-medium">
                          Permitir que clientes cancelen sus citas
                        </Label>
                        <p className="text-sm text-gray-500">
                          Los clientes podrán cancelar desde su perfil
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="allow_client_reschedule"
                        {...register('allow_client_reschedule')}
                        className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <Label htmlFor="allow_client_reschedule" className="cursor-pointer font-medium">
                          Permitir que clientes reagenden sus citas
                        </Label>
                        <p className="text-sm text-gray-500">
                          Los clientes podrán modificar fecha/hora de sus citas
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Otras configuraciones */}
              <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
                <CardHeader className="border-b bg-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Settings className="w-5 h-5 text-orange-600" />
                    </div>
                    <span>Configuraciones Adicionales</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Auto-confirmar */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="auto_confirm_appointments"
                      {...register('auto_confirm_appointments')}
                      className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <Label htmlFor="auto_confirm_appointments" className="cursor-pointer font-medium">
                        Auto-confirmar citas
                      </Label>
                      <p className="text-sm text-gray-500">
                        Las reservas se confirmarán automáticamente sin requerir aprobación manual
                      </p>
                    </div>
                  </div>

                  {/* Depósito requerido */}
                  <div className="space-y-4 border-t pt-6">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="require_deposit"
                        {...register('require_deposit')}
                        className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <Label htmlFor="require_deposit" className="cursor-pointer font-medium">
                          Requerir depósito
                        </Label>
                        <p className="text-sm text-gray-500">
                          Solicitar un depósito para confirmar la reserva
                        </p>
                      </div>
                    </div>

                    {requireDeposit && (
                      <div className="ml-7 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label htmlFor="deposit_percentage">
                          Porcentaje de depósito (%)
                        </Label>
                        <Input
                          id="deposit_percentage"
                          type="number"
                          min="0"
                          max="100"
                          {...register('deposit_percentage', { valueAsNumber: true })}
                          className="max-w-xs"
                        />
                        <p className="text-sm text-gray-500">
                          Porcentaje del precio total del servicio
                        </p>
                        {errors.deposit_percentage && (
                          <p className="text-sm text-red-600">{errors.deposit_percentage.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Restricciones de Reserva */}
            <TabsContent value="booking" className="space-y-6">
              <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
                <CardHeader className="border-b bg-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <span>Restricciones de Reserva</span>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Define cuándo pueden reservar tus clientes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Anticipación mínima */}
                  <div className="space-y-2">
                    <Label htmlFor="min_booking_hours">
                      Anticipación mínima (horas)
                    </Label>
                    <Input
                      id="min_booking_hours"
                      type="number"
                      min="0"
                      max="72"
                      {...register('min_booking_hours', { valueAsNumber: true })}
                      className="max-w-xs"
                    />
                    <p className="text-sm text-gray-500">
                      Tiempo mínimo antes de la cita para poder reservar (máximo 72 horas / 3 días)
                    </p>
                    {errors.min_booking_hours && (
                      <p className="text-sm text-red-600">{errors.min_booking_hours.message}</p>
                    )}
                  </div>

                  {/* Días hacia el futuro */}
                  <div className="space-y-2">
                    <Label htmlFor="max_booking_days">
                      Días máximos hacia el futuro
                    </Label>
                    <Input
                      id="max_booking_days"
                      type="number"
                      min="1"
                      max="365"
                      {...register('max_booking_days', { valueAsNumber: true })}
                      className="max-w-xs"
                    />
                    <p className="text-sm text-gray-500">
                      Cuántos días hacia el futuro pueden reservar los clientes (máximo 365 días / 1 año)
                    </p>
                    {errors.max_booking_days && (
                      <p className="text-sm text-red-600">{errors.max_booking_days.message}</p>
                    )}
                  </div>

                  {/* Ejemplo visual */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-6">
                    <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Ejemplo de configuración actual:
                    </h4>
                    <p className="text-sm text-orange-800">
                      Los clientes podrán reservar con al menos{' '}
                      <strong>{watch('min_booking_hours')} hora(s)</strong> de anticipación,
                      hasta <strong>{watch('max_booking_days')} días</strong> en el futuro.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Horarios Especiales */}
            <TabsContent value="special-hours" className="space-y-6">
              <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
                <CardHeader className="border-b bg-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <span>Horarios Especiales y Feriados</span>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Gestiona días cerrados, feriados y horarios especiales
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-900 flex items-start gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Configura días especiales donde tu negocio tendrá horarios diferentes o estará cerrado.
                        Estos horarios tienen prioridad sobre los horarios regulares.
                      </span>
                    </p>
                  </div>

                  {loadingSpecialHours ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600">Cargando horarios especiales...</p>
                    </div>
                  ) : business ? (
                    <SpecialHoursManager
                      businessId={business.id}
                      specialHours={specialHours}
                      onUpdate={fetchSpecialHours}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 4: Recordatorios */}
            <TabsContent value="reminders" className="space-y-6">
              <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
                <CardHeader className="border-b bg-white">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Bell className="w-5 h-5 text-orange-600" />
                    </div>
                    <span>Recordatorios Automáticos</span>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Configura recordatorios para tus clientes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Activar recordatorios */}
                  <div className="flex items-start gap-3 border-b pb-6">
                    <input
                      type="checkbox"
                      id="enable_reminders"
                      {...register('enable_reminders')}
                      className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <Label htmlFor="enable_reminders" className="cursor-pointer font-medium text-base">
                        Activar recordatorios automáticos
                      </Label>
                      <p className="text-sm text-gray-500">
                        Los clientes recibirán recordatorios antes de sus citas
                      </p>
                    </div>
                  </div>

                  {enableReminders && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Horas antes */}
                      <div className="space-y-2">
                        <Label htmlFor="reminder_hours_before">
                          Horas antes de la cita
                        </Label>
                        <Input
                          id="reminder_hours_before"
                          type="number"
                          min="1"
                          max="168"
                          {...register('reminder_hours_before', { valueAsNumber: true })}
                          className="max-w-xs"
                        />
                        <p className="text-sm text-gray-500">
                          Cuándo enviar el recordatorio (máximo 7 días / 168 horas)
                        </p>
                        {errors.reminder_hours_before && (
                          <p className="text-sm text-red-600">{errors.reminder_hours_before.message}</p>
                        )}
                      </div>

                      {/* Canales de recordatorio */}
                      <div className="space-y-4 border-t pt-6">
                        <h4 className="font-medium text-gray-900">Canales de notificación</h4>

                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="reminder_email_enabled"
                            {...register('reminder_email_enabled')}
                            className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <Label htmlFor="reminder_email_enabled" className="cursor-pointer font-medium">
                              Recordatorio por Email
                            </Label>
                            <p className="text-sm text-gray-500">
                              Enviar recordatorios por correo electrónico
                            </p>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        </div>

                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="reminder_sms_enabled"
                            {...register('reminder_sms_enabled')}
                            className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <Label htmlFor="reminder_sms_enabled" className="cursor-pointer font-medium">
                              Recordatorio por SMS
                            </Label>
                            <p className="text-sm text-gray-500">
                              Enviar recordatorios por mensaje de texto
                            </p>
                            <Badge variant="secondary" className="mt-2 bg-yellow-100 text-yellow-800">
                              Próximamente
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="reminder_push_enabled"
                            {...register('reminder_push_enabled')}
                            className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <Label htmlFor="reminder_push_enabled" className="cursor-pointer font-medium">
                              Notificación Push
                            </Label>
                            <p className="text-sm text-gray-500">
                              Enviar notificaciones push en la aplicación
                            </p>
                            <Badge variant="secondary" className="mt-2 bg-yellow-100 text-yellow-800">
                              Próximamente
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Preview de recordatorio */}
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-6">
                        <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          Vista previa de recordatorio:
                        </h4>
                        <p className="text-sm text-orange-800">
                          Los clientes recibirán un recordatorio{' '}
                          <strong>{watch('reminder_hours_before')} hora(s)</strong> antes de su cita por{' '}
                          {[
                            watch('reminder_email_enabled') && 'Email',
                            watch('reminder_sms_enabled') && 'SMS',
                            watch('reminder_push_enabled') && 'Push'
                          ].filter(Boolean).join(', ') || 'ningún canal (selecciona al menos uno)'}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 5: Facturación */}
            <TabsContent value="invoicing" className="space-y-6">
              <InvoiceConfigSection />
            </TabsContent>
          </Tabs>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-sm py-4 border-t mt-6">
            <Link href="/dashboard/business/settings" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto hover:bg-gray-100 transition-colors">
                Volver a Configuración
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configuraciones
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
