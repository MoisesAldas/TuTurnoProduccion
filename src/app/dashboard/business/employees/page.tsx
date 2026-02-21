'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Plus, Search, Edit, Trash2, User, Users, BarChart3, Building, X, CheckCircle2, Phone, Mail, FileText, CalendarDays, Briefcase, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Business } from '@/types/database'
import CreateEmployeeModal from '@/components/CreateEmployeeModal'
import EditEmployeeModal from '@/components/EditEmployeeModal'
import EmployeeAbsencesModal from '@/components/EmployeeAbsencesModal'
import EmployeeServicesModal from '@/components/EmployeeServicesModal'
import EmployeeServicesBadge from '@/components/EmployeeServicesBadge'
import { StatsCard } from '@/components/StatsCard'
import DeleteEmployeeWarningDialog from '@/components/employees/DeleteEmployeeWarningDialog'
import { getServicesOnlyByEmployee } from '@/lib/employeeServicesApi'

// Tipo para empleados
interface Employee {
  id: string
  business_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  position?: string
  bio?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [absencesModalOpen, setAbsencesModalOpen] = useState(false)
  const [servicesModalOpen, setServicesModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Estados para validación de eliminación con servicios huérfanos
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false)
  const [employeeToDeleteObj, setEmployeeToDeleteObj] = useState<Employee | null>(null)
  const [orphanedServices, setOrphanedServices] = useState<any[]>([])
  
  const { authState } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()
  const router = useRouter()
  
  useEffect(() => {
    if (authState.user) {
      fetchData()
    }
  }, [authState.user])

  const fetchData = async () => {
    if (!authState.user) return

    try {
      setLoading(true)

      // Obtener información del negocio
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', authState.user.id)
        .single()

      if (businessError) {
        console.error('Error fetching business:', businessError)
        router.push('/business/setup')
        return
      }

      setBusiness(businessData)

      // Obtener empleados del negocio
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })

      if (employeesError) {
        console.error('Error fetching employees:', employeesError)
      } else {
        setEmployees(employeesData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Nueva función: Validar antes de eliminar (verifica servicios huérfanos)
  const handleDeleteClick = async (employee: Employee) => {
    // Verificar si hay servicios que solo este empleado puede realizar
    const { data: services } = await getServicesOnlyByEmployee(employee.id)
    
    setEmployeeToDeleteObj(employee)
    setOrphanedServices(services || [])
    setDeleteWarningOpen(true)
  }

  // Función de confirmación desde el dialog
  const confirmDeleteFromWarning = async () => {
    if (!employeeToDeleteObj) return
    
    setDeleteWarningOpen(false)
    
    // Ejecutar eliminación pasando directamente el ID
    await handleDeleteEmployee(employeeToDeleteObj.id)
    
    // Limpiar estados
    setEmployeeToDeleteObj(null)
    setOrphanedServices([])
  }

  const handleDeleteEmployee = async (employeeId?: string) => {
    // Usar el parámetro si se pasa, sino usar el estado
    const idToDelete = employeeId || employeeToDelete
    
    if (!idToDelete || !business) return

    try {
      setIsDeleting(true)

      // 1. Llamar a Edge Function para marcar citas como pending y crear notificaciones
      const { data: affectedData, error: edgeError } = await supabase.functions.invoke(
        'notify-employee-changes',
        {
          body: {
            type: 'employee_deleted',
            employee_id: idToDelete,
            business_id: business.id
          }
        }
      )

      if (edgeError) {
        console.error('Error notifying clients:', edgeError)
        toast({
          variant: 'destructive',
          title: 'Advertencia',
          description: 'No se pudo notificar a todos los clientes afectados'
        })
      }

      // 2. Encolar emails desde el frontend (patrón Special Hours)
      const affectedAppointments = affectedData?.affected_appointments_data || []
      let emailsQueued = 0

      for (const appointment of affectedAppointments) {
        if (!appointment.client_email) continue

        try {
          const { error: queueError } = await supabase.rpc('pgmq_send', {
            queue_name: 'email_cancellations',
            msg: {
              appointment_id: appointment.id,
              type: 'employee_deleted',
              employee_name: appointment.employee_name,
              reason: 'El empleado ya no forma parte del equipo'
            }
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

      // 3. Eliminar empleado
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', idToDelete)

      if (error) throw error

      // 4. Mostrar resumen
      const affectedCount = affectedData?.affected_appointments || 0
      
      setEmployees(employees.filter(e => e.id !== idToDelete))
      
      if (affectedCount > 0) {
        toast({
          title: 'Empleado eliminado',
          description: `${affectedCount} citas fueron marcadas como pendientes. Se programaron ${emailsQueued} notificaciones por email.`,
          duration: 6000
        })
      } else {
        toast({
          title: 'Empleado eliminado',
          description: 'El empleado fue eliminado correctamente'
        })
      }

      setDeleteDialogOpen(false)
      setEmployeeToDelete(null)

    } catch (error) {
      console.error('Error deleting employee:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al eliminar el empleado'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Memoize filtered employees (prevents re-filtering on every render)
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee =>
      employee.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [employees, searchQuery])

  // Memoize statistics (prevents recalculation on every render)
  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter(e => e.is_active).length,
    inactive: employees.filter(e => !e.is_active).length,
    withPosition: employees.filter(e => e.position).length
  }), [employees])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-orange-100 dark:border-orange-900/30 rounded-[2rem]"></div>
            <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-[2rem] animate-spin shadow-[0_0_15px_rgba(234,88,12,0.2)]"></div>
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">
            Configurando Equipo...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950/50 p-6">
      <div className="w-full space-y-8">
        {/* Premium Header - Integrated */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="relative pl-6">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(251,146,60,0.3)]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-0.5">
                Administración {business?.name && `• ${business.name}`}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-50 tracking-tight">
                Gestión del <span className="text-orange-600">Equipo</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl h-12 px-6 shadow-[0_4px_14px_0_rgba(251,146,60,0.39)] hover:shadow-[0_6px_20px_rgba(251,146,60,0.23)] transition-all duration-300 font-bold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Empleado
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Empleados"
          value={stats.total}
          description="Todos los empleados"
          icon={Users}
          variant="orange"
        />

        <StatsCard
          title="Activos"
          value={stats.active}
          description={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% activos` : 'Sin empleados'}
          icon={CheckCircle2}
          variant="green"
        />

        <StatsCard
          title="Inactivos"
          value={stats.inactive}
          description="Empleados inactivos"
          icon={User}
          variant="gray"
        />

        <StatsCard
          title="Con Posición"
          value={stats.withPosition}
          description="Empleados con posición definida"
          icon={BarChart3}
          variant="purple"
        />
      </div>

      {/* Search Bar - Premium Interactive */}
      <div className="relative group max-w-2xl">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 opacity-0 group-focus-within:opacity-100 transition-all duration-300 -translate-x-4 group-focus-within:translate-x-0">
          <Search className="w-4 h-4" />
        </div>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:opacity-0 transition-opacity">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
        <Input
          type="text"
          placeholder="Buscar empleados por nombre, email o posición..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-14 pl-12 pr-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-gray-100 dark:border-gray-800 rounded-[1.25rem] focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-300 font-medium text-gray-900 dark:text-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lista de empleados */}
      {filteredEmployees.length === 0 ? (
        <Card className="border-0 shadow-inner bg-gray-50/50 dark:bg-gray-900/30 rounded-[2.5rem]">
          <CardContent className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
              <Users className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-2">
              {employees.length === 0 ? 'No tienes empleados registrados' : 'No se encontraron empleados'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {employees.length === 0
                ? 'Los empleados son la base de tu negocio. Comienza agregando tu primer empleado para que puedan gestionar las citas y servicios.'
                : `No encontramos empleados que coincidan con "${searchQuery}". Intenta con una búsqueda diferente.`
              }
            </p>
            {employees.length === 0 && (
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Empleado
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((employee) => (
            <Card
              key={employee.id}
              className={`
                overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] dark:bg-gray-900 rounded-[2.25rem] hover:shadow-xl transition-all duration-300 group flex flex-col
                ${!employee.is_active ? 'opacity-75 grayscale-[0.5]' : ''}
              `}
            >
              <CardHeader className="pb-3 pt-5 px-6 bg-gradient-to-br from-orange-50/50 via-transparent to-transparent dark:from-orange-900/5 dark:via-transparent dark:to-transparent relative">
                {/* Vertical Accent */}
                <div className="absolute left-0 top-6 w-1.5 h-8 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(251,146,60,0.3)] transition-transform group-hover:scale-y-110" />
                
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-[1rem] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                      {employee.avatar_url ? (
                        <img
                          src={employee.avatar_url}
                          alt={`${employee.first_name} ${employee.last_name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600 dark:text-orange-500 mb-0.5 truncate">
                        {employee.position || 'Colaborador'}
                      </p>
                      <h3 className="text-sm sm:text-base font-black tracking-tight text-gray-900 dark:text-gray-50 truncate">
                        {employee.first_name} {employee.last_name}
                      </h3>
                    </div>
                  </div>
                  <Badge
                    variant={employee.is_active ? "default" : "secondary"}
                    className={employee.is_active
                      ? 'bg-emerald-100 text-emerald-700 border-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold dark:bg-emerald-900/40 dark:text-emerald-400 flex-shrink-0'
                      : 'bg-gray-100 text-gray-500 border-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold dark:bg-gray-800 dark:text-gray-400 flex-shrink-0'
                    }
                  >
                    {employee.is_active ? '● Activo' : '○ Inactivo'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-1 pb-5 px-6 flex-1 flex flex-col">
                <div className="space-y-2">
                  {employee.phone && (
                    <div className="flex items-center gap-2.5 p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl min-w-0 border border-transparent hover:border-orange-100 dark:hover:border-orange-900/30 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-blue-100/50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{employee.phone}</span>
                    </div>
                  )}
                  {employee.email && (
                    <div className="flex items-center gap-2.5 p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl min-w-0 border border-transparent hover:border-orange-100 dark:hover:border-orange-900/30 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-purple-100/50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate" title={employee.email}>{employee.email}</span>
                    </div>
                  )}
                  {employee.bio && (
                    <div className="flex items-start gap-2.5 p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gray-200/50 dark:bg-gray-700/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <span className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-1">{employee.bio}</span>
                    </div>
                  )}

                  {/* Services Badge */}
                  <div className="pt-1">
                    <EmployeeServicesBadge employeeId={employee.id} />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-4 mt-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(employee)
                        setEditModalOpen(true)
                      }}
                      className="rounded-xl border-gray-200 dark:border-gray-800 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-all font-bold text-[11px] h-9 dark:hover:bg-orange-900/40"
                    >
                      <Edit className="w-3 h-3 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(employee)
                        setAbsencesModalOpen(true)
                      }}
                      className="rounded-xl border-gray-200 dark:border-gray-800 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all font-bold text-[11px] h-9 dark:hover:bg-blue-900/40"
                    >
                      <CalendarDays className="w-3 h-3 mr-1.5" />
                      Ausencias
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEmployee(employee)
                      setServicesModalOpen(true)
                    }}
                    className="w-full rounded-xl border-gray-200 dark:border-gray-800 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-all font-bold text-[11px] h-9 dark:hover:bg-purple-900/40"
                  >
                    <Briefcase className="w-3 h-3 mr-1.5" />
                    Servicios
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(employee)}
                    className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 transition-all font-bold text-[11px] h-8 dark:hover:bg-red-900/40"
                  >
                    <Trash2 className="w-3 h-3 mr-1.5" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

      {/* Create Employee Modal */}
      {business && (
        <CreateEmployeeModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          business={business}
          onSuccess={fetchData}
        />
      )}

      {/* Edit Employee Modal */}
      <EditEmployeeModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        employee={selectedEmployee}
        onSuccess={fetchData}
      />

      {/* Employee Absences Modal */}
      {selectedEmployee && (
        <EmployeeAbsencesModal
          open={absencesModalOpen}
          onOpenChange={setAbsencesModalOpen}
          employeeId={selectedEmployee.id}
          employeeName={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
        />
      )}

      {/* Employee Services Modal */}
      {selectedEmployee && business && (
        <EmployeeServicesModal
          open={servicesModalOpen}
          onOpenChange={setServicesModalOpen}
          employeeId={selectedEmployee.id}
          employeeName={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
          businessId={business.id}
          onSuccess={fetchData}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <AlertDialogTitle>
                ¿Estás seguro?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este empleado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false)
              setEmployeeToDelete(null)
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteEmployee()}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 shadow-red-600/20"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    
    
    {/* Delete Employee Warning Dialog - Con validación de servicios huérfanos */}
    <DeleteEmployeeWarningDialog
      open={deleteWarningOpen}
      onOpenChange={setDeleteWarningOpen}
      employeeName={employeeToDeleteObj ? `${employeeToDeleteObj.first_name} ${employeeToDeleteObj.last_name}` : ''}
      orphanedServices={orphanedServices}
      onConfirmDelete={confirmDeleteFromWarning}
    />
    </div>
    
  )
}