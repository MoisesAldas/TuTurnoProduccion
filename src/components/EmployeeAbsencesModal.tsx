'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {Loader2} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Calendar, Plus, Trash2, CalendarX, Clock, AlertCircle } from 'lucide-react'
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
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-0 border-none shadow-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden">
          <div className="px-6 py-8 sm:px-8">
            <DialogHeader className="mb-6">
              <div className="flex flex-col gap-0.5 relative pl-5">
                <div className="absolute left-0 w-1 h-6 bg-primary rounded-full mt-0.5" />
                <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-primary italic">Gestión de Personal</span>
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white italic">
                  Ausencias y Permisos
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm font-medium text-gray-500 dark:text-gray-400 pl-5">
                Configura los periodos de inactividad para <span className="text-primary font-bold">{employeeName}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Botón para mostrar/ocultar formulario */}
              <Button
                onClick={() => setShowForm(!showForm)}
                size="lg"
                className={`w-full rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-500 shadow-xl active:scale-95 ${
                  showForm 
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' 
                    : 'bg-primary hover:bg-orange-600 text-white shadow-orange-500/20'
                }`}
              >
                {showForm ? (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Ver Historial de Ausencias
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Nueva Ausencia
                  </>
                )}
              </Button>

              {/* Formulario */}
              {showForm && (
                <form onSubmit={handleSubmit} className="border-2 border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 bg-gray-50/30 dark:bg-gray-800/30 animate-in slide-in-from-top-4 duration-500">
                  <h4 className="font-black text-lg mb-6 text-gray-900 dark:text-white italic uppercase tracking-tight">Detalle del Permiso</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="absence_date" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">Fecha de Ausencia *</Label>
                      <Input
                        id="absence_date"
                        type="date"
                        value={formData.absence_date}
                        onChange={(e) => setFormData({...formData, absence_date: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                        className="h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 font-bold focus-visible:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reason" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">Motivo / Justificación *</Label>
                      <Select value={formData.reason} onValueChange={(value) => setFormData({...formData, reason: value})}>
                        <SelectTrigger className="h-12 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl focus:ring-primary font-bold">
                          <SelectValue placeholder="Selecciona un motivo" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-100 dark:border-gray-800 dark:bg-gray-900 shadow-2xl font-bold">
                          {reasonOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-xs hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer">
                              {option.emoji} {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mb-6 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <Switch
                      checked={formData.is_full_day}
                      onCheckedChange={(checked) => setFormData({...formData, is_full_day: checked})}
                      className="data-[state=checked]:bg-primary"
                    />
                    <div className="space-y-0.5">
                      <Label className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-widest cursor-pointer">Jornada Completa</Label>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Desactiva para ausencias por horas</p>
                    </div>
                  </div>

                  {!formData.is_full_day && (
                    <div className="grid grid-cols-2 gap-6 mb-6 animate-in zoom-in-95 duration-300">
                      <div className="space-y-2">
                        <Label htmlFor="start_time" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">Desde *</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                          className="h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 font-bold focus-visible:ring-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_time" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">Hasta *</Label>
                        <Input
                          id="end_time"
                          type="time"
                          value={formData.end_time}
                          onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                          className="h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 font-bold focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mb-6 space-y-2">
                    <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">Notas Internas</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Información adicional (opcional)..."
                      rows={2}
                      className="rounded-2xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 font-bold focus-visible:ring-primary text-sm min-h-[80px] resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="flex-1 h-12 bg-primary hover:bg-orange-600 text-white rounded-xl shadow-xl shadow-orange-500/20 font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                    >
                      {saving ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Finalizar Registro
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowForm(false)}
                      className="h-12 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-400"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}

              {/* Lista de ausencias */}
              {!showForm && (
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                      <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Consultando Agenda...</p>
                    </div>
                  ) : absences.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2.5rem] bg-gray-50/50 dark:bg-gray-800/30 group">
                      <div className="w-20 h-20 rounded-[2rem] bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm mx-auto mb-6 transition-transform group-hover:scale-110 duration-500">
                        <CalendarX className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                      </div>
                      <p className="text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest text-xs italic">No hay ausencias registradas</p>
                    </div>
                  ) : (
                    absences.map((absence) => (
                      <div
                        key={absence.id}
                        className="group border-2 border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 hover:shadow-xl hover:border-primary/20 dark:hover:border-primary/30 transition-all duration-500 bg-white dark:bg-gray-800/50 relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-4 relative z-10">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                              <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                                {formatDate(absence.absence_date)}
                              </span>
                              <Badge className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border-none shadow-sm ${getReasonColor(absence.reason)} bg-opacity-90`}>
                                {getReasonEmoji(absence.reason)} {getReasonLabel(absence.reason)}
                              </Badge>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800">
                                <Clock className="w-4 h-4 text-primary" />
                                {absence.is_full_day ? (
                                  <span className="font-bold text-[11px] uppercase tracking-wider">Día completo</span>
                                ) : (
                                  <span className="font-bold text-[11px] uppercase tracking-wider">{absence.start_time} — {absence.end_time}</span>
                                )}
                              </div>
                              
                              {absence.notes && (
                                <p className="text-xs font-medium italic opacity-80 truncate max-w-xs">
                                  "{absence.notes}"
                                </p>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setAbsenceToDelete(absence.id)
                              setDeleteDialogOpen(true)
                            }}
                            className="h-10 w-10 rounded-xl text-red-600 border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                           <Calendar className="w-24 h-24 text-primary" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <AlertDialogTitle>
                ¿Eliminar ausencia?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La ausencia será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 shadow-red-600/20"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
