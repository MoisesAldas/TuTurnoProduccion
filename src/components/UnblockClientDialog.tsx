'use client'

import { useState } from 'react'
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
import { Unlock, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'

interface UnblockClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  businessId: string
  unblockedBy: string
  onSuccess: () => void
}

export default function UnblockClientDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  businessId,
  unblockedBy,
  onSuccess
}: UnblockClientDialogProps) {
  const [unblocking, setUnblocking] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const handleUnblock = async () => {
    try {
      setUnblocking(true)

      // Call the unblock_client RPC function
      const { data, error } = await supabase.rpc('unblock_client', {
        p_client_id: clientId,
        p_business_id: businessId,
        p_unblocked_by: unblockedBy
      })

      if (error) throw error

      // Check the response
      const response = data as { success: boolean; message: string }
      
      if (response.success) {
        toast({
          title: '✅ Cliente desbloqueado',
          description: `${clientName} puede volver a reservar citas.`,
        })
        onSuccess()
        onOpenChange(false)
      } else {
        throw new Error(response.message || 'No se pudo desbloquear al cliente')
      }
    } catch (error: any) {
      console.error('Error unblocking client:', error)
      toast({
        title: 'Error al desbloquear',
        description: error.message || 'No se pudo desbloquear al cliente. Intenta de nuevo.',
        variant: 'destructive'
      })
    } finally {
      setUnblocking(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <Unlock className="w-5 h-5 text-orange-600" />
            </div>
            <AlertDialogTitle>
              Desbloquear Cliente
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            <p>
              ¿Estás seguro de que deseas desbloquear a <strong className="text-gray-900 dark:text-white">{clientName}</strong>?
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 flex items-start gap-2 mt-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-bold mb-1">Ten en cuenta:</p>
                <ul className="list-disc list-inside space-y-1 opacity-80 font-medium">
                  <li>El cliente podrá volver a reservar citas inmediatamente</li>
                  <li>Su contador de cancelaciones se mantendrá</li>
                  <li>Si vuelve a cancelar, podría ser bloqueado nuevamente</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel disabled={unblocking}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUnblock}
            disabled={unblocking}
            className="bg-orange-600 hover:bg-orange-700 shadow-orange-600/20"
          >
            {unblocking ? (
              <>
                <div className="relative w-3.5 h-3.5 mr-2">
                  <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                Desbloqueando...
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 mr-2" />
                Desbloquear
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
