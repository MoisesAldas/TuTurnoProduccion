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

import { AlertTriangle, Info } from 'lucide-react'

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
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasOrphanedServices ? (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Advertencia: Servicios afectados
              </>
            ) : (
              <>¿Eliminar empleado?</>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {hasOrphanedServices ? (
                <>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>{employeeName}</strong> es el único empleado que puede 
                    realizar los siguientes servicios:
                  </p>

                  <div className="border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded p-3">
                    <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-200">
                      {orphanedServices.map(service => (
                        <li key={service.id} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-600 rounded-full flex-shrink-0" />
                          {service.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 rounded p-3">
                    <div className="flex gap-2">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900 dark:text-blue-200">
                        <strong className="block mb-1">¿Qué pasará?</strong>
                        <ul className="space-y-1 ml-4 list-disc">
                          <li>Estos servicios quedarán sin empleados asignados</li>
                          <li>Los clientes NO podrán reservarlos</li>
                          <li>Deberás asignar otro empleado a estos servicios</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Recomendación:</strong> Asigna estos servicios a otro 
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
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmDelete}
            className={hasOrphanedServices ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {hasOrphanedServices ? 'Eliminar de todos modos' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
