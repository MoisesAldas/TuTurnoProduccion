/**
 * PDFControls Component
 * Navigation and control panel for PDF preview - mobile responsive
 */

'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PDFControlsProps {
  currentPage: number
  totalPages: number
  zoom: number
  onPageChange: (page: number) => void
  onZoomChange: (zoom: number) => void
  onDownload: () => void
  filename?: string
  isFirstPage?: boolean
  isLastPage?: boolean
  canZoomIn?: boolean
  canZoomOut?: boolean
}

export const PDFControls: React.FC<PDFControlsProps> = ({
  currentPage,
  totalPages,
  zoom,
  onPageChange,
  onZoomChange,
  onDownload,
  filename = 'documento',
  isFirstPage = false,
  isLastPage = false,
  canZoomIn = true,
  canZoomOut = true,
}) => {
  const zoomPercentage = Math.round(zoom * 100)

  return (
    <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 sm:p-4">
      {/* Mobile Layout (< 640px) */}
      <div className="flex sm:hidden flex-col gap-3">
        {/* Top Row: Page Nav + Download */}
        <div className="flex items-center justify-between">
          {/* Page Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={isFirstPage}
              className="h-9 w-9 p-0"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={isLastPage}
              className="h-9 w-9 p-0"
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Download Button */}
          <Button
            size="sm"
            onClick={onDownload}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>
        </div>

        {/* Bottom Row: Zoom Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onZoomChange(zoom - 0.1)}
            disabled={!canZoomOut}
            className="h-9 w-9 p-0"
            aria-label="Alejar"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {zoomPercentage}%
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onZoomChange(zoom + 0.1)}
            disabled={!canZoomIn}
            className="h-9 w-9 p-0"
            aria-label="Acercar"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Desktop/Tablet Layout (>= 640px) */}
      <div className="hidden sm:flex items-center justify-between gap-4">
        {/* Page Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={isFirstPage}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
          <span className="text-sm font-medium px-3">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={isLastPage}
            aria-label="Página siguiente"
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onZoomChange(zoom - 0.1)}
            disabled={!canZoomOut}
            aria-label="Alejar"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[50px] text-center">
            {zoomPercentage}%
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onZoomChange(zoom + 0.1)}
            disabled={!canZoomIn}
            aria-label="Acercar"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Download Button */}
        <Button
          size="sm"
          onClick={onDownload}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Descargar PDF
        </Button>
      </div>

      {/* Keyboard Shortcuts Hint (Desktop Only) */}
      <div className="hidden lg:block mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        Atajos: ← → para navegar, + − para zum, ESC para cerrar
      </div>
    </div>
  )
}
