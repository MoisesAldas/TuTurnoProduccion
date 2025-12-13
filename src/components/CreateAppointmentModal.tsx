'use client'

import { useState, useEffect, useMemo } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { X, Calendar, Clock, User as UserIcon, Briefcase, FileText, ChevronRight, ChevronLeft, Check, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabaseClient'
import type { Employee, Service, Appointment } from '@/types/database'

type Client = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
}

// Business-managed client (from public.business_clients)
type BusinessClient = {
  id: string
  first_name: string
  last_name: string | null
  phone: string | null
  email: string | null
  is_active: boolean
}

interface CreateAppointmentModalProps {
  businessId: string
  selectedDate: Date
  selectedTime?: string
  selectedEmployeeId?: string
  appointment?: Appointment
  onClose: () => void
  onSuccess: () => void
}

export default function CreateAppointmentModal({
  businessId,
  selectedDate,
  selectedTime,
  selectedEmployeeId,
  appointment,
  onClose,
  onSuccess
}: CreateAppointmentModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [businessClients, setBusinessClients] = useState<BusinessClient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [currentStep, setCurrentStep] = useState(1)
  const [clientType, setClientType] = useState<'registered' | 'business_client' | 'walk_in'>('walk_in')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedBusinessClientId, setSelectedBusinessClientId] = useState('')
  const [walkInName, setWalkInName] = useState('')
  const [walkInPhone, setWalkInPhone] = useState('')
  const [selectedEmployeeIdState, setSelectedEmployeeIdState] = useState(selectedEmployeeId || '')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [appointmentDate, setAppointmentDate] = useState(selectedDate.toISOString().split('T')[0])
  const [startTime, setStartTime] = useState(selectedTime || '09:00')
  const [notes, setNotes] = useState('')
  const [clientNotes, setClientNotes] = useState('')

  const totalSteps = 4
  const supabase = createClient()
  const { toast } = useToast()

  // Debounced search for business clients
  const debouncedSearch = useDebouncedCallback(
    async (searchValue: string) => {
      const term = searchValue.trim()
      const { data } = await supabase.rpc('list_business_clients', {
        p_business_id: businessId,
        p_search: term || null,
        p_only_active: true,
        p_limit: 50,
        p_offset: 0,
        p_sort_by: 'first_name',
        p_sort_dir: 'asc',
      })
      setBusinessClients((data as any) || [])
    },
    300 // 300ms delay
  )

  useEffect(() => {
    fetchData()
  }, [businessId])

  // Reset search term when client type changes
  useEffect(() => {
    setSearchTerm('')
  }, [clientType])

  // Populate form fields when editing an appointment
  useEffect(() => {
    if (appointment) {
      // Set client type and info
      if (appointment.client_id) {
        setClientType('registered')
        setSelectedClientId(appointment.client_id)
      } else if ((appointment as any).business_client_id) {
        setClientType('business_client')
        setSelectedBusinessClientId((appointment as any).business_client_id)
      } else {
        setClientType('walk_in')
        setWalkInName(appointment.walk_in_client_name || '')
        setWalkInPhone(appointment.walk_in_client_phone || '')
      }

      // Set employee
      setSelectedEmployeeIdState(appointment.employee_id)

      // Set services
      if (appointment.appointment_services) {
        setSelectedServiceIds(appointment.appointment_services.map(s => s.service_id))
      }

      // Set date and time
      setAppointmentDate(appointment.appointment_date)
      setStartTime(appointment.start_time.substring(0, 5)) // Remove seconds

      // Set notes
      setNotes(appointment.notes || '')
      setClientNotes(appointment.client_notes || '')
    }
  }, [appointment])

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, is_active')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('first_name')

      if (employeesError) throw employeesError
      setEmployees((employeesData || []).map(emp => ({
        ...emp,
        business_id: businessId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })))

      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, price, duration_minutes, is_active')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name')

      if (servicesError) throw servicesError
      setServices((servicesData || []).map(service => ({
        ...service,
        business_id: businessId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })))

      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('client_id, users(id, first_name, last_name, phone, email)')
        .eq('business_id', businessId)

      if (appointmentsData) {
        const uniqueClients = Array.from(
          new Map(
            appointmentsData
              .filter(apt => apt.users)
              .map(apt => {
                const user = apt.users as any
                return [
                  user.id,
                  {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    phone: user.phone,
                    email: user.email
                  } as Client
                ]
              })
          ).values()
        ) as Client[]

        setClients(uniqueClients)
      }

      // Load a first page of business clients (active)
      const { data: bcData, error: bcError } = await supabase.rpc('list_business_clients', {
        p_business_id: businessId,
        p_search: null,
        p_only_active: true,
        p_limit: 50,
        p_offset: 0,
        p_sort_by: 'first_name',
        p_sort_dir: 'asc',
      })
      if (bcError) throw bcError
      setBusinessClients((bcData as any) || [])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Memoized calculations to avoid recalculating on every render
  const endTime = useMemo(() => {
    if (!startTime || selectedServiceIds.length === 0) return ''

    const totalDuration = selectedServiceIds.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId)
      return total + (service?.duration_minutes || 0)
    }, 0)

    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    startDate.setMinutes(startDate.getMinutes() + totalDuration)

    return startDate.toTimeString().substring(0, 5)
  }, [startTime, selectedServiceIds, services])

  const totalPrice = useMemo(() => {
    return selectedServiceIds.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId)
      return total + (service?.price || 0)
    }, 0)
  }, [selectedServiceIds, services])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const hasValidClient = clientType === 'registered'
      ? selectedClientId
      : clientType === 'business_client'
      ? selectedBusinessClientId
      : walkInName.trim()

    if (!hasValidClient || !selectedEmployeeIdState || selectedServiceIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor completa todos los campos obligatorios',
      })
      return
    }

    try {
      setSubmitting(true)

      const appointmentData: any = {
        business_id: businessId,
        employee_id: selectedEmployeeIdState,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        total_price: totalPrice,
        notes: notes || null,
        client_notes: clientNotes || null
      }

      // Only set status on creation
      if (!appointment) {
        appointmentData.status = 'confirmed'
      }

      if (clientType === 'registered') {
        appointmentData.client_id = selectedClientId
        appointmentData.walk_in_client_name = null
        appointmentData.walk_in_client_phone = null
        appointmentData.business_client_id = null
      } else if (clientType === 'business_client') {
        appointmentData.client_id = null
        appointmentData.business_client_id = selectedBusinessClientId
        appointmentData.walk_in_client_name = null
        appointmentData.walk_in_client_phone = null
      } else {
        appointmentData.client_id = null
        appointmentData.business_client_id = null
        appointmentData.walk_in_client_name = walkInName.trim()
        appointmentData.walk_in_client_phone = walkInPhone.trim() || null
      }

      let appointmentId: string

      if (appointment) {
        // EDIT MODE: Update existing appointment
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointment.id)

        if (appointmentError) throw appointmentError
        appointmentId = appointment.id

        // Send rescheduled email if appointment was edited
        const hasChanges =
          appointment.appointment_date !== appointmentDate ||
          appointment.start_time.substring(0, 5) !== startTime ||
          appointment.employee_id !== selectedEmployeeIdState

        if (hasChanges) {
          try {
            await fetch('/api/send-rescheduled-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                appointmentId: appointment.id,
                changes: {
                  oldDate: appointment.appointment_date !== appointmentDate ? appointment.appointment_date : undefined,
                  oldTime: appointment.start_time.substring(0, 5) !== startTime ? appointment.start_time : undefined,
                  oldEndTime: appointment.end_time,
                  oldEmployeeId: appointment.employee_id !== selectedEmployeeIdState ? appointment.employee_id : undefined
                }
              })
            })
          } catch (emailError) {
            console.warn('⚠️ Failed to send rescheduled email:', emailError)
            // Don't block the operation if email fails
          }
        }

        // Delete existing services
        const { error: deleteError } = await supabase
          .from('appointment_services')
          .delete()
          .eq('appointment_id', appointment.id)

        if (deleteError) throw deleteError
      } else {
        // CREATE MODE: Insert new appointment
        const { data: createdAppointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single()

        if (appointmentError) throw appointmentError
        appointmentId = createdAppointment.id
      }

      // Insert services (for both create and edit)
      const appointmentServices = selectedServiceIds.map(serviceId => {
        const service = services.find(s => s.id === serviceId)
        return {
          appointment_id: appointmentId,
          service_id: serviceId,
          price: service?.price || 0
        }
      })

      const { error: servicesError } = await supabase
        .from('appointment_services')
        .insert(appointmentServices)

      if (servicesError) throw servicesError

      toast({
        title: appointment ? '¡Cita actualizada exitosamente!' : '¡Cita creada exitosamente!',
        description: `Cita para ${clientType === 'walk_in' ? walkInName : 'el cliente'} ${appointment ? 'actualizada' : 'confirmada'}.`,
      })

      // Cerrar modal después de 1 segundo
      setTimeout(() => {
        onSuccess()
      }, 1000)

    } catch (error) {
      console.error('Error saving appointment:', error)
      toast({
        variant: 'destructive',
        title: appointment ? 'Error al actualizar la cita' : 'Error al crear la cita',
        description: 'Por favor intenta de nuevo.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredClients = clients.filter(client =>
    `${client.first_name} ${client.last_name} ${client.phone || ''} ${client.email || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return clientType === 'registered'
          ? !!selectedClientId
          : clientType === 'business_client'
          ? !!selectedBusinessClientId
          : !!walkInName.trim()
      case 2:
        return selectedServiceIds.length > 0 && !!selectedEmployeeIdState
      case 3:
        return !!appointmentDate && !!startTime
      case 4:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    } else {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor completa todos los campos obligatorios',
      })
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1: return 'Cliente'
      case 2: return 'Servicio y Empleado'
      case 3: return 'Fecha y Hora'
      case 4: return 'Confirmación'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-amber-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {appointment ? 'Editar Cita' : 'Nueva Cita'}
                </h2>
                <p className="text-xs text-gray-500">Paso {currentStep} de {totalSteps}: {getStepTitle(currentStep)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step < currentStep
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600'
                    : step === currentStep
                    ? 'bg-orange-400'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Step 1: Cliente */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <UserIcon className="w-5 h-5 text-orange-600" />
                  Tipo de cliente *
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <label
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      clientType === 'walk_in'
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clientType"
                      value="walk_in"
                      checked={clientType === 'walk_in'}
                      onChange={(e) => setClientType(e.target.value as any)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-2">👤</div>
                      <p className="font-medium text-gray-900">Walk-in</p>
                      <p className="text-xs text-gray-500 mt-1">Sin cuenta</p>
                    </div>
                  </label>
                  <label
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      clientType === 'registered'
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clientType"
                      value="registered"
                      checked={clientType === 'registered'}
                      onChange={(e) => setClientType(e.target.value as any)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-2">✓</div>
                      <p className="font-medium text-gray-900">Registrado</p>
                      <p className="text-xs text-gray-500 mt-1">Con cuenta</p>
                    </div>
                  </label>
                  <label
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      clientType === 'business_client'
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clientType"
                      value="business_client"
                      checked={clientType === 'business_client'}
                      onChange={(e) => setClientType(e.target.value as any)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-2">🏷️</div>
                      <p className="font-medium text-gray-900">Cliente del negocio</p>
                      <p className="text-xs text-gray-500 mt-1">Guardado por el negocio</p>
                    </div>
                  </label>
                </div>
              </div>

              {clientType === 'walk_in' && (
                <div className="space-y-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="space-y-2">
                    <Label htmlFor="walk-in-name">Nombre del cliente *</Label>
                    <Input
                      id="walk-in-name"
                      type="text"
                      placeholder="Ej: Juan Pérez"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      className="text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="walk-in-phone">Teléfono (opcional)</Label>
                    <Input
                      id="walk-in-phone"
                      type="tel"
                      placeholder="Ej: 0991234567"
                      value={walkInPhone}
                      onChange={(e) => setWalkInPhone(e.target.value)}
                      className="text-base"
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    💡 Este cliente no necesita una cuenta. Los datos se guardan solo para esta cita.
                  </p>
                </div>
              )}

              {clientType === 'registered' && (
                <div className="space-y-3">
                  <Label htmlFor="client">Cliente registrado *</Label>
                  <div className="relative">
                    <Input
                      id="client-search"
                      type="text"
                      placeholder="Escribe para buscar cliente..."
                      value={
                        selectedClientId
                          ? (() => {
                              const client = clients.find(c => c.id === selectedClientId)
                              return client ? `${client.first_name} ${client.last_name}` : searchTerm
                            })()
                          : searchTerm
                      }
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setSelectedClientId('')
                      }}
                      onFocus={() => setSearchTerm('')}
                      className="text-base"
                    />
                    {searchTerm && !selectedClientId && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredClients.length > 0 ? (
                          filteredClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => {
                                setSelectedClientId(client.id)
                                setSearchTerm('')
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">
                                {client.first_name} {client.last_name}
                              </div>
                              {client.phone && (
                                <div className="text-sm text-gray-600">{client.phone}</div>
                              )}
                              {client.email && (
                                <div className="text-sm text-gray-500">{client.email}</div>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-sm text-gray-500">
                            No se encontraron clientes
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedClientId && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="w-4 h-4" />
                      Cliente seleccionado
                    </div>
                  )}
                </div>
              )}

              {clientType === 'business_client' && (
                <div className="space-y-3">
                  <Label htmlFor="bc-client">Cliente del negocio *</Label>
                  <div className="relative">
                    <Input
                      id="bc-client-search"
                      type="text"
                      placeholder="Escribe para buscar cliente..."
                      value={
                        selectedBusinessClientId
                          ? (() => {
                              const client = businessClients.find(c => c.id === selectedBusinessClientId)
                              return client ? `${client.first_name} ${client.last_name || ''}` : searchTerm
                            })()
                          : searchTerm
                      }
                      onChange={(e) => {
                        const value = e.target.value
                        setSearchTerm(value)
                        setSelectedBusinessClientId('')
                        debouncedSearch(value)
                      }}
                      onFocus={() => setSearchTerm('')}
                      className="text-base"
                    />
                    {searchTerm && !selectedBusinessClientId && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {businessClients.length > 0 ? (
                          businessClients.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedBusinessClientId(c.id)
                                setSearchTerm('')
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">
                                {c.first_name} {c.last_name || ''}
                              </div>
                              {c.phone && (
                                <div className="text-sm text-gray-600">{c.phone}</div>
                              )}
                              {c.email && (
                                <div className="text-sm text-gray-500">{c.email}</div>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-sm text-gray-500">
                            {searchTerm ? 'No se encontraron clientes' : 'Escribe para buscar...'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedBusinessClientId && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="w-4 h-4" />
                      Cliente seleccionado
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Servicio y Empleado */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <Briefcase className="w-5 h-5 text-orange-600" />
                  Servicios * (selecciona uno o más)
                </Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${
                        selectedServiceIds.includes(service.id)
                          ? 'bg-orange-50 border-orange-300'
                          : 'hover:bg-gray-50 border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{service.name}</p>
                        <p className="text-xs text-gray-500">{service.duration_minutes} min</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">${service.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="employee" className="flex items-center gap-2 text-base font-semibold">
                  <UserIcon className="w-5 h-5 text-orange-600" />
                  Empleado *
                </Label>
                <Select value={selectedEmployeeIdState} onValueChange={setSelectedEmployeeIdState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Fecha y Hora */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    Fecha *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time" className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    Hora de inicio *
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="text-base"
                  />
                </div>
              </div>

              {selectedServiceIds.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Resumen de horario</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Duración total:</span>
                      <span className="font-medium text-gray-900">
                        {selectedServiceIds.reduce((total, id) => {
                          const service = services.find(s => s.id === id)
                          return total + (service?.duration_minutes || 0)
                        }, 0)} minutos
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hora de fin:</span>
                      <span className="font-medium text-gray-900">{endTime}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmación */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Check className="w-5 h-5 text-orange-600" />
                  Resumen de la cita
                </h3>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Cliente</p>
                    <p className="font-semibold text-gray-900">
                      {clientType === 'walk_in'
                        ? `${walkInName} ${walkInPhone ? `(${walkInPhone})` : ''}`
                        : clients.find(c => c.id === selectedClientId)
                          ? `${clients.find(c => c.id === selectedClientId)?.first_name} ${clients.find(c => c.id === selectedClientId)?.last_name}`
                          : 'No seleccionado'}
                      <span className="ml-2 text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                        {clientType === 'walk_in' ? 'Walk-in' : 'Registrado'}
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Empleado</p>
                    <p className="font-semibold text-gray-900">
                      {employees.find(e => e.id === selectedEmployeeIdState)
                        ? `${employees.find(e => e.id === selectedEmployeeIdState)?.first_name} ${employees.find(e => e.id === selectedEmployeeIdState)?.last_name}`
                        : 'No seleccionado'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Servicios ({selectedServiceIds.length})</p>
                    {selectedServiceIds.map(id => {
                      const service = services.find(s => s.id === id)
                      return service ? (
                        <div key={id} className="flex justify-between items-center text-sm mb-1">
                          <span className="text-gray-900">{service.name}</span>
                          <span className="font-medium text-gray-900">${service.price}</span>
                        </div>
                      ) : null
                    })}
                  </div>

                  <div className="pt-3 border-t border-orange-300">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Fecha y hora:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(appointmentDate).toLocaleDateString('es-ES')} • {startTime}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Duración:</span>
                      <span className="font-medium text-gray-900">
                        {selectedServiceIds.reduce((total, id) => {
                          const service = services.find(s => s.id === id)
                          return total + (service?.duration_minutes || 0)
                        }, 0)} min
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t-2 border-orange-300">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-2xl font-bold text-orange-600">
                        ${totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-notes" className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    Notas del cliente (opcional)
                  </Label>
                  <Textarea
                    id="client-notes"
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    placeholder="Notas o solicitudes especiales del cliente..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    Notas internas (opcional)
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas internas para el negocio..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer - Navigation */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 p-4 sm:p-6 flex gap-3">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
          )}

          {currentStep < totalSteps ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="flex-1 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white"
            >
              {submitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  {appointment ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {appointment ? 'Actualizar Cita' : 'Crear Cita'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
