/**
 * PDFPreviewModal Component
 * Main modal container for PDF preview - uses browser's native controls
 */

'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PDFViewer } from './PDFViewer'
import jsPDF from 'jspdf'
import { Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PDFPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  pdfDocument: jsPDF | null
  filename?: string
  onDownload?: () => void
  title?: string
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  pdfDocument,
  filename = 'documento',
  onDownload,
  title = 'Previsualización del Reporte',
}) => {
  const handleDownload = () => {
    onDownload?.()
    onClose()
  }

  if (!pdfDocument) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'p-0 gap-0 flex flex-col',
          // Mobile: Full screen
          'w-screen h-screen max-w-none rounded-none sm:rounded-lg',
          // Tablet: Large modal
          'sm:w-[95vw] sm:h-[85vh] sm:max-w-4xl',
          // Desktop: Extra large modal
          'lg:max-w-6xl lg:h-[90vh]'
        )}
      >
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-50">
              {title}
            </DialogTitle>

            <Button
              size="sm"
              onClick={handleDownload}
              className="sm:ml-auto bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto sm:mr-4"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </DialogHeader>


        {/* Viewer Area */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-950">
          {pdfDocument ? (
            <PDFViewer
              pdfDocument={pdfDocument}
              currentPage={1}
              zoom={1}
              className="h-full w-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-600" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Generando vista previa...</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
