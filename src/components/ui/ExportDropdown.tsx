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
import { PDFPreviewModal } from '@/components/pdf'
import jsPDF from 'jspdf'
import { cn } from '@/lib/utils'

export type ExportFormat = 'excel' | 'pdf'

interface ExportDropdownProps {
  onExport: (format: ExportFormat) => Promise<void | jsPDF>
  filename?: string
  pdfTitle?: string
  triggerLabel?: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  disabled?: boolean
  options?: ExportFormat[]
}

/**
 * Universal Export Dropdown Component
 * Provides a premium, consistent interface for exporting data.
 */
export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  onExport,
  filename = 'reporte',
  pdfTitle = 'Previsualización del Reporte',
  triggerLabel = 'Exportar',
  variant = 'outline',
  size = 'default',
  className,
  disabled = false,
  options = ['excel', 'pdf'],
}) => {
  const [exporting, setExporting] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null)
  const [showPDFPreview, setShowPDFPreview] = useState(false)
  const [pdfDocument, setPdfDocument] = useState<jsPDF | null>(null)
  const { toast } = useToast()

  const handleExport = async (format: ExportFormat) => {
    try {
      setExporting(true)
      setExportingFormat(format)

      const result = await onExport(format)

      if (format === 'pdf') {
        const isPdfDoc = result && (
          result instanceof jsPDF || 
          (typeof result === 'object' && 'internal' in result && 'output' in result)
        )

        if (isPdfDoc) {
          setPdfDocument(result as jsPDF)
          setShowPDFPreview(true)
        } else {
          console.error('PDF result is not a valid jsPDF instance:', result)
        }
      } else if (format === 'excel') {
        toast({
          title: '¡Exportación exitosa!',
          description: 'El reporte ha sido generado y descargado.',
        })
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        variant: 'destructive',
        title: 'Error al exportar',
        description: 'No se pudo generar el reporte. Por favor intenta nuevamente.',
      })
    } finally {
      setExporting(false)
      setExportingFormat(null)
    }
  }

  const handlePDFDownload = () => {
    if (!pdfDocument) return
    try {
      pdfDocument.save(`${filename}.pdf`)
      toast({
        title: '¡Descarga exitosa!',
        description: 'El reporte PDF ha sido descargado correctamente.',
      })
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast({
        variant: 'destructive',
        title: 'Error al descargar',
        description: 'No se pudo descargar el PDF.',
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
            disabled={disabled || exporting}
            className={cn(
              'transition-all duration-300 rounded-2xl h-10 px-6 font-bold text-xs flex items-center gap-2 group',
              className
            )}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-orange-600 transition-transform group-hover:scale-110" />
            )}
            <span>{exporting ? 'Generando...' : triggerLabel}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-64 p-2 rounded-[1.5rem] border-0 shadow-[0_10px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-top-2 duration-200"
        >
          <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Formato de Salida
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 bg-gray-50 dark:bg-gray-800" />

          {options.includes('excel') && (
            <DropdownMenuItem
              onClick={() => handleExport('excel')}
              className="rounded-xl p-3 cursor-pointer focus:bg-orange-50 focus:text-gray-900 dark:focus:bg-orange-900/20 dark:focus:text-white group transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-sm">Excel (XLSX)</p>
                  <p className="text-[10px] text-gray-500">Hoja de cálculo completa</p>
                </div>
              </div>
            </DropdownMenuItem>
          )}

          {options.includes('pdf') && (
            <DropdownMenuItem
              onClick={() => handleExport('pdf')}
              className="rounded-xl p-3 cursor-pointer focus:bg-orange-50 focus:text-gray-900 dark:focus:bg-orange-900/20 dark:focus:text-white group transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileBarChart className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-sm">PDF (Previsualizar)</p>
                  <p className="text-[10px] text-gray-500">Reporte con diseño profesional</p>
                </div>
              </div>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="my-1 bg-gray-50 dark:bg-gray-800" />
          <div className="px-3 py-1.5 text-[9px] text-gray-400 text-center uppercase tracking-tighter">
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
        filename={filename}
        onDownload={handlePDFDownload}
        title={pdfTitle}
      />
    </>
  )
}
