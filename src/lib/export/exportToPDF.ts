/**
 * PDF Export Utility
 * Generates professional PDF reports with tables and styling
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { AnalyticsExportData } from './types'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable
  }
}

/**
 * Formats currency for display
 */
const formatCurrency = (value: number): string => {
  return `$${value.toFixed(2)}`
}

/**
 * Adds header to each page
 */
const addHeader = (
  doc: jsPDF,
  businessName: string,
  reportPeriod: string,
  pageNumber: number
): void => {
  const pageWidth = doc.internal.pageSize.width

  // Orange gradient background for header
  doc.setFillColor(234, 88, 12) // Orange-600
  doc.rect(0, 0, pageWidth, 35, 'F')

  // Business name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(businessName, 14, 15)

  // Report title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Reporte de Analytics', 14, 25)

  // Period
  doc.setFontSize(10)
  doc.text(reportPeriod, pageWidth - 14, 15, { align: 'right' })

  // Page number
  doc.text(`Página ${pageNumber}`, pageWidth - 14, 25, { align: 'right' })

  // Reset text color
  doc.setTextColor(0, 0, 0)
}

/**
 * Adds footer to page
 */
const addFooter = (doc: jsPDF, generatedDate: string): void => {
  const pageHeight = doc.internal.pageSize.height
  const pageWidth = doc.internal.pageSize.width

  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(`Generado: ${generatedDate}`, 14, pageHeight - 10)
  doc.text('TuTurno - Sistema de Gestión', pageWidth - 14, pageHeight - 10, { align: 'right' })
}

/**
 * Adds section title
 */
const addSectionTitle = (doc: jsPDF, title: string, yPosition: number): number => {
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(234, 88, 12) // Orange-600
  doc.text(title, 14, yPosition)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')

  return yPosition + 8
}

/**
 * Main export function - generates and downloads PDF
 */
export const exportToPDF = (data: AnalyticsExportData, filename?: string): void => {
  const timestamp = new Date().toISOString().split('T')[0]
  const defaultFilename = `analytics-report-${timestamp}.pdf`

  // Create PDF document (A4 size)
  const doc = new jsPDF('portrait', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.width
  let yPosition = 45 // Start below header

  // ==================================================================
  // PAGE 1: Header and Summary
  // ==================================================================
  addHeader(doc, data.businessName, data.reportPeriod, 1)

  // Summary KPIs Section
  yPosition = addSectionTitle(doc, 'Resumen de Métricas', yPosition)

  // Create summary table
  autoTable(doc, {
    startY: yPosition,
    head: [['Métrica', 'Valor']],
    body: [
      ['Ingresos Totales', formatCurrency(data.summary.totalRevenue)],
      ['Total de Citas', String(data.summary.totalAppointments)],
      ['Citas Completadas', String(data.summary.completedAppointments)],
      ['Citas Canceladas', String(data.summary.cancelledAppointments)],
      ['Ticket Promedio', formatCurrency(data.summary.averageTicket)],
      ['Clientes Únicos', String(data.summary.uniqueClients)],
      ['Tasa de Finalización', data.summary.completionRate],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [234, 88, 12], // Orange-600
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 11
    },
    bodyStyles: {
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  })

  yPosition = (doc as any).lastAutoTable.finalY + 15

  // ==================================================================
  // Daily Revenue Section
  // ==================================================================
  if (data.dailyRevenue.length > 0) {
    // Check if we need a new page
    if (yPosition > 230) {
      doc.addPage()
      yPosition = 45
      addHeader(doc, data.businessName, data.reportPeriod, 2)
    }

    yPosition = addSectionTitle(doc, 'Ingresos Diarios', yPosition)

    autoTable(doc, {
      startY: yPosition,
      head: [['Fecha', 'Ingresos', 'Citas']],
      body: data.dailyRevenue.map(d => [
        d.date,
        formatCurrency(d.revenue),
        String(d.appointments_count)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [234, 88, 12],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 60, halign: 'right' },
        2: { cellWidth: 'auto', halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // ==================================================================
  // Employee Performance Section
  // ==================================================================
  if (data.employees.length > 0) {
    // Check if we need a new page
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 45
      addHeader(doc, data.businessName, data.reportPeriod, doc.internal.pages.length - 1)
    }

    yPosition = addSectionTitle(doc, 'Performance de Empleados', yPosition)

    autoTable(doc, {
      startY: yPosition,
      head: [['Empleado', 'Citas', 'Compl.', 'Ingresos', 'Tasa']],
      body: data.employees.slice(0, 10).map(e => [
        e.employee_name,
        String(e.total_appointments),
        String(e.completed_appointments),
        formatCurrency(e.total_revenue),
        `${e.completion_rate.toFixed(1)}%`
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [234, 88, 12],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 40, halign: 'right' },
        4: { cellWidth: 'auto', halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // ==================================================================
  // Top Services Section
  // ==================================================================
  if (data.services.length > 0) {
    // Check if we need a new page
    if (yPosition > 200) {
      doc.addPage()
      yPosition = 45
      addHeader(doc, data.businessName, data.reportPeriod, doc.internal.pages.length - 1)
    }

    yPosition = addSectionTitle(doc, 'Servicios Más Vendidos', yPosition)

    autoTable(doc, {
      startY: yPosition,
      head: [['Servicio', 'Veces', 'Ingresos', 'Precio Prom.']],
      body: data.services.slice(0, 10).map(s => [
        s.service_name,
        String(s.times_sold),
        formatCurrency(s.total_revenue),
        formatCurrency(s.average_price)
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [234, 88, 12],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 'auto', halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // ==================================================================
  // Payment Methods Section
  // ==================================================================
  if (data.payments.length > 0) {
    // Check if we need a new page
    if (yPosition > 230) {
      doc.addPage()
      yPosition = 45
      addHeader(doc, data.businessName, data.reportPeriod, doc.internal.pages.length - 1)
    }

    yPosition = addSectionTitle(doc, 'Métodos de Pago', yPosition)

    autoTable(doc, {
      startY: yPosition,
      head: [['Método', 'Monto Total', 'Transacciones', 'Porcentaje']],
      body: data.payments.map(p => [
        p.payment_method === 'cash' ? 'Efectivo' : 'Transferencia',
        formatCurrency(p.total_amount),
        String(p.transaction_count),
        `${p.percentage.toFixed(1)}%`
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [234, 88, 12],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 45, halign: 'right' },
        2: { cellWidth: 45, halign: 'center' },
        3: { cellWidth: 'auto', halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    })
  }

  // Add footer to all pages
  const pageCount = doc.internal.pages.length - 1
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    addFooter(doc, data.generatedDate)
  }

  // Save the PDF
  doc.save(filename || defaultFilename)
}
