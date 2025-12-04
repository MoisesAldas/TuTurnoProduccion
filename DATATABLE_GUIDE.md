# 📊 DataTable - Guía Completa

Sistema completo de tablas con **TanStack Table** + **shadcn/ui**

---

## ✅ Componentes Instalados

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| **DataTable** | `src/components/ui/data-table.tsx` | Componente principal con tabla completa |
| **DataTablePagination** | `src/components/ui/data-table-pagination.tsx` | Controles de paginación |
| **DataTableViewOptions** | `src/components/ui/data-table-view-options.tsx` | Mostrar/ocultar columnas |
| **DataTableColumnHeader** | `src/components/ui/data-table-column-header.tsx` | Headers con sorting |
| **Example** | `src/components/ui/data-table-example.tsx` | Ejemplo completo de uso |

---

## 🚀 Características

✅ **Sorting** - Ordenamiento por columna (ascendente/descendente)
✅ **Filtering** - Búsqueda global o por columna específica
✅ **Pagination** - Navegación entre páginas con selección de tamaño
✅ **Column Visibility** - Mostrar/ocultar columnas dinámicamente
✅ **Row Selection** - Selección múltiple (opcional)
✅ **Responsive** - Diseño mobile-first
✅ **TypeScript** - Tipado completo

---

## 📝 Uso Básico

### 1. Define tus datos

```typescript
type Employee = {
  id: string
  first_name: string
  last_name: string
  email: string
  position: string
  is_active: boolean
}

const data: Employee[] = [
  {
    id: '1',
    first_name: 'Juan',
    last_name: 'Pérez',
    email: 'juan@example.com',
    position: 'Barbero',
    is_active: true,
  },
  // ... más empleados
]
```

### 2. Define las columnas

```typescript
import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'

export const columns: ColumnDef<Employee>[] = [
  {
    accessorKey: 'first_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
  },
  {
    accessorKey: 'last_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Apellido" />
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email', // Header simple sin sorting
  },
  // ... más columnas
]
```

### 3. Usa el DataTable

```typescript
import { DataTable } from '@/components/ui/data-table'

export function EmployeesPage() {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="first_name"
      searchPlaceholder="Buscar empleados..."
    />
  )
}
```

---

## 🎨 Columnas Personalizadas

### Badge de Estado

```typescript
{
  accessorKey: 'is_active',
  header: 'Estado',
  cell: ({ row }) => {
    const isActive = row.getValue('is_active') as boolean
    return (
      <Badge
        variant={isActive ? 'default' : 'secondary'}
        className={isActive
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-gray-200 text-gray-600'
        }
      >
        {isActive ? 'Activo' : 'Inactivo'}
      </Badge>
    )
  },
}
```

### Avatar con Nombre

```typescript
{
  accessorKey: 'first_name',
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Nombre" />
  ),
  cell: ({ row }) => {
    const employee = row.original
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-orange-600" />
        </div>
        <span className="font-medium">
          {employee.first_name} {employee.last_name}
        </span>
      </div>
    )
  },
}
```

### Menú de Acciones

```typescript
{
  id: 'actions',
  cell: ({ row }) => {
    const item = row.original

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleEdit(item.id)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDelete(item.id)}>
            <Trash className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
}
```

### Formatear Fecha

```typescript
{
  accessorKey: 'created_at',
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Fecha" />
  ),
  cell: ({ row }) => {
    const date = new Date(row.getValue('created_at'))
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  },
}
```

---

## 🔧 Props del DataTable

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `columns` | `ColumnDef<TData>[]` | ✅ Sí | Definición de columnas |
| `data` | `TData[]` | ✅ Sí | Array de datos |
| `searchKey` | `string` | ❌ No | Columna para búsqueda (ej: "first_name") |
| `searchPlaceholder` | `string` | ❌ No | Placeholder del input de búsqueda |

---

## 🎯 Ejemplos de Implementación

### Página de Empleados

```typescript
// src/app/dashboard/business/employees/columns.tsx
export const employeeColumns: ColumnDef<Employee>[] = [
  {
    accessorKey: 'first_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
  },
  // ... más columnas
]

// src/app/dashboard/business/employees/page.tsx
import { DataTable } from '@/components/ui/data-table'
import { employeeColumns } from './columns'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Empleados</h1>
      <DataTable
        columns={employeeColumns}
        data={employees}
        searchKey="first_name"
        searchPlaceholder="Buscar empleados..."
      />
    </div>
  )
}
```

### Página de Servicios

```typescript
export const serviceColumns: ColumnDef<Service>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Servicio" />
    ),
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Precio" />
    ),
    cell: ({ row }) => {
      const price = parseFloat(row.getValue('price'))
      return `$${price.toFixed(2)}`
    },
  },
  {
    accessorKey: 'duration',
    header: 'Duración',
    cell: ({ row }) => {
      const duration = row.getValue('duration') as number
      return `${duration} min`
    },
  },
]
```

---

## 🎨 Temas y Estilos

### Tema Naranja (Business)

```typescript
// Personaliza los estilos para el tema naranja
<DataTable
  columns={columns}
  data={data}
  searchKey="name"
  searchPlaceholder="Buscar..."
  className="[&_[role=row]:hover]:bg-orange-50"
/>
```

### Tema Verde (Client)

```typescript
<DataTable
  columns={columns}
  data={data}
  searchKey="name"
  searchPlaceholder="Buscar..."
  className="[&_[role=row]:hover]:bg-emerald-50"
/>
```

---

## 📱 Responsive

El DataTable es completamente responsive:

- **Desktop**: Tabla completa con todas las columnas
- **Tablet**: Scroll horizontal automático
- **Mobile**: Diseño optimizado con columnas esenciales

Para ocultar columnas en mobile:

```typescript
{
  accessorKey: 'email',
  header: 'Email',
  // Oculta en mobile
  enableHiding: true,
}
```

---

## 🔍 Búsqueda Avanzada

### Búsqueda en Múltiples Columnas

```typescript
// Implementa búsqueda personalizada
const filteredData = data.filter(item =>
  item.first_name.toLowerCase().includes(search.toLowerCase()) ||
  item.last_name.toLowerCase().includes(search.toLowerCase()) ||
  item.email.toLowerCase().includes(search.toLowerCase())
)

<DataTable columns={columns} data={filteredData} />
```

---

## ⚡ Performance

### Optimización para Grandes Datasets

```typescript
import { useMemo } from 'react'

const columns = useMemo<ColumnDef<Employee>[]>(
  () => [
    // ... definiciones
  ],
  []
)

const data = useMemo(() => employees, [employees])
```

---

## 🐛 Troubleshooting

### Error: "Cannot read property 'getFilterValue'"

**Causa:** `searchKey` no coincide con ningún `accessorKey` en las columnas.

**Solución:** Asegúrate de que `searchKey` sea exactamente igual a un `accessorKey`:

```typescript
<DataTable
  columns={columns}
  data={data}
  searchKey="first_name" // ✅ Debe coincidir con accessorKey
/>
```

### La tabla no renderiza

**Causa:** Datos undefined o null.

**Solución:** Inicializa con array vacío:

```typescript
const [data, setData] = useState<Employee[]>([])
```

---

## 📚 Recursos

- [TanStack Table Docs](https://tanstack.com/table/latest)
- [shadcn/ui Table](https://ui.shadcn.com/docs/components/table)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table)

---

## ✨ Próximas Mejoras

- [ ] Exportar a CSV/Excel
- [ ] Filtros avanzados (múltiples columnas)
- [ ] Drag & Drop de columnas
- [ ] Edición inline
- [ ] Selección masiva con acciones

---

**Última actualización:** 2025-12-03
**Versión TanStack Table:** ^8.x
