'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Calendar, Plus, Trash2, CalendarX, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

interface EmployeeAbsencesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  employeeName: string
}

interface Absence {
  id: string
  absence_date: string
  reason: string
  is_full_day: boolean
  start_time?: string
  end_time?: string
  notes?: string
}

const reasonOptions = [
  { value: 'enfermedad', label: 'Enfermedad', emoji: '🤒' },
  { value: 'vacaciones', label: 'Vacaciones', emoji: '🏖️' },
  { value: 'personal', label: 'Personal', emoji: '👤' },
  { value: 'emergencia', label: 'Emergencia', emoji: '🚨' },
  { value: 'otro', label: 'Otro', emoji: '📝' }
]

export default function EmployeeAbsencesModal({
  open,
  onOpenChange,
  employeeId,
  employeeName
}: EmployeeAbsencesModalProps) {
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [absenceToDelete, setAbsenceToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    absence_date: '',
    reason: '',
    is_full_day: true,
    start_time: '',
    end_time: '',
    notes: ''
  })

  const { toast } = useToast()
  const { authState } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (open && employeeId) {
      fetchAbsences()
    }
  }, [open, employeeId])

  const fetchAbsences = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('employee_absences')
        .select('*')
        .eq('employee_id', employeeId)
        .order('absence_date', { ascending: false })

      if (error) {
        console.error('Error fetching absences:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar las ausencias'
        })
        return
      }

      setAbsences(data || [])
    } catch (error) {
      console.error('Error fetching absences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.absence_date || !formData.reason) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor completa la fecha y el motivo'
      })
      return
    }

    if (!formData.is_full_day && (!formData.start_time || !formData.end_time)) {
      toast({
        variant: 'destructive',
        title: 'Horarios incompletos',
        description: 'Para ausencias parciales, debes especificar hora de inicio y fin'
      })
      return
    }

    if (!formData.is_full_day && formData.start_time >= formData.end_time) {
      toast({
        variant: 'destructive',
        title: 'Horarios inválidos',
        description: 'La hora de inicio debe ser menor que la hora de fin'
      })
      return
    }

    try {
      setSaving(true)

      const absenceData = {
        employee_id: employeeId,
        absence_date: formData.absence_date,
        reason: formData.reason,
        is_full_day: formData.is_full_day,
        start_time: formData.is_full_day ? null : formData.start_time,
        end_time: formData.is_full_day ? null : formData.end_time,
        notes: formData.notes || null
      }

      // 1. Insertar ausencia
      const { error } = await supabase
        .from('employee_absences')
        .insert([absenceData])

      if (error) {
        console.error('Error creating absence:', error)
        if (error.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Ausencia duplicada',
            description: 'Ya existe una ausencia registrada para esta fecha'
          })
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo registrar la ausencia'
          })
        }
        return
      }

      // 1. Llamar a Edge Function para marcar citas y crear notificaciones
      if (authState.user) {
        // Obtener business_id del usuario
        const { data: businessData } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', authState.user.id)
          .single()

        if (businessData) {
          const { data: affectedData, error: edgeError } = await supabase.functions.invoke(
            'notify-employee-changes',
            {
              body: {
                type: 'employee_absence',
                employee_id: employeeId,
                business_id: businessData.id,
                absence_date: formData.absence_date,
                reason: formData.reason,
                is_full_day: formData.is_full_day,
                start_time: formData.start_time,
                end_time: formData.end_time
              }
            }
          )

          if (edgeError) {
            console.error('Error notifying clients:', edgeError)
          }

          // 3. Encolar emails desde el frontend (patrón Special Hours)
          const affectedAppointments = affectedData?.affected_appointments_data || []
          console.log('🔍 DEBUG: affectedData:', affectedData)
          console.log('🔍 DEBUG: affectedAppointments:', affectedAppointments)
          let emailsQueued = 0

          for (const appointment of affectedAppointments) {
            console.log('🔍 DEBUG: Processing appointment:', appointment)
            if (!appointment.client_email) continue

            const messageData = {
              appointment_id: appointment.id,
              type: 'employee_absence',
              employee_name: appointment.employee_name,
              absence_date: formData.absence_date,
              reason: formData.reason
            }
            console.log('🔍 DEBUG: messageData:', messageData)

            try {
              console.log('🔍 EMPLOYEE ABSENCE: Calling pgmq_send with queue: email_cancellations')
              const { error: queueError } = await supabase.rpc('pgmq_send', {
                queue_name: 'email_cancellations',
                msg: messageData
              })

              if (queueError) {
                console.error(`Error encolando email para cita ${appointment.id}:`, queueError)
              } else {
                emailsQueued++
              }
            } catch (emailError) {
              console.error('Error encolando email:', emailError)
            }
          }

          const affectedCount = affectedData?.affected_appointments || 0

          // 4. Reset form y mostrar resultado
          setFormData({
            absence_date: '',
            reason: '',
            is_full_day: true,
            start_time: '',
            end_time: '',
            notes: ''
          })

          setShowForm(false)
          fetchAbsences()

          if (affectedCount > 0) {
            toast({
              title: 'Ausencia registrada',
              description: `${affectedCount} citas fueron marcadas como pendientes. Se programaron ${emailsQueued} notificaciones.`,
              duration: 6000
            })
          } else {
            toast({
              title: 'Ausencia registrada',
              description: 'La ausencia se registró correctamente'
            })
          }
          return
        }
      }

      // Fallback si no hay business_id
      setFormData({
        absence_date: '',
        reason: '',
        is_full_day: true,
        start_time: '',
        end_time: '',
        notes: ''
      })
      setShowForm(false)
      fetchAbsences()
      toast({
        title: 'Ausencia registrada',
        description: 'La ausencia se registró correctamente'
      })

    } catch (error) {
      console.error('Error creating absence:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error al registrar la ausencia'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!absenceToDelete) return

    try {
      setIsDeleting(true)

      // 1. Obtener datos de la ausencia antes de eliminar
      const { data: absence } = await supabase
        .from('employee_absences')
        .select('*')
        .eq('id', absenceToDelete)
        .single()

      // 2. Eliminar ausencia
      const { error } = await supabase
        .from('employee_absences')
        .delete()
        .eq('id', absenceToDelete)

      if (error) {
        console.error('Error deleting absence:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo eliminar la ausencia'
        })
        return
      }

      // 3. Reactivar citas que fueron marcadas como pending por esta ausencia
      if (absence) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ 
            status: 'confirmed',
            pending_reason: null
          })
          .eq('employee_id', absence.employee_id)
          .eq('appointment_date', absence.absence_date)
          .eq('status', 'pending')
          .eq('pending_reason', 'employee_absence')

        if (updateError) {
          console.error('Error reactivating appointments:', updateError)
        }
      }

      fetchAbsences()
      toast({
        title: 'Ausencia eliminada',
        description: 'La ausencia se eliminó y las citas fueron reactivadas'
      })

    } catch (error) {
      console.error('Error deleting absence:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error al eliminar la ausencia'
      })
    } finally {
      setDeleteDialogOpen(false)
      setAbsenceToDelete(null)
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getReasonLabel = (reason: string) => {
    return reasonOptions.find(option => option.value === reason)?.label || reason
  }

  const getReasonEmoji = (reason: string) => {
    return reasonOptions.find(option => option.value === reason)?.emoji || '📝'
  }

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'enfermedad': return 'bg-red-100 text-red-800 border-red-200'
      case 'vacaciones': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'personal': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'emergencia': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <span>Ausencias y Permisos</span>
                <span className="block text-sm font-normal text-gray-600 mt-0.5">{employeeName}</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Botón para mostrar/ocultar formulario */}
            <Button
              onClick={() => setShowForm(!showForm)}
              size="sm"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {showForm ? (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Ver Ausencias
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Ausencia
                </>
              )}
            </Button>

            {/* Formulario */}
            {showForm && (
              <form onSubmit={handleSubmit} className="border-2 border-orange-200 rounded-lg p-6 bg-orange-50/30">
                <h4 className="font-semibold text-lg mb-4 text-gray-900">Nueva Ausencia</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="absence_date" className="text-sm font-medium">Fecha *</Label>
                    <Input
                      id="absence_date"
                      type="date"
                      value={formData.absence_date}
                      onChange={(e) => setFormData({...formData, absence_date: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="reason" className="text-sm font-medium">Motivo *</Label>
                    <Select value={formData.reason} onValueChange={(value) => setFormData({...formData, reason: value})}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecciona un motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {reasonOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.emoji} {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-3 mb-4 p-3 bg-white rounded-lg border">
                  <Switch
                    checked={formData.is_full_day}
                    onCheckedChange={(checked) => setFormData({...formData, is_full_day: checked})}
                    className="data-[state=checked]:bg-orange-600"
                  />
                  <Label className="font-medium cursor-pointer">Día completo</Label>
                </div>

                {!formData.is_full_day && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="start_time" className="text-sm font-medium">Hora inicio *</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_time" className="text-sm font-medium">Hora fin *</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <Label htmlFor="notes" className="text-sm font-medium">Notas adicionales</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Información adicional sobre la ausencia..."
                    rows={3}
                    className="mt-1.5"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Registrar Ausencia
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {/* Lista de ausencias */}
            {!showForm && (
              <div className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full"></div>
                  </div>
                ) : absences.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    <CalendarX className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600 font-medium mb-1">No hay ausencias registradas</p>
                    <p className="text-sm text-gray-500">Las ausencias que registres aparecerán aquí</p>
                  </div>
                ) : (
                  absences.map((absence) => (
                    <div
                      key={absence.id}
                      className="border-2 border-gray-200 rounded-lg p-5 hover:shadow-md transition-all bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="text-lg font-semibold text-gray-900">
                              {formatDate(absence.absence_date)}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getReasonColor(absence.reason)}`}>
                              {getReasonEmoji(absence.reason)} {getReasonLabel(absence.reason)}
                            </span>
                          </div>

                          <div className="flex items-center text-sm text-gray-600 mb-2 bg-gray-50 px-3 py-2 rounded-md">
                            <Clock className="w-4 h-4 mr-2 text-orange-600 flex-shrink-0" />
                            {absence.is_full_day ? (
                              <span className="font-medium">Día completo</span>
                            ) : (
                              <span><span className="font-medium">{absence.start_time}</span> - <span className="font-medium">{absence.end_time}</span></span>
                            )}
                          </div>

                          {absence.notes && (
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-200">{absence.notes}</p>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAbsenceToDelete(absence.id)
                            setDeleteDialogOpen(true)
                          }}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ausencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La ausencia será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
