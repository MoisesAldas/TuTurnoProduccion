'use client'

import { AnalyticsExportData, ExportFormat } from '@/lib/export/types'
import { exportToExcel } from '@/lib/export/exportToExcel'
import { generatePDFDocument } from '@/lib/export/exportToPDF'
import { ExportDropdown, ExportFormat as UniversalExportFormat } from '@/components/ui/ExportDropdown'
import jsPDF from 'jspdf'

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
  const handleExport = async (format: UniversalExportFormat): Promise<void | jsPDF> => {
    switch (format) {
      case 'excel':
        await exportToExcel(data, filename)
        break
      case 'pdf':
        return await generatePDFDocument(data)
      default:
        throw new Error('Formato de exportación no válido')
    }
  }

  const defaultFilename = filename || `reporte-${data.business.name.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <ExportDropdown
      onExport={handleExport}
      filename={defaultFilename}
      pdfTitle="Previsualización del Reporte Gerencial"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
    />
  )
}
