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
import { Plus, Search, Edit, Trash2, User, Users, BarChart3, Building, X, CheckCircle2, Phone, Mail, FileText, CalendarDays, Briefcase } from 'lucide-react'
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

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeToDelete)

      if (error) {
        console.error('Error deleting employee:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Error al eliminar el empleado'
        })
      } else {
        setEmployees(employees.filter(employee => employee.id !== employeeToDelete))
        toast({
          title: 'Éxito',
          description: 'Empleado eliminado correctamente'
        })
        setDeleteDialogOpen(false)
        setEmployeeToDelete(null)
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al eliminar el empleado'
      })
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">Cargando empleados</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Preparando la información...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Sticky Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">Empleados</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gestiona el equipo de tu negocio
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {business && (
                <Badge className="hidden sm:flex bg-orange-100 text-orange-700 border-orange-200">
                  <Building className="w-4 h-4 mr-2" />
                  {business.name}
                </Badge>
              )}
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="w-full sm:w-auto  bg-orange-600 hover:bg-orange-700 shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Empleado
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Tarjetas de estadísticas */}
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

      {/* Barra de búsqueda */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
        <Input
          type="text"
          placeholder="Buscar empleados por nombre, email o posición..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-orange-500 focus:ring-orange-500 shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Lista de empleados */}
      {filteredEmployees.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-200 dark:border-gray-800">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
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
                overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col
                ${!employee.is_active ? 'bg-gray-50 dark:bg-gray-900/50 opacity-75' : ''}
              `}
            >
              <CardHeader className="pb-3 bg-gradient-to-br from-orange-50/50 via-amber-50/30 to-transparent dark:from-orange-900/10 dark:via-amber-900/10 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {employee.avatar_url ? (
                        <img
                          src={employee.avatar_url}
                          alt={`${employee.first_name} ${employee.last_name}`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-50 truncate">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      {employee.position && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium truncate">{employee.position}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={employee.is_active ? "default" : "secondary"}
                    className={employee.is_active
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 text-xs dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800 flex-shrink-0'
                      : 'bg-gray-200 text-gray-600 border-gray-300 text-xs dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 flex-shrink-0'
                    }
                  >
                    {employee.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col">
                <div className="space-y-3">
                  {employee.phone && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg min-w-0">
                      <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{employee.phone}</span>
                    </div>
                  )}
                  {employee.email && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg min-w-0">
                      <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate" title={employee.email}>{employee.email}</span>
                    </div>
                  )}
                  {employee.bio && (
                    <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/20 rounded-lg min-w-0">
                      <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{employee.bio}</span>
                    </div>
                  )}

                  {/* Services Badge */}
                  <div className="pt-2">
                    <EmployeeServicesBadge employeeId={employee.id} />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-4 mt-auto border-t border-gray-100 dark:border-gray-800">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(employee)
                        setEditModalOpen(true)
                      }}
                      className="hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors group-hover:border-orange-200 shadow-sm hover:shadow-md dark:hover:bg-orange-900/50 dark:hover:text-orange-400 dark:hover:border-orange-700 dark:group-hover:border-orange-800"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(employee)
                        setAbsencesModalOpen(true)
                      }}
                      className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors shadow-sm hover:shadow-md dark:hover:bg-blue-900/50 dark:hover:text-blue-400 dark:hover:border-blue-700"
                    >
                      <CalendarDays className="w-4 h-4 mr-2" />
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
                    className="w-full hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-colors shadow-sm hover:shadow-md dark:hover:bg-purple-900/50 dark:hover:text-purple-400 dark:hover:border-purple-700"
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Servicios
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEmployeeToDelete(employee.id)
                      setDeleteDialogOpen(true)
                    }}
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm hover:shadow-md dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-900/50 dark:hover:border-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
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
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente este empleado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false)
              setEmployeeToDelete(null)
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}