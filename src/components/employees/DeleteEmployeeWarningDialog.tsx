'use client'

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

import { AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Service {
  id: string
  name: string
}

interface DeleteEmployeeWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeName: string
  orphanedServices: Service[]
  onConfirmDelete: () => void
}

export default function DeleteEmployeeWarningDialog({
  open,
  onOpenChange,
  employeeName,
  orphanedServices,
  onConfirmDelete
}: DeleteEmployeeWarningDialogProps) {
  
  const hasOrphanedServices = orphanedServices.length > 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              hasOrphanedServices ? "bg-amber-50 dark:bg-amber-900/20" : "bg-red-50 dark:bg-red-900/20"
            )}>
              {hasOrphanedServices ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <AlertDialogTitle>
              {hasOrphanedServices ? "Servicios Afectados" : "¿Eliminar Empleado?"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {hasOrphanedServices ? (
                <>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>{employeeName}</strong> es el único empleado que puede 
                    realizar los siguientes servicios:
                  </p>

                  <div className="border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded-2xl p-3">
                    <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-200">
                      {orphanedServices.map(service => (
                        <li key={service.id} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-600 rounded-full flex-shrink-0" />
                          {service.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 rounded-2xl p-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm text-blue-900 dark:text-blue-200">
                        <strong className="block mb-1">¿Qué pasará?</strong>
                        <ul className="space-y-1 ml-4 list-disc opacity-80 font-medium">
                          <li>Estos servicios quedarán sin empleados asignados</li>
                          <li>Los clientes NO podrán reservarlos</li>
                          <li>Deberás asignar otro empleado a estos servicios</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium italic">
                    Recomendación: Asigna estos servicios a otro 
                    empleado antes de eliminar a {employeeName}.
                  </p>
                </>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  ¿Estás seguro de que deseas eliminar a <strong>{employeeName}</strong>?
                  Esta acción no se puede deshacer.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmDelete}
            className={cn(
              "shadow-lg",
              hasOrphanedServices 
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' 
                : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
            )}
          >
            {hasOrphanedServices ? 'Eliminar de todos modos' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
