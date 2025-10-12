/**
 * Excel Export Utility
 * Converts analytics data to Excel format with multiple sheets and professional styling
 * Uses ExcelJS for rich formatting with orange/amber theme
 */

import ExcelJS from 'exceljs'
import { AnalyticsExportData } from './types'

/**
 * Applies professional B2B SaaS styling to a worksheet
 */
const applyWorksheetStyles = (
  worksheet: ExcelJS.Worksheet,
  title: string,
  headerRow: number,
  dataStartRow: number,
  columnCount: number
) => {
  // Title styling
  worksheet.mergeCells(1, 1, 1, columnCount)
  const titleCell = worksheet.getCell(1, 1)
  titleCell.value = title
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEA580C' } // orange-600
  }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getRow(1).height = 25

  // Header row styling
  const headerRowObj = worksheet.getRow(headerRow)
  headerRowObj.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEA580C' } // orange-600
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD97706' } },
      bottom: { style: 'thin', color: { argb: 'FFD97706' } },
      left: { style: 'thin', color: { argb: 'FFD97706' } },
      right: { style: 'thin', color: { argb: 'FFD97706' } }
    }
  })
  headerRowObj.height = 20

  // Alternate row colors for data
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber >= dataStartRow) {
      const isEven = (rowNumber - dataStartRow) % 2 === 0
      const fillColor = isEven ? 'FFFFFBEB' : 'FFFFFFFF' // amber-50 : white
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        }
        cell.alignment = { vertical: 'middle' }
      })
    }
  })
}

/**
 * Main export function - generates and downloads Excel file with multiple styled sheets
 */
export const exportToExcel = async (data: AnalyticsExportData, filename?: string): Promise<void> => {
  const timestamp = new Date().toISOString().split('T')[0]
  const defaultFilename = `analytics-report-${timestamp}.xlsx`

  const workbook = new ExcelJS.Workbook()

  // ==================================================================
  // SHEET 1: Summary (Resumen)
  // ==================================================================
  const summarySheet = workbook.addWorksheet('Resumen')

  // Title
  summarySheet.mergeCells('A1:B1')
  const titleCell = summarySheet.getCell('A1')
  titleCell.value = 'REPORTE DE ANALYTICS'
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEA580C' }
  }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  summarySheet.getRow(1).height = 25

  // Metadata
  summarySheet.mergeCells('A3:B3')
  summarySheet.getCell('A3').value = `Negocio: ${data.businessName}`
  summarySheet.getCell('A3').font = { bold: true, size: 11, color: { argb: 'FF78350F' } }
  summarySheet.getCell('A3').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFBBF24' }
  }

  summarySheet.mergeCells('A4:B4')
  summarySheet.getCell('A4').value = `Período: ${data.reportPeriod}`
  summarySheet.getCell('A4').font = { bold: true, size: 11, color: { argb: 'FF78350F' } }
  summarySheet.getCell('A4').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFBBF24' }
  }

  summarySheet.mergeCells('A5:B5')
  summarySheet.getCell('A5').value = `Generado: ${data.generatedDate}`
  summarySheet.getCell('A5').font = { bold: true, size: 11, color: { argb: 'FF78350F' } }
  summarySheet.getCell('A5').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFBBF24' }
  }

  // Metrics header
  summarySheet.mergeCells('A7:B7')
  summarySheet.getCell('A7').value = 'MÉTRICAS PRINCIPALES'
  summarySheet.getCell('A7').font = { bold: true, size: 12 }
  summarySheet.getRow(7).height = 20

  // Metrics table
  const metricsHeaderRow = summarySheet.getRow(8)
  metricsHeaderRow.values = ['Métrica', 'Valor']
  metricsHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  const metrics = [
    ['Ingresos Totales', `$${data.summary.totalRevenue.toFixed(2)}`],
    ['Total Citas', data.summary.totalAppointments],
    ['Citas Completadas', data.summary.completedAppointments],
    ['Citas Canceladas', data.summary.cancelledAppointments],
    ['Ticket Promedio', `$${data.summary.averageTicket.toFixed(2)}`],
    ['Clientes Únicos', data.summary.uniqueClients],
    ['Tasa de Finalización', data.summary.completionRate]
  ]

  metrics.forEach((metric, index) => {
    const row = summarySheet.getRow(9 + index)
    row.values = metric
    const isEven = index % 2 === 0
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFBEB' : 'FFFFFFFF' }
      }
    })
  })

  summarySheet.columns = [
    { width: 25 },
    { width: 20 }
  ]

  // ==================================================================
  // SHEET 2: Daily Revenue (Ingresos Diarios)
  // ==================================================================
  if (data.dailyRevenue.length > 0) {
    const revenueSheet = workbook.addWorksheet('Ingresos Diarios')

    // Headers
    revenueSheet.getRow(1).values = ['INGRESOS DIARIOS']
    revenueSheet.getRow(3).values = ['Fecha', 'Ingresos', 'Citas']

    // Data
    data.dailyRevenue.forEach((d, index) => {
      revenueSheet.getRow(4 + index).values = [
        d.date,
        Number(d.revenue),
        d.appointments_count
      ]
    })

    // Apply currency format to Ingresos column
    for (let i = 4; i < 4 + data.dailyRevenue.length; i++) {
      revenueSheet.getCell(i, 2).numFmt = '"$"#,##0.00'
    }

    revenueSheet.columns = [
      { width: 15 },
      { width: 15 },
      { width: 12 }
    ]

    applyWorksheetStyles(revenueSheet, 'INGRESOS DIARIOS', 3, 4, 3)
  }

  // ==================================================================
  // SHEET 3: Employee Performance (Empleados)
  // ==================================================================
  if (data.employees.length > 0) {
    const employeeSheet = workbook.addWorksheet('Empleados')

    employeeSheet.getRow(1).values = ['PERFORMANCE DE EMPLEADOS']
    employeeSheet.getRow(3).values = [
      'Empleado',
      'Total Citas',
      'Completadas',
      'Ingresos',
      'Ticket Promedio',
      'Tasa Finalización'
    ]

    data.employees.forEach((e, index) => {
      employeeSheet.getRow(4 + index).values = [
        e.employee_name,
        e.total_appointments,
        e.completed_appointments,
        Number(e.total_revenue),
        Number(e.average_ticket),
        `${e.completion_rate.toFixed(1)}%`
      ]
    })

    // Apply currency format
    for (let i = 4; i < 4 + data.employees.length; i++) {
      employeeSheet.getCell(i, 4).numFmt = '"$"#,##0.00'
      employeeSheet.getCell(i, 5).numFmt = '"$"#,##0.00'
    }

    employeeSheet.columns = [
      { width: 25 },
      { width: 12 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 18 }
    ]

    applyWorksheetStyles(employeeSheet, 'PERFORMANCE DE EMPLEADOS', 3, 4, 6)
  }

  // ==================================================================
  // SHEET 4: Top Services (Servicios)
  // ==================================================================
  if (data.services.length > 0) {
    const servicesSheet = workbook.addWorksheet('Servicios')

    servicesSheet.getRow(1).values = ['SERVICIOS MÁS VENDIDOS']
    servicesSheet.getRow(3).values = [
      'Servicio',
      'Veces Vendido',
      'Ingresos',
      'Precio Promedio'
    ]

    data.services.forEach((s, index) => {
      servicesSheet.getRow(4 + index).values = [
        s.service_name,
        s.times_sold,
        Number(s.total_revenue),
        Number(s.average_price)
      ]
    })

    // Apply currency format
    for (let i = 4; i < 4 + data.services.length; i++) {
      servicesSheet.getCell(i, 3).numFmt = '"$"#,##0.00'
      servicesSheet.getCell(i, 4).numFmt = '"$"#,##0.00'
    }

    servicesSheet.columns = [
      { width: 30 },
      { width: 15 },
      { width: 15 },
      { width: 18 }
    ]

    applyWorksheetStyles(servicesSheet, 'SERVICIOS MÁS VENDIDOS', 3, 4, 4)
  }

  // ==================================================================
  // SHEET 5: Payment Methods (Métodos de Pago)
  // ==================================================================
  if (data.payments.length > 0) {
    const paymentsSheet = workbook.addWorksheet('Métodos de Pago')

    paymentsSheet.getRow(1).values = ['MÉTODOS DE PAGO']
    paymentsSheet.getRow(3).values = [
      'Método',
      'Monto Total',
      'Transacciones',
      'Porcentaje'
    ]

    data.payments.forEach((p, index) => {
      paymentsSheet.getRow(4 + index).values = [
        p.payment_method === 'cash' ? 'Efectivo' : 'Transferencia',
        Number(p.total_amount),
        p.transaction_count,
        `${p.percentage.toFixed(1)}%`
      ]
    })

    // Apply currency format
    for (let i = 4; i < 4 + data.payments.length; i++) {
      paymentsSheet.getCell(i, 2).numFmt = '"$"#,##0.00'
    }

    paymentsSheet.columns = [
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ]

    applyWorksheetStyles(paymentsSheet, 'MÉTODOS DE PAGO', 3, 4, 4)
  }

  // ==================================================================
  // EXPORT FILE
  // ==================================================================
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || defaultFilename
  a.click()
  URL.revokeObjectURL(url)
}
