/**
 * ExportButton Component
 * Reusable button with dropdown for exporting analytics data
 * Supports CSV, Excel, and PDF formats
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
import { Download, FileText, FileSpreadsheet, FileBarChart, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AnalyticsExportData, ExportFormat } from '@/lib/export/types'
import { exportToCSV } from '@/lib/export/exportToCSV'
import { exportToExcel } from '@/lib/export/exportToExcel'
import { exportToPDF } from '@/lib/export/exportToPDF'

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
        case 'csv':
          exportToCSV(data, filename)
          break
        case 'excel':
          exportToExcel(data, filename)
          break
        case 'pdf':
          exportToPDF(data, filename)
          break
        default:
          throw new Error('Formato de exportación no válido')
      }

      toast({
        title: '¡Exportación exitosa!',
        description: `El reporte ha sido exportado en formato ${format.toUpperCase()}.`,
      })
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

  return (
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
              Exportando...
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

        {/* CSV Option */}
        <DropdownMenuItem
          onClick={() => handleExport('csv')}
          disabled={exporting}
          className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors"
        >
          <FileText className="w-4 h-4 mr-3 text-blue-600" />
          <div className="flex-1">
            <p className="font-medium">CSV</p>
            <p className="text-xs text-gray-500">Valores separados por comas</p>
          </div>
          {exportingFormat === 'csv' && (
            <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
          )}
        </DropdownMenuItem>

        {/* Excel Option */}
        <DropdownMenuItem
          onClick={() => handleExport('excel')}
          disabled={exporting}
          className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 mr-3 text-green-600" />
          <div className="flex-1">
            <p className="font-medium">Excel</p>
            <p className="text-xs text-gray-500">Hoja de cálculo con múltiples pestañas</p>
          </div>
          {exportingFormat === 'excel' && (
            <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
          )}
        </DropdownMenuItem>

        {/* PDF Option */}
        <DropdownMenuItem
          onClick={() => handleExport('pdf')}
          disabled={exporting}
          className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 transition-colors"
        >
          <FileBarChart className="w-4 h-4 mr-3 text-red-600" />
          <div className="flex-1">
            <p className="font-medium">PDF</p>
            <p className="text-xs text-gray-500">Reporte profesional con tablas</p>
          </div>
          {exportingFormat === 'pdf' && (
            <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5 text-xs text-gray-400 text-center">
          Los datos se descargarán automáticamente
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
