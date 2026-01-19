'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import {
  MoreVertical,
  Eye,
  Edit,
  Check,
  Clock,
  CreditCard,
  AlertCircle,
  XCircle,
  CheckCircle,
  Calendar,
  Phone,
  User,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

export type AppointmentRow = {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  total_price: number
  employee_id: string | null
  employee_name: string | null
  client_id: string | null
  client_name: string | null
  client_phone: string | null
  is_walk_in: boolean
  service_names: string[] | null
  total_count: number
}

// ============================================
// CALLBACKS INTERFACE
// ============================================

export interface AppointmentTableCallbacks {
  onView: (id: string) => void
  onEdit: (id: string) => void
  onConfirm: (id: string) => void
  onInProgress: (id: string) => void
  onCheckout: (id: string) => void
  onNoShow: (id: string) => void
  onCancel: (id: string) => void
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDate = (date: string) => {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-EC', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(price)
}

const getStatusBadge = (status: AppointmentRow['status']) => {
  const statusConfig = {
    pending: {
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-400 dark:border-yellow-800',
      label: 'Pendiente',
      icon: AlertCircle,
    },
    confirmed: {
      className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800',
      label: 'Confirmada',
      icon: CheckCircle,
    },
    in_progress: {
      className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-400 dark:border-purple-800',
      label: 'En Progreso',
      icon: Clock,
    },
    completed: {
      className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-400 dark:border-green-800',
      label: 'Completada',
      icon: CheckCircle,
    },
    cancelled: {
      className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-400 dark:border-red-800',
      label: 'Cancelada',
      icon: XCircle,
    },
    no_show: {
      className: 'bg-gray-200 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
      label: 'No asistió',
      icon: XCircle,
    },
  }
  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon
  return (
    <Badge className={`${config.className} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

// ============================================
// COLUMN DEFINITIONS
// ============================================

export const createColumns = (callbacks: AppointmentTableCallbacks): ColumnDef<AppointmentRow>[] => [
  // ========================================
  // COLUMNA: FECHA
  // ========================================
  {
    accessorKey: 'appointment_date',
    header: 'Fecha y Hora',
    cell: ({ row }) => {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {formatDate(row.original.appointment_date)}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {row.original.start_time?.substring(0, 5)} - {row.original.end_time?.substring(0, 5)}
          </div>
        </div>
      )
    },
  },

  // ========================================
  // COLUMNA: CLIENTE
  // ========================================
  {
    accessorKey: 'client_name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
    cell: ({ row }) => {
      return (
        <div>
          <div className="font-medium">{row.original.client_name}</div>
          {row.original.client_phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Phone className="h-3 w-3" />
              <span>{row.original.client_phone}</span>
            </div>
          )}
          {row.original.is_walk_in && (
            <Badge className="bg-orange-50 text-orange-700 border-orange-200 border text-[10px] px-1.5 py-0 mt-1 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800">
              Sin cita previa
            </Badge>
          )}
        </div>
      )
    },
  },

  // ========================================
  // COLUMNA: EMPLEADO
  // ========================================
  {
    accessorKey: 'employee_name',
    header: 'Profesional',
    cell: ({ row }) => {
      return row.original.employee_name ? (
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{row.original.employee_name}</span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">Sin asignar</span>
      )
    },
  },

  // ========================================
  // COLUMNA: SERVICIOS
  // ========================================
  {
    accessorKey: 'service_names',
    header: 'Servicios',
    cell: ({ row }) => {
      const services = row.original.service_names || []
      const servicesText = services.join(', ')
      return (
        <div className="max-w-[200px]">
          <span className="text-sm line-clamp-2">
            {servicesText || '-'}
          </span>
        </div>
      )
    },
  },

  // ========================================
  // COLUMNA: ESTADO
  // ========================================
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      return getStatusBadge(row.original.status)
    },
  },

  // ========================================
  // COLUMNA: PRECIO
  // ========================================
  {
    accessorKey: 'total_price',
    header: 'Total',
    cell: ({ row }) => {
      return (
        <div className="font-semibold">
          {formatPrice(Number(row.original.total_price || 0))}
        </div>
      )
    },
  },

  // ========================================
  // COLUMNA: ACCIONES
  // ========================================
  {
    id: 'actions',
    header: () => <div className="text-right">Acciones</div>,
    cell: ({ row }) => {
      const appointment = row.original

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Acciones
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Ver detalles */}
              <DropdownMenuItem
                onClick={() => callbacks.onView(appointment.id)}
                className="cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                <span>Ver detalles</span>
              </DropdownMenuItem>

              {/* Editar */}
              {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                <DropdownMenuItem
                  onClick={() => callbacks.onEdit(appointment.id)}
                  className="cursor-pointer"
                >
                  <Edit className="w-4 h-4 mr-2 text-orange-600 dark:text-orange-400" />
                  <span>Editar</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* Finalizar y Cobrar */}
              {['confirmed', 'in_progress'].includes(appointment.status) && (
                <DropdownMenuItem
                  onClick={() => callbacks.onCheckout(appointment.id)}
                  className="cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                  <span>Finalizar y Cobrar</span>
                </DropdownMenuItem>
              )}

              {/* Confirmar */}
              {appointment.status === 'pending' && (
                <DropdownMenuItem
                  onClick={() => callbacks.onConfirm(appointment.id)}
                  className="cursor-pointer"
                >
                  <Check className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                  <span>Confirmar</span>
                </DropdownMenuItem>
              )}

              {/* En Progreso */}
              {appointment.status === 'confirmed' && (
                <DropdownMenuItem
                  onClick={() => callbacks.onInProgress(appointment.id)}
                  className="cursor-pointer"
                >
                  <Clock className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <span>En Progreso</span>
                </DropdownMenuItem>
              )}

              {/* No Asistió */}
              {['confirmed', 'pending'].includes(appointment.status) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => callbacks.onNoShow(appointment.id)}
                    className="cursor-pointer"
                  >
                    <AlertCircle className="w-4 h-4 mr-2 text-orange-600 dark:text-orange-400" />
                    <span>No Asistió</span>
                  </DropdownMenuItem>
                </>
              )}

              {/* Cancelar */}
              {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => callbacks.onCancel(appointment.id)}
                    className="cursor-pointer text-red-600 dark:text-red-400"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    <span>Cancelar cita</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]
