'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ReceiptViewerProps {
  isOpen: boolean
  onClose: () => void
  receiptUrl: string
  transferReference?: string
}

export default function ReceiptViewer({
  isOpen,
  onClose,
  receiptUrl,
  transferReference
}: ReceiptViewerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-lg font-semibold">Comprobante de Transferencia</span>
            {transferReference && (
              <span className="text-sm text-gray-500 font-normal">
                Ref: {transferReference}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <img
            src={receiptUrl}
            alt="Comprobante de pago"
            className="w-full h-auto rounded-lg border border-gray-200 shadow-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => window.open(receiptUrl, '_blank')}
            className="w-full sm:w-auto"
          >
            Abrir en Nueva Pestaña
          </Button>
          <Button
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
