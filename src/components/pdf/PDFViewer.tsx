/**
 * PDFViewer Component
 * Renders PDF using browser's native PDF viewer in iframe
 */

'use client'

import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import { pdfToBlobURL, revokeBlobURL } from '@/lib/export/utils/pdfPreview'
import { cn } from '@/lib/utils'

interface PDFViewerProps {
  pdfDocument: jsPDF
  currentPage?: number
  zoom?: number
  className?: string
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfDocument,
  className,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('')

  // Generate blob URL from PDF document
  useEffect(() => {
    if (!pdfDocument) return

    const url = pdfToBlobURL(pdfDocument)
    setBlobUrl(url)

    // Cleanup on unmount
    return () => {
      if (url) revokeBlobURL(url)
    }
  }, [pdfDocument])

  if (!blobUrl) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <p className="text-gray-500 dark:text-gray-400">Cargando PDF...</p>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-center w-full h-full', className)}>
      <iframe
        src={blobUrl}
        className="w-full h-full border-0"
        title="PDF Preview"
        aria-label="PDF preview"
      />
    </div>
  )
}
