'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { Calendar, Plus, Trash2, CalendarX, Clock, X } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'

interface EmployeeAbsencesProps {
  employeeId: string
  employeeName?: string
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

export default function EmployeeAbsences({ employeeId, employeeName }: EmployeeAbsencesProps) {
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [absenceToDelete, setAbsenceToDelete] = useState<string | null>(null)

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
  const supabase = createClient()

  useEffect(() => {
    if (employeeId) {
      fetchAbsences()
    }
  }, [employeeId])

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

      // Reset form
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

      fetchAbsences()
      toast({
        title: 'Ausencia eliminada',
        description: 'La ausencia se eliminó correctamente'
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

  if (loading) {
    return (
      <Card className="border-t-4 border-t-orange-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full mr-3"></div>
            <span className="text-gray-600">Cargando ausencias...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-t-4 border-t-orange-500 hover:shadow-lg transition-shadow">
        <CardHeader className="border-b bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <span>Ausencias y Permisos</span>
                {employeeName && <span className="block text-sm font-normal text-gray-600 mt-0.5">{employeeName}</span>}
              </div>
            </CardTitle>
            <Button
              onClick={() => setShowForm(!showForm)}
              size="sm"
              className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
            >
              {showForm ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Registrar Ausencia</span>
                  <span className="sm:hidden">Nueva</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {showForm && (
            <form onSubmit={handleSubmit} className="border-2 border-orange-200 rounded-lg p-4 sm:p-6 bg-orange-50/30">
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

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
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
                  className="flex-1 sm:flex-none"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {/* Lista de ausencias */}
          <div className="space-y-3">
            {absences.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <CalendarX className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600 font-medium mb-1">No hay ausencias registradas</p>
                <p className="text-sm text-gray-500">Las ausencias que registres aparecerán aquí</p>
              </div>
            ) : (
              absences.map((absence) => (
                <div
                  key={absence.id}
                  className="border-2 border-gray-200 rounded-lg p-4 sm:p-5 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-base sm:text-lg font-semibold text-gray-900">
                          {formatDate(absence.absence_date)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${getReasonColor(absence.reason)}`}>
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
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
                    >
                      <Trash2 className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Eliminar</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

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
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
