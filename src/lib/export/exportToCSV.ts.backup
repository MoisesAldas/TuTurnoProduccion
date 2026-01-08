/**
 * CSV Export Utility
 * Converts analytics data to CSV format and downloads it
 */

import { AnalyticsExportData } from './types'

/**
 * Escapes CSV values to handle commas, quotes, and newlines
 */
const escapeCSVValue = (value: any): string => {
  if (value === null || value === undefined) return ''

  const stringValue = String(value)

  // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Converts array of objects to CSV string
 */
const arrayToCSV = (data: any[], headers: string[]): string => {
  const headerRow = headers.map(escapeCSVValue).join(',')
  const dataRows = data.map(row =>
    headers.map(header => escapeCSVValue(row[header])).join(',')
  ).join('\n')

  return `${headerRow}\n${dataRows}`
}

/**
 * Triggers browser download of CSV file
 */
const downloadCSV = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Main export function - generates and downloads CSV file
 */
export const exportToCSV = (data: AnalyticsExportData, filename?: string): void => {
  const timestamp = new Date().toISOString().split('T')[0]
  const defaultFilename = `analytics-report-${timestamp}.csv`

  // Build CSV content with multiple sections
  let csvContent = ''

  // Header Section
  csvContent += `REPORTE DE ANALYTICS\n`
  csvContent += `Negocio:,${escapeCSVValue(data.businessName)}\n`
  csvContent += `Período:,${escapeCSVValue(data.reportPeriod)}\n`
  csvContent += `Generado:,${escapeCSVValue(data.generatedDate)}\n`
  csvContent += '\n'

  // Summary Section
  csvContent += 'RESUMEN DE MÉTRICAS\n'
  csvContent += `Métrica,Valor\n`
  csvContent += `Ingresos Totales,$${data.summary.totalRevenue.toFixed(2)}\n`
  csvContent += `Total Citas,${data.summary.totalAppointments}\n`
  csvContent += `Citas Completadas,${data.summary.completedAppointments}\n`
  csvContent += `Citas Canceladas,${data.summary.cancelledAppointments}\n`
  csvContent += `Ticket Promedio,$${data.summary.averageTicket.toFixed(2)}\n`
  csvContent += `Clientes Únicos,${data.summary.uniqueClients}\n`
  csvContent += `Tasa de Finalización,${data.summary.completionRate}\n`
  csvContent += '\n'

  // Daily Revenue Section
  if (data.dailyRevenue.length > 0) {
    csvContent += 'INGRESOS DIARIOS\n'
    csvContent += arrayToCSV(
      data.dailyRevenue.map(d => ({
        'Fecha': d.date,
        'Ingresos': `$${d.revenue.toFixed(2)}`,
        'Citas': d.appointments_count
      })),
      ['Fecha', 'Ingresos', 'Citas']
    )
    csvContent += '\n\n'
  }

  // Employee Performance Section
  if (data.employees.length > 0) {
    csvContent += 'PERFORMANCE DE EMPLEADOS\n'
    csvContent += arrayToCSV(
      data.employees.map(e => ({
        'Empleado': e.employee_name,
        'Total Citas': e.total_appointments,
        'Completadas': e.completed_appointments,
        'Ingresos': `$${e.total_revenue.toFixed(2)}`,
        'Ticket Promedio': `$${e.average_ticket.toFixed(2)}`,
        'Tasa Finalización': `${e.completion_rate.toFixed(1)}%`
      })),
      ['Empleado', 'Total Citas', 'Completadas', 'Ingresos', 'Ticket Promedio', 'Tasa Finalización']
    )
    csvContent += '\n\n'
  }

  // Top Services Section
  if (data.services.length > 0) {
    csvContent += 'SERVICIOS MÁS VENDIDOS\n'
    csvContent += arrayToCSV(
      data.services.map(s => ({
        'Servicio': s.service_name,
        'Veces Vendido': s.times_sold,
        'Ingresos': `$${s.total_revenue.toFixed(2)}`,
        'Precio Promedio': `$${s.average_price.toFixed(2)}`
      })),
      ['Servicio', 'Veces Vendido', 'Ingresos', 'Precio Promedio']
    )
    csvContent += '\n\n'
  }

  // Payment Methods Section
  if (data.payments.length > 0) {
    csvContent += 'MÉTODOS DE PAGO\n'
    csvContent += arrayToCSV(
      data.payments.map(p => ({
        'Método': p.payment_method === 'cash' ? 'Efectivo' : 'Transferencia',
        'Monto Total': `$${p.total_amount.toFixed(2)}`,
        'Transacciones': p.transaction_count,
        'Porcentaje': `${p.percentage.toFixed(1)}%`
      })),
      ['Método', 'Monto Total', 'Transacciones', 'Porcentaje']
    )
  }

  // Download the file
  downloadCSV(csvContent, filename || defaultFilename)
}
