/**
 * ExportButton Component
 * Reusable button with dropdown for exporting analytics data
 * Supports Excel and PDF formats with PDF preview
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileBarChart, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AnalyticsExportData, ExportFormat } from '@/lib/export/types'
import { exportToExcel } from '@/lib/export/exportToExcel'
import { generatePDFDocument } from '@/lib/export/exportToPDF'
import { PDFPreviewModal } from '@/components/pdf'
import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ExportButtonProps {
  data: AnalyticsExportData
  filename?: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  disabled?: boolean
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename,
  variant = 'default',
  size = 'sm',
  className = '',
  disabled = false
}) => {
  const [exporting, setExporting] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null)
  const [showPDFPreview, setShowPDFPreview] = useState(false)
  const [pdfDocument, setPdfDocument] = useState<jsPDF | null>(null)
  const { toast } = useToast()

  /**
   * Handles export based on selected format
   */
  const handleExport = async (format: ExportFormat) => {
    try {
      setExporting(true)
      setExportingFormat(format)

      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300))

      switch (format) {
        case 'excel':
          await exportToExcel(data, filename)
          toast({
            title: '¡Exportación exitosa!',
            description: `El reporte ha sido exportado en formato Excel.`,
          })
          break
        case 'pdf':
          // Generate PDF and show preview instead of direct download
          const doc = await generatePDFDocument(data)
          setPdfDocument(doc)
          setShowPDFPreview(true)
          // Don't show success toast here - it will show after download from preview
          break
        default:
          throw new Error('Formato de exportación no válido')
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        variant: 'destructive',
        title: 'Error al exportar',
        description: 'No se pudo exportar el reporte. Por favor intenta nuevamente.',
      })
    } finally {
      setExporting(false)
      setExportingFormat(null)
    }
  }

  /**
   * Handles PDF download from preview modal
   */
  const handlePDFDownload = () => {
    if (!pdfDocument) return

    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd', { locale: es })
      const defaultFilename = `reporte-gerencial-${data.business.name
        .toLowerCase()
        .replace(/\s+/g, '-')}-${timestamp}.pdf`

      pdfDocument.save(filename || defaultFilename)

      toast({
        title: '¡Descarga exitosa!',
        description: 'El reporte PDF ha sido descargado correctamente.',
      })
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast({
        variant: 'destructive',
        title: 'Error al descargar',
        description: 'No se pudo descargar el PDF. Por favor intenta nuevamente.',
      })
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={`transition-all duration-300 hover:scale-105 hover:shadow-md ${className}`}
            disabled={disabled || exporting}
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {exportingFormat === 'pdf' ? 'Generando PDF...' : 'Exportando...'}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56 animate-in slide-in-from-top-2 duration-200"
        >
          <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase">
            Formato de Exportación
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Excel Option */}
          <DropdownMenuItem
            onClick={() => handleExport('excel')}
            disabled={exporting}
            className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 mr-3 text-green-600" />
            <div className="flex-1">
              <p className="font-medium">Excel</p>
              <p className="text-xs text-gray-500">Reporte completo con formato profesional</p>
            </div>
            {exportingFormat === 'excel' && (
              <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
            )}
          </DropdownMenuItem>

          {/* PDF Option with Preview */}
          <DropdownMenuItem
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors"
          >
            <FileBarChart className="w-4 h-4 mr-3 text-red-600" />
            <div className="flex-1">
              <p className="font-medium">PDF Gerencial</p>
              <p className="text-xs text-gray-500">Vista previa antes de descargar</p>
            </div>
            {exportingFormat === 'pdf' && (
              <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <div className="px-2 py-1.5 text-xs text-gray-400 text-center">
            Excel descarga directo • PDF con previsualización
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => {
          setShowPDFPreview(false)
          setPdfDocument(null)
        }}
        pdfDocument={pdfDocument}
        filename={filename || `reporte-${data.business.name}`}
        onDownload={handlePDFDownload}
        title="Previsualización del Reporte Gerencial"
      />
    </>
  )
}
