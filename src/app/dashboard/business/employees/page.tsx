'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Search, Edit, Trash2, User, ArrowLeft, Users, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Business } from '@/types/database'

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
  const { authState } = useAuth()
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

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este empleado? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId)

      if (error) {
        console.error('Error deleting employee:', error)
        alert('Error al eliminar el empleado')
      } else {
        setEmployees(employees.filter(employee => employee.id !== employeeId))
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      alert('Error al eliminar el empleado')
    }
  }

  const filteredEmployees = employees.filter(employee =>
    employee.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando empleados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header con estadísticas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-500 mt-1">Gestiona el equipo de tu negocio</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link href="/dashboard/business/employees/metrics" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors">
              <BarChart3 className="w-4 h-4 mr-2" />
              Métricas
            </Button>
          </Link>
          <Link href="/dashboard/business/employees/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Empleado
            </Button>
          </Link>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Empleados</p>
                <p className="text-3xl font-bold text-gray-900">{employees.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Activos</p>
                <p className="text-3xl font-bold text-green-600">
                  {employees.filter(e => e.is_active).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Inactivos</p>
                <p className="text-3xl font-bold text-gray-500">
                  {employees.filter(e => !e.is_active).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Con Posición</p>
                <p className="text-3xl font-bold text-blue-600">
                  {employees.filter(e => e.position).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Buscar empleados por nombre, email o posición..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de empleados */}
      {filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {employees.length === 0 ? 'No tienes empleados registrados' : 'No se encontraron empleados'}
            </h3>
            <p className="text-gray-500 mb-6">
              {employees.length === 0
                ? 'Comienza agregando tu primer empleado para gestionar las citas y servicios.'
                : 'Intenta con una búsqueda diferente.'
              }
            </p>
            {employees.length === 0 && (
              <Link href="/dashboard/business/employees/new">
                <Button className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Empleado
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-orange-200 flex-shrink-0">
                    {employee.avatar_url ? (
                      <img
                        src={employee.avatar_url}
                        alt={`${employee.first_name} ${employee.last_name}`}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </CardTitle>
                      <Badge
                        className={employee.is_active
                          ? 'bg-green-100 text-green-800 border border-green-200 ml-2'
                          : 'bg-gray-100 text-gray-800 border border-gray-200 ml-2'
                        }
                      >
                        {employee.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    {employee.position && (
                      <p className="text-sm text-orange-600 font-medium">{employee.position}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Información de contacto */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {employee.email && (
                      <div className="text-sm">
                        <span className="text-gray-500">Email:</span>
                        <p className="text-gray-900 font-medium truncate">{employee.email}</p>
                      </div>
                    )}
                    {employee.phone && (
                      <div className="text-sm">
                        <span className="text-gray-500">Teléfono:</span>
                        <p className="text-gray-900 font-medium">{employee.phone}</p>
                      </div>
                    )}
                  </div>

                  {employee.bio && (
                    <div className="text-sm text-gray-600">
                      <p className="line-clamp-2">{employee.bio}</p>
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Link
                      href={`/dashboard/business/employees/${employee.id}`}
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEmployee(employee.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}