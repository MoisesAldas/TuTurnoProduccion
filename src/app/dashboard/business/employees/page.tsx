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
import { Plus, Search, Edit, Trash2, User, Users, BarChart3, Building, X } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Business } from '@/types/database'
import CreateEmployeeModal from '@/components/CreateEmployeeModal'
import EditEmployeeModal from '@/components/EditEmployeeModal'

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cargando empleados</h3>
          <p className="text-sm text-gray-600">Preparando la información...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Empleados</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
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
                className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Empleado
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Empleados</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Activos</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% activos` : ''}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Inactivos</p>
                <p className="text-3xl font-bold text-gray-500">{stats.inactive}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-slate-100 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Con Posición</p>
                <p className="text-3xl font-bold text-purple-600">{stats.withPosition}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Buscar empleados por nombre, email o posición..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500 shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Lista de empleados */}
      {filteredEmployees.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-200">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {employees.length === 0 ? 'No tienes empleados registrados' : 'No se encontraron empleados'}
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <Card
              key={employee.id}
              className={`
                hover:shadow-lg transition-all duration-200 group
                ${!employee.is_active ? 'bg-gray-50 opacity-75' : ''}
              `}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-orange-200 flex-shrink-0">
                      {employee.avatar_url ? (
                        <img
                          src={employee.avatar_url}
                          alt={`${employee.first_name} ${employee.last_name}`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-1">
                        {employee.first_name} {employee.last_name}
                      </CardTitle>
                      {employee.position && (
                        <p className="text-sm text-orange-600 font-medium">{employee.position}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={employee.is_active ? "default" : "secondary"}
                    className={employee.is_active
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0'
                      : 'bg-gray-200 text-gray-600 border border-gray-300 flex-shrink-0'
                    }
                  >
                    {employee.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {/* Información de contacto */}
                {(employee.email || employee.phone) && (
                  <div className="space-y-2">
                    {employee.email && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Email</span>
                        <span className="font-medium text-gray-900 truncate ml-2">{employee.email}</span>
                      </div>
                    )}
                    {employee.phone && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Teléfono</span>
                        <span className="font-medium text-gray-900">{employee.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {employee.bio && (
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {employee.bio}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEmployee(employee)
                      setEditModalOpen(true)
                    }}
                    className="flex-1 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors group-hover:border-orange-200 shadow-sm hover:shadow-md"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEmployeeToDelete(employee.id)
                      setDeleteDialogOpen(true)
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
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