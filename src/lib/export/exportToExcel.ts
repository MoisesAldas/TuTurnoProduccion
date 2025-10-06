/**
 * Excel Export Utility
 * Converts analytics data to Excel format with multiple sheets and styling
 */

import * as XLSX from 'xlsx'
import { AnalyticsExportData } from './types'

/**
 * Creates a formatted worksheet with header styling
 */
const createStyledWorksheet = (data: any[][], title: string): XLSX.WorkSheet => {
  const ws = XLSX.utils.aoa_to_sheet(data)

  // Set column widths for better readability
  const colWidths = data[0]?.map(() => ({ wch: 20 })) || []
  ws['!cols'] = colWidths

  return ws
}

/**
 * Formats currency values for Excel
 */
const formatCurrency = (value: number): string => {
  return `$${value.toFixed(2)}`
}

/**
 * Main export function - generates and downloads Excel file with multiple sheets
 */
export const exportToExcel = (data: AnalyticsExportData, filename?: string): void => {
  const timestamp = new Date().toISOString().split('T')[0]
  const defaultFilename = `analytics-report-${timestamp}.xlsx`

  // Create a new workbook
  const workbook = XLSX.utils.book_new()

  // ==================================================================
  // SHEET 1: Summary (Resumen)
  // ==================================================================
  const summaryData = [
    ['REPORTE DE ANALYTICS'],
    [''],
    ['Negocio:', data.businessName],
    ['Período:', data.reportPeriod],
    ['Generado:', data.generatedDate],
    [''],
    ['MÉTRICAS PRINCIPALES'],
    ['Métrica', 'Valor'],
    ['Ingresos Totales', formatCurrency(data.summary.totalRevenue)],
    ['Total Citas', data.summary.totalAppointments],
    ['Citas Completadas', data.summary.completedAppointments],
    ['Citas Canceladas', data.summary.cancelledAppointments],
    ['Ticket Promedio', formatCurrency(data.summary.averageTicket)],
    ['Clientes Únicos', data.summary.uniqueClients],
    ['Tasa de Finalización', data.summary.completionRate],
  ]
  const summarySheet = createStyledWorksheet(summaryData, 'Resumen')
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')

  // ==================================================================
  // SHEET 2: Daily Revenue (Ingresos Diarios)
  // ==================================================================
  if (data.dailyRevenue.length > 0) {
    const revenueData = [
      ['INGRESOS DIARIOS'],
      [''],
      ['Fecha', 'Ingresos', 'Citas'],
      ...data.dailyRevenue.map(d => [
        d.date,
        formatCurrency(d.revenue),
        d.appointments_count
      ])
    ]
    const revenueSheet = createStyledWorksheet(revenueData, 'Ingresos')
    XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Ingresos Diarios')
  }

  // ==================================================================
  // SHEET 3: Employee Performance (Empleados)
  // ==================================================================
  if (data.employees.length > 0) {
    const employeeData = [
      ['PERFORMANCE DE EMPLEADOS'],
      [''],
      ['Empleado', 'Total Citas', 'Completadas', 'Ingresos', 'Ticket Promedio', 'Tasa Finalización'],
      ...data.employees.map(e => [
        e.employee_name,
        e.total_appointments,
        e.completed_appointments,
        formatCurrency(e.total_revenue),
        formatCurrency(e.average_ticket),
        `${e.completion_rate.toFixed(1)}%`
      ])
    ]
    const employeeSheet = createStyledWorksheet(employeeData, 'Empleados')
    XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Empleados')
  }

  // ==================================================================
  // SHEET 4: Top Services (Servicios)
  // ==================================================================
  if (data.services.length > 0) {
    const servicesData = [
      ['SERVICIOS MÁS VENDIDOS'],
      [''],
      ['Servicio', 'Veces Vendido', 'Ingresos', 'Precio Promedio'],
      ...data.services.map(s => [
        s.service_name,
        s.times_sold,
        formatCurrency(s.total_revenue),
        formatCurrency(s.average_price)
      ])
    ]
    const servicesSheet = createStyledWorksheet(servicesData, 'Servicios')
    XLSX.utils.book_append_sheet(workbook, servicesSheet, 'Servicios')
  }

  // ==================================================================
  // SHEET 5: Payment Methods (Métodos de Pago)
  // ==================================================================
  if (data.payments.length > 0) {
    const paymentsData = [
      ['MÉTODOS DE PAGO'],
      [''],
      ['Método', 'Monto Total', 'Transacciones', 'Porcentaje'],
      ...data.payments.map(p => [
        p.payment_method === 'cash' ? 'Efectivo' : 'Transferencia',
        formatCurrency(p.total_amount),
        p.transaction_count,
        `${p.percentage.toFixed(1)}%`
      ])
    ]
    const paymentsSheet = createStyledWorksheet(paymentsData, 'Pagos')
    XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Métodos de Pago')
  }

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, filename || defaultFilename)
}
