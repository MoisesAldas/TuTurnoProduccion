/**
 * EJEMPLO DE USO DEL DATATABLE
 *
 * Este archivo muestra cómo implementar el DataTable con TanStack Table
 * en cualquier página de tu aplicación.
 */

'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Edit, Trash } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// 1. Define el tipo de datos
type Employee = {
  id: string
  first_name: string
  last_name: string
  email: string
  position: string
  is_active: boolean
}

// 2. Define las columnas
export const columns: ColumnDef<Employee>[] = [
  {
    accessorKey: 'first_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.getValue('first_name')}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'last_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Apellido" />
    ),
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: 'position',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Posición" />
    ),
  },
  {
    accessorKey: 'is_active',
    header: 'Estado',
    cell: ({ row }) => {
      const isActive = row.getValue('is_active') as boolean
      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={
            isActive
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : 'bg-gray-200 text-gray-600 border-gray-300'
          }
        >
          {isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const employee = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => console.log('Edit', employee.id)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => console.log('Delete', employee.id)}
            >
              <Trash className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

// 3. Usa el DataTable en tu componente
export function EmployeesDataTableExample() {
  const data: Employee[] = [
    {
      id: '1',
      first_name: 'Juan',
      last_name: 'Pérez',
      email: 'juan@example.com',
      position: 'Barbero',
      is_active: true,
    },
    // ... más datos
  ]

  return (
    <div className="container mx-auto py-10">
      <DataTable
        columns={columns}
        data={data}
        searchKey="first_name"
        searchPlaceholder="Buscar empleados..."
      />
    </div>
  )
}

/**
 * CARACTERÍSTICAS INCLUIDAS:
 *
 * ✅ Sorting (ordenamiento) - Click en headers de columna
 * ✅ Filtering (filtrado) - Búsqueda por columna específica
 * ✅ Pagination (paginación) - Controles de navegación
 * ✅ Column Visibility - Mostrar/ocultar columnas
 * ✅ Row Selection - Selección múltiple (opcional)
 * ✅ Responsive - Mobile-friendly
 *
 * CÓMO USAR:
 *
 * 1. Importa: import { DataTable } from '@/components/ui/data-table'
 * 2. Define tus columnas con ColumnDef<TuTipo>[]
 * 3. Pasa tus datos y columnas al componente
 * 4. Opcionalmente configura searchKey para búsqueda
 *
 * EJEMPLO MÍNIMO:
 *
 * <DataTable
 *   columns={columns}
 *   data={data}
 * />
 *
 * CON BÚSQUEDA:
 *
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   searchKey="first_name"
 *   searchPlaceholder="Buscar por nombre..."
 * />
 */
